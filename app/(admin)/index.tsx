import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import colors from "@/constants/colors";
import { useAuth } from "@/contexts/auth";
import { useCart } from "@/contexts/cart";

async function fetchDashboard(token: string) {
  const res = await fetch("https://food-delivery-business-production-00a9.up.railway.app/api/admin/dashboard", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch dashboard");
  return res.json();
}

function StatCard({
  icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: string;
  label: string;
  value: string | number;
  color: string;
  bgColor: string;
}) {
  return (
    <View style={[statStyles.card, { borderLeftColor: color }]}>
      <View style={[statStyles.iconContainer, { backgroundColor: bgColor }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    gap: 6,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  value: { fontSize: 24, fontWeight: "800", color: colors.text },
  label: { fontSize: 12, color: colors.textSecondary, fontWeight: "500" },
});

const ADMIN_MENU = [
  { title: "Orders", subtitle: "Manage all orders", icon: "receipt", color: "#3B82F6", route: "/(admin)/orders" },
  { title: "Products", subtitle: "Add/edit/delete products", icon: "fast-food", color: "#F59E0B", route: "/(admin)/products" },
  { title: "Categories", subtitle: "Manage categories", icon: "grid", color: "#8B5CF6", route: "/(admin)/categories" },
  { title: "Users", subtitle: "Manage registered users", icon: "people", color: "#10B981", route: "/(admin)/users" },
  { title: "Coupons", subtitle: "Manage discount codes", icon: "pricetag", color: "#EF4444", route: "/(admin)/coupons" },
];

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const { token, logout } = useAuth();
  const { clearCart } = useCart();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-dashboard", token],
    queryFn: () => fetchDashboard(token!),
    enabled: !!token,
  });

  const handleLogout = () => {
    Alert.alert("Logout", "Sign out of admin?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          clearCart();
          await logout();
          router.replace("/(auth)");
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#1E293B", "#334155"]}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.adminLabel}>Admin Panel</Text>
            <Text style={styles.headerTitle}>FoodRush Admin</Text>
          </View>
          <Pressable style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="rgba(255,255,255,0.8)" />
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Overview</Text>
          {isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <View style={styles.statsGrid}>
              <View style={styles.statsRow}>
                <StatCard
                  icon="people"
                  label="Total Users"
                  value={stats?.total_users || 0}
                  color="#10B981"
                  bgColor="#ECFDF5"
                />
                <StatCard
                  icon="receipt"
                  label="Total Orders"
                  value={stats?.total_orders || 0}
                  color="#3B82F6"
                  bgColor="#EFF6FF"
                />
              </View>
              <View style={styles.statsRow}>
                <StatCard
                  icon="cash"
                  label="Revenue"
                  value={`$${(stats?.total_revenue || 0).toFixed(2)}`}
                  color="#FF4500"
                  bgColor="#FFF0EB"
                />
                <StatCard
                  icon="time"
                  label="Pending Orders"
                  value={stats?.pending_orders || 0}
                  color="#F59E0B"
                  bgColor="#FFFBEB"
                />
              </View>
            </View>
          )}
        </View>

        {/* Menu */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Management</Text>
          <View style={styles.menuGrid}>
            {ADMIN_MENU.map((item) => (
              <Pressable
                key={item.route}
                style={styles.menuCard}
                onPress={() => router.push(item.route as any)}
              >
                <View style={[styles.menuIcon, { backgroundColor: item.color + "15" }]}>
                  <Ionicons name={item.icon as any} size={28} color={item.color} />
                </View>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textLight} style={styles.menuArrow} />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  adminLabel: { fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: "500", textTransform: "uppercase", letterSpacing: 1 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#FFF" },
  logoutBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center",
  },
  scroll: { flex: 1 },
  statsSection: { padding: 20, gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  statsGrid: { gap: 10 },
  statsRow: { flexDirection: "row", gap: 10 },
  menuSection: { paddingHorizontal: 20, gap: 12, paddingBottom: 16 },
  menuGrid: { gap: 10 },
  menuCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    position: "relative",
  },
  menuIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  menuTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  menuSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  menuArrow: { position: "absolute", right: 16, top: 16 },
});