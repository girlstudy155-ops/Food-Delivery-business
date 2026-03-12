import React, { useEffect, useState } from "react";
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
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import colors from "@/constants/colors";

interface Product {
  id: number;
  name: string;
  description?: string;
  category_id?: number;
  category_name?: string;
  price_small: number;
  price_medium: number;
  price_large: number;
  is_active: boolean;
  is_highlighted: boolean;
  image?: string;
}

interface Category {
  id: number;
  name: string;
}

// Fix API_HOST for all platforms
const API_HOST =
  Platform.OS === "android"
    ? "10.81.83.70:5000"
    : Platform.OS === "web"
    ? "10.81.83.70:5000"
    : "localhost:5000";

const API_URL = `http://${API_HOST}/api/admin`;

export default function AdminProductsScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modal, setModal] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
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

  /* ================= FETCH ================= */
  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_URL}/products`);
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      setProducts(data);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to fetch products");
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_URL}/categories`);
      if (!res.ok) throw new Error("Failed to fetch categories");
      const data = await res.json();
      setCategories(data);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to fetch categories");
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchCategories();
      await fetchProducts();
      setLoading(false);
    };
    loadData();
  }, []);

  /* ================= MODAL / FORM ================= */
  const openModalForEdit = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description || "",
      category_id: String(product.category_id || ""),
      price_small: String(product.price_small),
      price_medium: String(product.price_medium),
      price_large: String(product.price_large),
      is_highlighted: product.is_highlighted ? "true" : "false",
    });
    setImageUri(product.image?.startsWith("http") ? product.image : null);
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError("Name is required");
      return;
    }
    if (!form.price_medium.trim()) {
      setFormError("Medium price is required");
      return;
    }
    setFormError("");

    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => body.append(key, String(value)));

    if (imageUri && !imageUri.startsWith("http")) {
      const filename = imageUri.split("/").pop() || "photo.jpg";
      const file: any = {
        uri: Platform.OS === "android" ? imageUri : imageUri.replace("file://", ""),
        name: filename,
        type: "image/jpeg",
      };
      body.append("image", file);
    }

    try {
      let res;
      if (editingProduct) {
        // UPDATE PRODUCT
        res = await fetch(`${API_URL}/products/${editingProduct.id}`, {
          method: "PUT",
          body,
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        // CREATE PRODUCT
        res = await fetch(`${API_URL}/products`, {
          method: "POST",
          body,
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      if (!res.ok) throw new Error("Failed to save product");

      setModal(false);
      setEditingProduct(null);
      setForm({
        name: "",
        description: "",
        category_id: "",
        price_small: "",
        price_medium: "",
        price_large: "",
        is_highlighted: "false",
      });
      setImageUri(null);
      fetchProducts();
    } catch (e: any) {
      setFormError(e.message || "Error saving product");
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Camera roll permission is required");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const getProductImage = (product: Product) =>
    product.image?.startsWith("http")
      ? product.image
      : product.image
      ? `http://${API_HOST}${product.image}`
      : null;

  /* ================= ACTIONS ================= */
  const toggleHighlight = async (product: Product) => {
    try {
      await fetch(`${API_URL}/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_highlighted: !product.is_highlighted }),
      });
      fetchProducts();
    } catch {
      Alert.alert("Error", "Failed to update highlight");
    }
  };

  const deleteProduct = async (id: number) => {
    try {
      await fetch(`${API_URL}/products/${id}`, { method: "DELETE" });
      fetchProducts();
    } catch {
      Alert.alert("Error", "Failed to delete product");
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
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

      {/* Product List */}
      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await fetchProducts();
              setRefreshing(false);
            }}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
        ) : products.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="fast-food-outline" size={48} color={colors.textLight} />
            <Text style={styles.emptyText}>No products yet</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {products.map((product) => {
              const imageUri = getProductImage(product);
              return (
                <View key={product.id} style={[styles.productCard, !product.is_active && { opacity: 0.65 }]}>
                  <View style={styles.productTop}>
                    {imageUri ? (
                      <Image source={{ uri: imageUri }} style={styles.productImage} />
                    ) : (
                      <View style={[styles.productImage, styles.productImagePlaceholder]}>
                        <Ionicons name="image-outline" size={24} color={colors.textLight} />
                      </View>
                    )}
                    <View style={styles.productInfo}>
                      <Text style={styles.productName}>{product.name}</Text>
                      <Text style={styles.productCategory}>{product.category_name || "Uncategorized"}</Text>
                      <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>S: ₹{product.price_small.toFixed(2)}</Text>
                        <Text style={styles.priceLabel}>M: ₹{product.price_medium.toFixed(2)}</Text>
                        <Text style={styles.priceLabel}>L: ₹{product.price_large.toFixed(2)}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.productActions}>
                    <Pressable
                      style={[styles.actionBtn, product.is_highlighted && styles.actionBtnActive]}
                      onPress={() => toggleHighlight(product)}
                    >
                      <Ionicons
                        name={product.is_highlighted ? "star" : "star-outline"}
                        size={16}
                        color={product.is_highlighted ? colors.warning : colors.textSecondary}
                      />
                    </Pressable>
                    {/* EDIT ICON */}
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: "#FEF2F2" }]}
                      onPress={() => openModalForEdit(product)}
                    >
                      <Ionicons name="pencil-outline" size={16} color={colors.primary} />
                    </Pressable>
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: "#FEF2F2" }]}
                      onPress={() =>
                        Alert.alert("Delete", `Delete "${product.name}"?`, [
                          { text: "Cancel", style: "cancel" },
                          { text: "Delete", style: "destructive", onPress: () => deleteProduct(product.id) },
                        ])
                      }
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

      {/* Modal */}
      <Modal visible={modal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>{editingProduct ? "Edit Product" : "Add Product"}</Text>

              {formError ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              ) : null}

              <Pressable style={styles.imagePicker} onPress={pickImage}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.imagePickerPreview} />
                ) : (
                  <View style={styles.imagePickerEmpty}>
                    <Ionicons name="camera-outline" size={28} color={colors.primary} />
                    <Text style={styles.imagePickerText}>Tap to add image</Text>
                  </View>
                )}
              </Pressable>

              {["name", "description"].map((key) => (
                <View key={key} style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{key === "name" ? "Product Name *" : "Description"}</Text>
                  <TextInput
                    style={[
                      styles.fieldInput,
                      key === "description" && { height: 60, textAlignVertical: "top" },
                    ]}
                    placeholder={key === "name" ? "e.g. Margherita Pizza" : "Short description"}
                    placeholderTextColor={colors.textLight}
                    value={form[key as keyof typeof form]}
                    onChangeText={(v) => setForm((p) => ({ ...p, [key]: v }))}
                    multiline={key === "description"}
                  />
                </View>
              ))}

              {/* Category Chips */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                  {categories.map((cat) => (
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
                {["price_small", "price_medium", "price_large"].map((key) => (
                  <View key={key} style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { fontSize: 11 }]}>
                      {key.replace("price_", "").toUpperCase()}
                      {key === "price_medium" ? " *" : ""}
                    </Text>
                    <TextInput
                      style={[styles.fieldInput, { marginTop: 4 }]}
                      placeholder="0.00"
                      placeholderTextColor={colors.textLight}
                      keyboardType="numeric"
                      value={form[key as keyof typeof form]}
                      onChangeText={(v) => setForm((p) => ({ ...p, [key]: v }))}
                    />
                  </View>
                ))}
              </View>

              {/* Highlight */}
              <Pressable
                style={[styles.highlightToggle, form.is_highlighted === "true" && styles.highlightToggleActive]}
                onPress={() =>
                  setForm((p) => ({ ...p, is_highlighted: p.is_highlighted === "true" ? "false" : "true" }))
                }
              >
                <Ionicons
                  name={form.is_highlighted === "true" ? "star" : "star-outline"}
                  size={18}
                  color={form.is_highlighted === "true" ? colors.warning : colors.textSecondary}
                />
                <Text style={[styles.highlightText, form.is_highlighted === "true" && { color: colors.warning }]}>
                  Mark as Featured
                </Text>
              </Pressable>

              {/* Buttons */}
              <View style={styles.modalButtons}>
                <Pressable style={styles.cancelBtn} onPress={() => setModal(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.saveBtn} onPress={handleSave}>
                  <Text style={styles.saveBtnText}>{editingProduct ? "Update Product" : "Add Product"}</Text>
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

/* STYLES SAME AS BEFORE */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 18 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  backBtn: { marginBottom: 8, width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#FFF" },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  scroll: { flex: 1 },
  list: { padding: 16, gap: 12 },
  productCard: { backgroundColor: "#FFF", borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 4 },
  productTop: { flexDirection: "row", gap: 12, padding: 12 },
  productImage: { width: 80, height: 80, borderRadius: 12 },
  productImagePlaceholder: { backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  productInfo: { flex: 1, justifyContent: "space-between" },
  productName: { fontSize: 14, fontWeight: "700", color: colors.text },
  productCategory: { fontSize: 12, color: colors.primary, fontWeight: "600" },
  priceRow: { flexDirection: "row", gap: 6 },
  priceLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: "600" },
  productActions: { flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingBottom: 12, paddingTop: 4, borderTopWidth: 1, borderTopColor: colors.borderLight },
  actionBtn: { flex: 1, height: 34, borderRadius: 10, backgroundColor: colors.borderLight, alignItems: "center", justifyContent: "center" },
  actionBtnActive: { backgroundColor: "#FFFBEB" },
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
  catChipActive: { borderColor: colors.primary, backgroundColor: "#EFF6FF" },
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