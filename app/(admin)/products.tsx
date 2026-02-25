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
  Image,
  RefreshControl,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { fetch } from "expo/fetch";
import * as ImagePicker from "expo-image-picker";
import colors from "@/constants/colors";
import { useAuth } from "@/contexts/auth";
import { getApiUrl } from "@/lib/query-client";

async function fetchAdminProducts(token: string) {
  const base = getApiUrl();
  const res = await fetch(`${base}api/admin/products`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

async function fetchCategories(token: string) {
  const base = getApiUrl();
  const res = await fetch(`${base}api/admin/categories`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

async function createProduct(token: string, formData: any) {
  const base = getApiUrl();
  const body = new FormData();
  Object.entries(formData).forEach(([k, v]) => {
    if (v !== null && v !== undefined && k !== "image_uri") {
      body.append(k, String(v));
    }
  });
  if (formData.image_uri) {
    const filename = formData.image_uri.split("/").pop() || "photo.jpg";
    body.append("image", { uri: formData.image_uri, name: filename, type: "image/jpeg" } as any);
  }
  const res = await fetch(`${base}api/admin/products`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
  return res.json();
}

async function toggleProduct(token: string, id: number, is_active: boolean) {
  const base = getApiUrl();
  const res = await fetch(`${base}api/admin/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ is_active }),
  });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

async function toggleHighlight(token: string, id: number, is_highlighted: boolean) {
  const base = getApiUrl();
  const res = await fetch(`${base}api/admin/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ is_highlighted }),
  });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

async function deleteProduct(token: string, id: number) {
  const base = getApiUrl();
  const res = await fetch(`${base}api/admin/products/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export default function AdminProductsScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category_id: "",
    price_small: "",
    price_medium: "",
    price_large: "",
    is_highlighted: "false",
  });
  const [formError, setFormError] = useState("");
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const base = getApiUrl().replace(/\/$/, "");

  const { data: products = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-products", token],
    queryFn: () => fetchAdminProducts(token!),
    enabled: !!token,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories-pick", token],
    queryFn: () => fetchCategories(token!),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: () => createProduct(token!, {
      ...form,
      price_small: parseFloat(form.price_small) || 0,
      price_medium: parseFloat(form.price_medium) || 0,
      price_large: parseFloat(form.price_large) || 0,
      image_uri: imageUri,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      setModal(false);
      setForm({ name: "", description: "", category_id: "", price_small: "", price_medium: "", price_large: "", is_highlighted: "false" });
      setImageUri(null);
    },
    onError: (e: any) => setFormError(e.message || "Failed"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) => toggleProduct(token!, id, is_active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-products"] }),
  });

  const highlightMutation = useMutation({
    mutationFn: ({ id, is_highlighted }: { id: number; is_highlighted: boolean }) => toggleHighlight(token!, id, is_highlighted),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-products"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteProduct(token!, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-products"] }),
  });

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const handleSave = () => {
    if (!form.name.trim()) { setFormError("Name is required"); return; }
    if (!form.price_medium) { setFormError("Medium price is required"); return; }
    setFormError("");
    createMutation.mutate();
  };

  const getProductImage = (product: any) =>
    product.image?.startsWith("http") ? product.image : product.image ? `${base}${product.image}` : null;

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
            <Text style={styles.headerTitle}>Products</Text>
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
        ) : products.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="fast-food-outline" size={48} color={colors.textLight} />
            <Text style={styles.emptyText}>No products yet</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {products.map((product: any) => {
              const imageUri = getProductImage(product);
              return (
                <View key={product.id} style={[styles.productCard, !product.is_active && { opacity: 0.65 }]}>
                  <View style={styles.productTop}>
                    {imageUri ? (
                      <Image source={{ uri: imageUri }} style={styles.productImage} resizeMode="cover" />
                    ) : (
                      <View style={[styles.productImage, styles.productImagePlaceholder]}>
                        <Ionicons name="image-outline" size={24} color={colors.textLight} />
                      </View>
                    )}
                    <View style={styles.productInfo}>
                      <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                      <Text style={styles.productCategory}>{product.category_name || "Uncategorized"}</Text>
                      <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>S: ${parseFloat(product.price_small).toFixed(2)}</Text>
                        <Text style={styles.priceLabel}>M: ${parseFloat(product.price_medium).toFixed(2)}</Text>
                        <Text style={styles.priceLabel}>L: ${parseFloat(product.price_large).toFixed(2)}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.productActions}>
                    <Pressable
                      style={[styles.actionBtn, product.is_highlighted && styles.actionBtnActive]}
                      onPress={() => highlightMutation.mutate({ id: product.id, is_highlighted: !product.is_highlighted })}
                    >
                      <Ionicons name={product.is_highlighted ? "star" : "star-outline"} size={16} color={product.is_highlighted ? colors.warning : colors.textSecondary} />
                    </Pressable>
                    <Pressable
                      style={[styles.actionBtn, !product.is_active && styles.actionBtnWarning]}
                      onPress={() => toggleMutation.mutate({ id: product.id, is_active: !product.is_active })}
                    >
                      <Ionicons name={product.is_active ? "eye-outline" : "eye-off-outline"} size={16} color={product.is_active ? colors.info : colors.error} />
                    </Pressable>
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: "#FEF2F2" }]}
                      onPress={() => Alert.alert("Delete", `Delete "${product.name}"?`, [
                        { text: "Cancel", style: "cancel" },
                        { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(product.id) },
                      ])}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Product Modal */}
      <Modal visible={modal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Add Product</Text>

              {formError ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              ) : null}

              {/* Image picker */}
              <Pressable style={styles.imagePicker} onPress={pickImage}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.imagePickerPreview} resizeMode="cover" />
                ) : (
                  <View style={styles.imagePickerEmpty}>
                    <Ionicons name="camera-outline" size={28} color={colors.primary} />
                    <Text style={styles.imagePickerText}>Tap to add image</Text>
                  </View>
                )}
              </Pressable>

              {[
                { key: "name", label: "Product Name *", placeholder: "e.g. Margherita Pizza" },
                { key: "description", label: "Description", placeholder: "Short description", multiline: true },
              ].map((f) => (
                <View key={f.key} style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <TextInput
                    style={[styles.fieldInput, f.multiline && { height: 60, textAlignVertical: "top" }]}
                    placeholder={f.placeholder}
                    placeholderTextColor={colors.textLight}
                    value={form[f.key as keyof typeof form]}
                    onChangeText={(v) => setForm((p) => ({ ...p, [f.key]: v }))}
                    multiline={f.multiline}
                  />
                </View>
              ))}

              {/* Category */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                  {categories.map((cat: any) => (
                    <Pressable
                      key={cat.id}
                      style={[styles.catChip, form.category_id === String(cat.id) && styles.catChipActive]}
                      onPress={() => setForm((p) => ({ ...p, category_id: String(cat.id) }))}
                    >
                      <Text style={[styles.catChipText, form.category_id === String(cat.id) && styles.catChipTextActive]}>
                        {cat.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Prices */}
              <View style={styles.pricesRow}>
                {[
                  { key: "price_small", label: "Small ($)" },
                  { key: "price_medium", label: "Medium ($) *" },
                  { key: "price_large", label: "Large ($)" },
                ].map((f) => (
                  <View key={f.key} style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { fontSize: 11 }]}>{f.label}</Text>
                    <TextInput
                      style={[styles.fieldInput, { marginTop: 4 }]}
                      placeholder="0.00"
                      placeholderTextColor={colors.textLight}
                      value={form[f.key as keyof typeof form]}
                      onChangeText={(v) => setForm((p) => ({ ...p, [f.key]: v }))}
                      keyboardType="numeric"
                    />
                  </View>
                ))}
              </View>

              {/* Highlight */}
              <Pressable
                style={[styles.highlightToggle, form.is_highlighted === "true" && styles.highlightToggleActive]}
                onPress={() => setForm((p) => ({ ...p, is_highlighted: p.is_highlighted === "true" ? "false" : "true" }))}
              >
                <Ionicons name={form.is_highlighted === "true" ? "star" : "star-outline"} size={18} color={form.is_highlighted === "true" ? colors.warning : colors.textSecondary} />
                <Text style={[styles.highlightText, form.is_highlighted === "true" && { color: colors.warning }]}>
                  Mark as Featured/Highlighted
                </Text>
              </Pressable>

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
                    <Text style={styles.saveBtnText}>Add Product</Text>
                  )}
                </Pressable>
              </View>
              <View style={{ height: 20 }} />
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
  productCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 4,
  },
  productTop: { flexDirection: "row", gap: 12, padding: 12 },
  productImage: { width: 80, height: 80, borderRadius: 12 },
  productImagePlaceholder: { backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  productInfo: { flex: 1, justifyContent: "space-between" },
  productName: { fontSize: 14, fontWeight: "700", color: colors.text },
  productCategory: { fontSize: 12, color: colors.primary, fontWeight: "600" },
  priceRow: { flexDirection: "row", gap: 6 },
  priceLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: "600" },
  productActions: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  actionBtn: {
    flex: 1,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnActive: { backgroundColor: "#FFFBEB" },
  actionBtnWarning: { backgroundColor: "#FEF2F2" },
  emptyState: { alignItems: "center", paddingTop: 64, gap: 12 },
  emptyText: { fontSize: 16, color: colors.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingTop: 16, maxHeight: "92%" },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#E5E7EB", alignSelf: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: colors.text, marginBottom: 16 },
  errorBanner: { backgroundColor: "#FEF2F2", borderRadius: 10, padding: 10, marginBottom: 12 },
  errorText: { color: colors.error, fontSize: 13 },
  imagePicker: { height: 120, borderRadius: 14, overflow: "hidden", marginBottom: 14, borderWidth: 2, borderColor: colors.border, borderStyle: "dashed" },
  imagePickerPreview: { width: "100%", height: "100%" },
  imagePickerEmpty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: colors.borderLight },
  imagePickerText: { fontSize: 13, color: colors.textSecondary },
  fieldGroup: { marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 4 },
  fieldInput: { backgroundColor: colors.borderLight, borderRadius: 12, padding: 12, fontSize: 14, color: colors.text, borderWidth: 1, borderColor: colors.border },
  catChip: { marginRight: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: "#F9FAFB" },
  catChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryPale },
  catChipText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  catChipTextActive: { color: colors.primary },
  pricesRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  highlightToggle: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, marginBottom: 16 },
  highlightToggleActive: { borderColor: colors.warning, backgroundColor: "#FFFBEB" },
  highlightText: { fontSize: 14, fontWeight: "600", color: colors.textSecondary, flex: 1 },
  modalButtons: { flexDirection: "row", gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, alignItems: "center" },
  cancelBtnText: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center" },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#FFF" },
});
