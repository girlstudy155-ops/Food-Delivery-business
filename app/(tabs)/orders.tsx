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
import colors from "@/constants/colors";

// -------------------- STATUS BADGE --------------------
function StatusBadge({ status }: { status: string }) {
  const statusColor = colors.statusColors[status] || colors.textSecondary;
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
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 11, fontWeight: "700" },
});

// -------------------- ORDER CARD --------------------
function OrderCard({ order }: { order: any }) {
  const [expanded, setExpanded] = useState(false);

  const date = new Date(order.created_at || Date.now()).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Pressable style={orderStyles.card} onPress={() => setExpanded(!expanded)}>
      {/* Header */}
      <View style={orderStyles.header}>
        <View style={{ flex: 1 }}>
          <Text style={orderStyles.orderId}>Order #{order.id || order.guest_order_id}</Text>
          <Text style={orderStyles.orderDate}>{date}</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 6 }}>
          <StatusBadge status={order.status || "Pending"} />
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.textLight}
          />
        </View>
      </View>

      <View style={orderStyles.divider} />

      {/* Summary */}
      <View style={orderStyles.summary}>
        <View style={orderStyles.summaryRow}>
          <Ionicons name="bag-outline" size={14} color={colors.textSecondary} />
          <Text style={orderStyles.summaryText}>{(order.items || []).length} item(s)</Text>
        </View>
        <View style={orderStyles.summaryRow}>
          <Ionicons name="cash-outline" size={14} color={colors.textSecondary} />
          <Text style={orderStyles.summaryText}>Cash on Delivery</Text>
        </View>
        <Text style={orderStyles.total}>${Number(order.total_amount || 0).toFixed(2)}</Text>
      </View>

      {/* Expanded Details */}
      {expanded && (
        <View style={orderStyles.expandedContent}>
          <View style={orderStyles.divider} />
          <Text style={orderStyles.sectionLabel}>Items</Text>
          {(order.items || []).map((item: any, i: number) => (
            <View key={i} style={orderStyles.itemRow}>
              <Text style={orderStyles.itemName} numberOfLines={1}>
                {item.product_name || item.name}
              </Text>
              <Text style={orderStyles.itemDetail}>
                {item.size} x {item.quantity}
              </Text>
              <Text style={orderStyles.itemPrice}>
                ${(Number(item.price) * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}
          <View style={orderStyles.divider} />
          <View style={orderStyles.addressSection}>
            <Ionicons name="location-outline" size={14} color={colors.primary} />
            <Text style={orderStyles.addressText} numberOfLines={2}>
              {order.customer?.address || order.address || "No address provided"}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

// -------------------- MAIN ORDERS SCREEN --------------------
export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const [guestOrders, setGuestOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  // Load guest orders
  useEffect(() => {
    AsyncStorage.getItem("guest_orders_session").then((data) => {
      if (data) setGuestOrders(JSON.parse(data));
    });
  }, []);

  // Fetch user orders
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const res = await fetch("http://10.81.83.70:5000/api/orders/user");
        if (!res.ok) throw new Error("Failed to fetch orders");
        const data = await res.json();
        setOrders(data);
      } catch (err) {
        console.log("Fetch error:", err);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  // Merge guest + user orders, remove duplicates
  const displayOrders = (() => {
    const map = new Map();
    guestOrders.forEach((order) => order.guest_order_id && map.set(`guest-${order.guest_order_id}`, order));
    orders.forEach((order) => order.id && map.set(`user-${order.id}`, order));
    return Array.from(map.values());
  })();

  const isEmpty = displayOrders.length === 0;

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#FF4500", "#FF6B35"]} style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={styles.headerTitle}>Order History</Text>
        {guestOrders.length > 0 && (
          <View style={styles.guestBanner}>
            <Ionicons name="information-circle-outline" size={14} color="rgba(255,255,255,0.85)" />
            <Text style={styles.guestBannerText}>Orders cleared when app closes</Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
          ) : isEmpty ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="receipt-outline" size={56} color={colors.textLight} />
              </View>
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptySubtitle}>Your orders will appear here</Text>
            </View>
          ) : (
            <View style={styles.ordersList}>
              {displayOrders.map((order, index) => {
                const key = order.id ? `user-${order.id}` : order.guest_order_id ? `guest-${order.guest_order_id}` : `unknown-${index}`;
                return <OrderCard key={key} order={order} />;
              })}
            </View>
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// -------------------- STYLES --------------------
const orderStyles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 4,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  orderId: { fontSize: 15, fontWeight: "700", color: colors.text },
  orderDate: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.borderLight, marginVertical: 12 },
  summary: { flexDirection: "row", alignItems: "center", gap: 12 },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  summaryText: { fontSize: 12, color: colors.textSecondary },
  total: { marginLeft: "auto", fontSize: 16, fontWeight: "800", color: colors.primary },
  expandedContent: {},
  sectionLabel: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  itemName: { flex: 1, fontSize: 13, color: colors.text, fontWeight: "500" },
  itemDetail: { fontSize: 12, color: colors.textSecondary },
  itemPrice: { fontSize: 13, fontWeight: "700", color: colors.text, minWidth: 50, textAlign: "right" },
  addressSection: { flexDirection: "row", gap: 6, alignItems: "flex-start" },
  addressText: { flex: 1, fontSize: 13, color: colors.textSecondary },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 18 },
  headerTitle: { fontSize: 26, fontWeight: "800", color: "#FFF" },
  guestBanner: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  guestBannerText: { fontSize: 12, color: "rgba(255,255,255,0.85)" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 20 },
  ordersList: { gap: 12 },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyIcon: { width: 110, height: 110, borderRadius: 55, backgroundColor: colors.borderLight, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  emptyTitle: { fontSize: 22, fontWeight: "700", color: colors.text },
  emptySubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 20, paddingHorizontal: 24 },
});