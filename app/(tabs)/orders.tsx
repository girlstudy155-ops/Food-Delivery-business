// OrdersScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/contexts/ThemeContext";

// ---------------- STATUS BADGE ----------------
function StatusBadge({ status, theme }: { status: string; theme: any }) {
  const statusColor = theme.primary;
  return (
    <View
      style={[
        statusStyles.badge,
        { backgroundColor: statusColor + "20", borderColor: statusColor + "40" },
      ]}
    >
      <View style={[statusStyles.dot, { backgroundColor: statusColor }]} />
      <Text style={[statusStyles.text, { color: statusColor }]}>{status}</Text>
    </View>
  );
}

const statusStyles = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 11, fontWeight: "700" },
});

// ---------------- ORDER CARD ----------------
function OrderCard({ order, theme }: { order: any; theme: any }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(order.created_at || Date.now()).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  return (
    <Pressable
      style={[orderStyles.card, { backgroundColor: theme.cardBackground, shadowColor: theme.shadow }]}
      onPress={() => setExpanded(!expanded)}
    >
      <View style={orderStyles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[orderStyles.orderId, { color: theme.text }]}>
            Order #{order.id || order.guest_order_id}
          </Text>
          <Text style={[orderStyles.orderDate, { color: theme.textSecondary }]}>{date}</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 6 }}>
          <StatusBadge status={order.status || "Pending"} theme={theme} />
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color={theme.textLight} />
        </View>
      </View>

      <View style={[orderStyles.divider, { backgroundColor: theme.textLight + "40" }]} />

      <View style={orderStyles.summary}>
        <View style={orderStyles.summaryRow}>
          <Ionicons name="bag-outline" size={14} color={theme.textSecondary} />
          <Text style={[orderStyles.summaryText, { color: theme.textSecondary }]}>
            {(order.items || []).length} item(s)
          </Text>
        </View>
        <Text style={[orderStyles.total, { color: theme.primary }]}>
          ${Number(order.total_amount || 0).toFixed(2)}
        </Text>
      </View>

      {expanded && (
        <View style={orderStyles.expandedContent}>
          <View style={[orderStyles.divider, { backgroundColor: theme.textLight + "40" }]} />
          <Text style={[orderStyles.sectionLabel, { color: theme.textSecondary }]}>Items</Text>
          {(order.items || []).map((item: any, i: number) => (
            <View key={i} style={orderStyles.itemRow}>
              <Text style={[orderStyles.itemName, { color: theme.text }]} numberOfLines={1}>
                {item.product_name || item.name}
              </Text>
              <Text style={[orderStyles.itemDetail, { color: theme.textSecondary }]}>
                {item.size} x {item.quantity}
              </Text>
              <Text style={[orderStyles.itemPrice, { color: theme.text }]}>
                ${(Number(item.price) * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}
          <View style={[orderStyles.divider, { backgroundColor: theme.textLight + "40" }]} />
          <View style={orderStyles.addressSection}>
            <Ionicons name="location-outline" size={14} color={theme.primary} />
            <Text style={[orderStyles.addressText, { color: theme.textSecondary }]} numberOfLines={2}>
              {order.customer?.address || order.address || "No address provided"}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

// ---------------- MAIN SCREEN ----------------
export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [guestOrders, setGuestOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  // Load guest orders from AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem("guest_orders_session").then((data) => {
      if (data) setGuestOrders(JSON.parse(data));
    });
  }, []);

  // Fetch user orders dynamically
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const userId = await AsyncStorage.getItem("user_id");
        if (!userId) {
          setUserOrders([]);
          return;
        }

        const res = await fetch(`https://food-delivery-business-production-00a9.up.railway.app/api/admin/orders`);
        const data = await res.json();
        setUserOrders(data);
      } catch (err) {
        console.log("Error fetching user orders:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // Merge guest + user orders
  const displayOrders = (() => {
    const map = new Map();
    guestOrders.forEach((order) => order.guest_order_id && map.set(`guest-${order.guest_order_id}`, order));
    userOrders.forEach((order) => order.id && map.set(`user-${order.id}`, order));
    return Array.from(map.values());
  })();

  const isEmpty = displayOrders.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient colors={["#FF4500", "#FF6B35"]} style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={styles.headerTitle}>Order History</Text>
        {guestOrders.length > 0 && (
          <View style={styles.guestBanner}>
            <Ionicons name="information-circle-outline" size={14} color="rgba(255,255,255,0.85)" />
            <Text style={styles.guestBannerText}>Guest orders cleared when app closes</Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: 48 }} />
          ) : isEmpty ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.textLight + "20" }]}>
                <Ionicons name="receipt-outline" size={56} color={theme.textLight} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No orders yet</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                Your orders will appear here
              </Text>
            </View>
          ) : (
            <View style={styles.ordersList}>
              {displayOrders.map((order, i) => (
                <OrderCard key={order.id || order.guest_order_id || i} order={order} theme={theme} />
              ))}
            </View>
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ---------------- STYLES ----------------
const orderStyles = StyleSheet.create({
  card: { borderRadius: 18, padding: 16, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 4 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  orderId: { fontSize: 15, fontWeight: "700" },
  orderDate: { fontSize: 12, marginTop: 2 },
  divider: { height: 1, marginVertical: 12 },
  summary: { flexDirection: "row", alignItems: "center", gap: 12 },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  summaryText: { fontSize: 12 },
  total: { marginLeft: "auto", fontSize: 16, fontWeight: "800" },
  expandedContent: {},
  sectionLabel: { fontSize: 12, fontWeight: "600", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  itemName: { flex: 1, fontSize: 13, fontWeight: "500" },
  itemDetail: { fontSize: 12 },
  itemPrice: { fontSize: 13, fontWeight: "700", minWidth: 50, textAlign: "right" },
  addressSection: { flexDirection: "row", gap: 6, alignItems: "flex-start" },
  addressText: { flex: 1, fontSize: 13 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 18 },
  headerTitle: { fontSize: 26, fontWeight: "800", color: "#FFF" },
  guestBanner: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  guestBannerText: { fontSize: 12, color: "rgba(255,255,255,0.85)" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 20 },
  ordersList: { gap: 12 },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyIcon: { width: 110, height: 110, borderRadius: 55, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  emptyTitle: { fontSize: 22, fontWeight: "700" },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20, paddingHorizontal: 24 },
});