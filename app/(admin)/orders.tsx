import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { fetch } from "expo/fetch";
import colors from "@/constants/colors";
import { useAuth } from "@/contexts/auth";
import { getApiUrl } from "@/lib/query-client";

const ORDER_STATUSES = ["Pending", "Confirmed", "Preparing", "Out for Delivery", "Delivered"];

async function fetchAdminOrders(token: string) {
  const base = getApiUrl();
  const res = await fetch(`${base}api/admin/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

async function updateOrderStatus(token: string, orderId: number, status: string) {
  const base = getApiUrl();
  const res = await fetch(`${base}api/admin/orders/${orderId}/status`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

function StatusPill({ status }: { status: string }) {
  const c = colors.statusColors[status] || "#6B7280";
  return (
    <View style={[pillStyles.pill, { backgroundColor: c + "20", borderColor: c + "40" }]}>
      <View style={[pillStyles.dot, { backgroundColor: c }]} />
      <Text style={[pillStyles.text, { color: c }]}>{status}</Text>
    </View>
  );
}
const pillStyles = StyleSheet.create({
  pill: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 11, fontWeight: "700" },
});

export default function AdminOrdersScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [statusModal, setStatusModal] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: orders = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-orders", token],
    queryFn: () => fetchAdminOrders(token!),
    enabled: !!token,
  });

  const mutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: string }) =>
      updateOrderStatus(token!, orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      setStatusModal(false);
    },
    onError: () => Alert.alert("Error", "Failed to update status"),
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#1E293B", "#334155"]}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Orders</Text>
        <Text style={styles.orderCount}>{orders.length} total</Text>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
        ) : orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color={colors.textLight} />
            <Text style={styles.emptyText}>No orders yet</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {orders.map((order: any) => (
              <Pressable
                key={order.id}
                style={styles.orderCard}
                onPress={() => { setSelectedOrder(order); setStatusModal(true); }}
              >
                <View style={styles.orderHeader}>
                  <View>
                    <Text style={styles.orderId}>Order #{order.id}</Text>
                    <Text style={styles.orderType}>
                      {order.user_id ? "Registered User" : `Guest: ${order.guest_id || "—"}`}
                    </Text>
                  </View>
                  <StatusPill status={order.status} />
                </View>

                <View style={styles.orderInfo}>
                  <View style={styles.infoRow}>
                    <Ionicons name="person-outline" size={13} color={colors.textSecondary} />
                    <Text style={styles.infoText}>{order.name}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="call-outline" size={13} color={colors.textSecondary} />
                    <Text style={styles.infoText}>{order.phone}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
                    <Text style={styles.infoText} numberOfLines={1}>{order.address}</Text>
                  </View>
                </View>

                <View style={styles.orderFooter}>
                  <Text style={styles.itemCount}>{(order.items || []).length} items</Text>
                  <Text style={styles.orderTotal}>${parseFloat(order.total_amount).toFixed(2)}</Text>
                  <Text style={styles.tapHint}>Tap to change status</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Status Modal */}
      <Modal visible={statusModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setStatusModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Update Order Status</Text>
            {selectedOrder && (
              <Text style={styles.modalSubtitle}>Order #{selectedOrder.id} — {selectedOrder.name}</Text>
            )}
            <View style={styles.statusList}>
              {ORDER_STATUSES.map((status) => {
                const isSelected = selectedOrder?.status === status;
                const c = colors.statusColors[status] || "#6B7280";
                return (
                  <Pressable
                    key={status}
                    style={[styles.statusOption, isSelected && { backgroundColor: c + "15", borderColor: c }]}
                    onPress={() => mutation.mutate({ orderId: selectedOrder.id, status })}
                    disabled={mutation.isPending}
                  >
                    <View style={[styles.statusDot, { backgroundColor: c }]} />
                    <Text style={[styles.statusOptionText, isSelected && { color: c, fontWeight: "700" }]}>
                      {status}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={18} color={c} />}
                  </Pressable>
                );
              })}
            </View>
            {mutation.isPending && <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 18, gap: 4 },
  backBtn: { marginBottom: 8, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#FFF" },
  orderCount: { fontSize: 13, color: "rgba(255,255,255,0.7)" },
  scroll: { flex: 1 },
  list: { padding: 16, gap: 12 },
  orderCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 4,
    gap: 12,
  },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  orderId: { fontSize: 15, fontWeight: "700", color: colors.text },
  orderType: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  orderInfo: { gap: 5 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoText: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  orderFooter: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.borderLight },
  itemCount: { fontSize: 12, color: colors.textSecondary, flex: 1 },
  orderTotal: { fontSize: 16, fontWeight: "800", color: colors.primary },
  tapHint: { fontSize: 10, color: colors.textLight, fontStyle: "italic" },
  emptyState: { alignItems: "center", paddingTop: 64, gap: 12 },
  emptyText: { fontSize: 16, color: colors.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingTop: 16,
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#E5E7EB", alignSelf: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: colors.text, marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 20 },
  statusList: { gap: 10 },
  statusOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusOptionText: { flex: 1, fontSize: 15, fontWeight: "500", color: colors.text },
});
