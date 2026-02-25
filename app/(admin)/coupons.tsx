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
  TextInput,
  Modal,
  RefreshControl,
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

async function fetchCoupons(token: string) {
  const base = getApiUrl();
  const res = await fetch(`${base}api/admin/coupons`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

async function createCoupon(token: string, data: any) {
  const base = getApiUrl();
  const res = await fetch(`${base}api/admin/coupons`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
  return res.json();
}

async function toggleCoupon(token: string, id: number, is_active: boolean) {
  const base = getApiUrl();
  const res = await fetch(`${base}api/admin/coupons/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ is_active }),
  });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

async function deleteCoupon(token: string, id: number) {
  const base = getApiUrl();
  const res = await fetch(`${base}api/admin/coupons/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

const DISCOUNT_TYPES = ["percentage", "fixed"];

export default function AdminCouponsScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    code: "",
    discount_type: "percentage",
    discount_value: "",
    minimum_order: "",
    expiry_date: "",
  });
  const [formError, setFormError] = useState("");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: coupons = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-coupons", token],
    queryFn: () => fetchCoupons(token!),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: () => createCoupon(token!, {
      ...form,
      discount_value: parseFloat(form.discount_value),
      minimum_order: parseFloat(form.minimum_order) || 0,
      expiry_date: form.expiry_date || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      setModal(false);
      setForm({ name: "", description: "", code: "", discount_type: "percentage", discount_value: "", minimum_order: "", expiry_date: "" });
    },
    onError: (e: any) => setFormError(e.message || "Failed"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) => toggleCoupon(token!, id, is_active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-coupons"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCoupon(token!, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-coupons"] }),
  });

  const handleSave = () => {
    if (!form.name || !form.code || !form.discount_value) {
      setFormError("Name, code and discount are required");
      return;
    }
    setFormError("");
    createMutation.mutate();
  };

  const updateField = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#1E293B", "#334155"]}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <View style={styles.headerRow}>
          <View>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color="#FFF" />
            </Pressable>
            <Text style={styles.headerTitle}>Coupons</Text>
          </View>
          <Pressable style={styles.addBtn} onPress={() => setModal(true)}>
            <Ionicons name="add" size={22} color="#FFF" />
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
        ) : coupons.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="pricetag-outline" size={48} color={colors.textLight} />
            <Text style={styles.emptyText}>No coupons yet</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {coupons.map((coupon: any) => (
              <View key={coupon.id} style={[styles.couponCard, !coupon.is_active && { opacity: 0.65 }]}>
                <LinearGradient
                  colors={coupon.is_active ? ["#FF4500", "#FF6B35"] : ["#9CA3AF", "#6B7280"]}
                  style={styles.couponBanner}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.couponDiscount}>
                    {coupon.discount_type === "percentage" ? `${coupon.discount_value}% OFF` : `$${coupon.discount_value} OFF`}
                  </Text>
                  <View style={styles.couponCodeBox}>
                    <Text style={styles.couponCodeText}>{coupon.code}</Text>
                  </View>
                </LinearGradient>

                <View style={styles.couponBody}>
                  <Text style={styles.couponName}>{coupon.name}</Text>
                  {coupon.description ? (
                    <Text style={styles.couponDesc}>{coupon.description}</Text>
                  ) : null}
                  <View style={styles.couponMeta}>
                    {parseFloat(coupon.minimum_order) > 0 && (
                      <View style={styles.metaTag}>
                        <Text style={styles.metaTagText}>Min ${coupon.minimum_order}</Text>
                      </View>
                    )}
                    {coupon.expiry_date && (
                      <View style={styles.metaTag}>
                        <Text style={styles.metaTagText}>
                          Exp {new Date(coupon.expiry_date).toLocaleDateString()}
                        </Text>
                      </View>
                    )}
                    <View style={[styles.metaTag, { backgroundColor: coupon.is_active ? "#ECFDF5" : "#FEF2F2" }]}>
                      <Text style={[styles.metaTagText, { color: coupon.is_active ? colors.success : colors.error }]}>
                        {coupon.is_active ? "Active" : "Inactive"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.couponActions}>
                    <Pressable
                      style={styles.actionBtn}
                      onPress={() => toggleMutation.mutate({ id: coupon.id, is_active: !coupon.is_active })}
                    >
                      <Ionicons name={coupon.is_active ? "pause-circle-outline" : "play-circle-outline"} size={18} color={colors.textSecondary} />
                      <Text style={styles.actionBtnText}>{coupon.is_active ? "Deactivate" : "Activate"}</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: "#FEF2F2" }]}
                      onPress={() => Alert.alert("Delete", `Delete "${coupon.name}"?`, [
                        { text: "Cancel", style: "cancel" },
                        { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(coupon.id) },
                      ])}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Coupon Modal */}
      <Modal visible={modal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>New Coupon</Text>

              {formError ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              ) : null}

              {[
                { key: "name", label: "Name", placeholder: "e.g. Summer Sale" },
                { key: "description", label: "Description (optional)", placeholder: "Short description" },
                { key: "code", label: "Code", placeholder: "SAVE20", autoCapitalize: "characters" },
                { key: "discount_value", label: "Discount Value", placeholder: "20", keyboardType: "numeric" },
                { key: "minimum_order", label: "Minimum Order ($)", placeholder: "0", keyboardType: "numeric" },
                { key: "expiry_date", label: "Expiry Date (optional)", placeholder: "2025-12-31" },
              ].map((field) => (
                <View key={field.key} style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder={field.placeholder}
                    placeholderTextColor={colors.textLight}
                    value={form[field.key as keyof typeof form]}
                    onChangeText={(v) => updateField(field.key, v)}
                    autoCapitalize={field.autoCapitalize as any || "none"}
                    keyboardType={field.keyboardType as any || "default"}
                  />
                </View>
              ))}

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Discount Type</Text>
                <View style={styles.typeRow}>
                  {DISCOUNT_TYPES.map((t) => (
                    <Pressable
                      key={t}
                      style={[styles.typeBtn, form.discount_type === t && styles.typeBtnActive]}
                      onPress={() => updateField("discount_type", t)}
                    >
                      <Text style={[styles.typeBtnText, form.discount_type === t && styles.typeBtnTextActive]}>
                        {t === "percentage" ? "Percentage (%)" : "Fixed ($)"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.modalButtons}>
                <Pressable style={styles.cancelBtn} onPress={() => setModal(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.saveBtn, createMutation.isPending && { opacity: 0.7 }]}
                  onPress={handleSave}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Create</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 18 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  backBtn: { marginBottom: 8, width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#FFF" },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  scroll: { flex: 1 },
  list: { padding: 16, gap: 12 },
  couponCard: { backgroundColor: "#FFF", borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  couponBanner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  couponDiscount: { fontSize: 22, fontWeight: "900", color: "#FFF" },
  couponCodeBox: { backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "rgba(255,255,255,0.4)", borderStyle: "dashed" },
  couponCodeText: { color: "#FFF", fontSize: 13, fontWeight: "800", letterSpacing: 1 },
  couponBody: { padding: 14, gap: 8 },
  couponName: { fontSize: 15, fontWeight: "700", color: colors.text },
  couponDesc: { fontSize: 13, color: colors.textSecondary },
  couponMeta: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  metaTag: { backgroundColor: colors.borderLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  metaTagText: { fontSize: 11, fontWeight: "600", color: colors.textSecondary },
  couponActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.borderLight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  actionBtnText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  emptyState: { alignItems: "center", paddingTop: 64, gap: 12 },
  emptyText: { fontSize: 16, color: colors.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingTop: 16, maxHeight: "90%", gap: 0 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#E5E7EB", alignSelf: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: colors.text, marginBottom: 16 },
  errorBanner: { backgroundColor: "#FEF2F2", borderRadius: 10, padding: 10, marginBottom: 12 },
  errorText: { color: colors.error, fontSize: 13 },
  fieldGroup: { marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 6 },
  fieldInput: { backgroundColor: colors.borderLight, borderRadius: 12, padding: 12, fontSize: 14, color: colors.text, borderWidth: 1, borderColor: colors.border },
  typeRow: { flexDirection: "row", gap: 8 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, alignItems: "center" },
  typeBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryPale },
  typeBtnText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  typeBtnTextActive: { color: colors.primary },
  modalButtons: { flexDirection: "row", gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, alignItems: "center" },
  cancelBtnText: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center" },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#FFF" },
});
