import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  Dimensions,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { fetch } from "expo/fetch";
import * as Haptics from "expo-haptics";
import colors from "@/constants/colors";
import { useCart } from "@/contexts/cart";
import { getApiUrl } from "@/lib/query-client";

const { width, height } = Dimensions.get("window");

type SizeKey = "Small" | "Medium" | "Large";

async function fetchProduct(id: string) {
  const base = getApiUrl();
  const res = await fetch(`${base}api/products/${id}`);
  if (!res.ok) throw new Error("Product not found");
  return res.json();
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { addItem } = useCart();

  const [selectedSize, setSelectedSize] = useState<SizeKey>("Medium");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const { data: product, isLoading, error } = useQuery({
    queryKey: ["product", id],
    queryFn: () => fetchProduct(id!),
    enabled: !!id,
  });

  const sizes: SizeKey[] = ["Small", "Medium", "Large"];

  const priceMap: Record<SizeKey, string> = product
    ? {
        Small: product.price_small,
        Medium: product.price_medium,
        Large: product.price_large,
      }
    : { Small: "0", Medium: "0", Large: "0" };

  const selectedPrice = parseFloat(priceMap[selectedSize] || "0");

  const handleAddToCart = () => {
    if (!product) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addItem({
      product_id: product.id,
      name: product.name,
      image: product.image,
      size: selectedSize,
      price: selectedPrice,
      quantity,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const imageUri = product?.image?.startsWith("http")
    ? product.image
    : product?.image
    ? `${getApiUrl().replace(/\/$/, "")}${product.image}`
    : null;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: topPad }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: topPad }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={styles.errorText}>Product not found</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} bounces>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Ionicons name="restaurant" size={80} color={colors.textLight} />
            </View>
          )}
          <LinearGradient
            colors={["rgba(0,0,0,0.35)", "transparent"]}
            style={styles.imageGradient}
          />

          {/* Back button */}
          <Pressable
            style={[styles.backCircle, { top: topPad + 12 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </Pressable>

          {/* Cart button */}
          <Pressable
            style={[styles.cartCircle, { top: topPad + 12 }]}
            onPress={() => router.push("/(tabs)/cart")}
          >
            <Ionicons name="cart-outline" size={22} color="#FFF" />
          </Pressable>

          {product.is_highlighted && (
            <View style={styles.featuredBadge}>
              <Ionicons name="star" size={12} color="#FFF" />
              <Text style={styles.featuredBadgeText}>Featured</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              {product.category_name && (
                <Text style={styles.categoryLabel}>{product.category_name}</Text>
              )}
              <Text style={styles.productName}>{product.name}</Text>
            </View>
            <Text style={styles.priceDisplay}>${selectedPrice.toFixed(2)}</Text>
          </View>

          {product.description ? (
            <Text style={styles.description}>{product.description}</Text>
          ) : null}

          {/* Size Selection */}
          <View style={styles.sizeSection}>
            <Text style={styles.sectionLabel}>Select Size</Text>
            <View style={styles.sizeGrid}>
              {sizes.map((size) => {
                const price = parseFloat(priceMap[size] || "0");
                const isSelected = selectedSize === size;
                return (
                  <Pressable
                    key={size}
                    style={[styles.sizeCard, isSelected && styles.sizeCardActive]}
                    onPress={() => { Haptics.selectionAsync(); setSelectedSize(size); }}
                  >
                    <Text style={[styles.sizeName, isSelected && styles.sizeNameActive]}>{size}</Text>
                    <Text style={[styles.sizePrice, isSelected && styles.sizePriceActive]}>
                      ${price.toFixed(2)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Quantity */}
          <View style={styles.quantitySection}>
            <Text style={styles.sectionLabel}>Quantity</Text>
            <View style={styles.quantityControl}>
              <Pressable
                style={styles.qtyButton}
                onPress={() => { Haptics.selectionAsync(); setQuantity(Math.max(1, quantity - 1)); }}
              >
                <Ionicons name="remove" size={20} color={colors.text} />
              </Pressable>
              <Text style={styles.qtyText}>{quantity}</Text>
              <Pressable
                style={styles.qtyButton}
                onPress={() => { Haptics.selectionAsync(); setQuantity(quantity + 1); }}
              >
                <Ionicons name="add" size={20} color={colors.primary} />
              </Pressable>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Add to Cart Button */}
      <View style={[styles.footer, { paddingBottom: bottomPad + 24 }]}>
        <View style={styles.footerTotal}>
          <Text style={styles.footerTotalLabel}>Total</Text>
          <Text style={styles.footerTotalAmount}>${(selectedPrice * quantity).toFixed(2)}</Text>
        </View>
        <Pressable
          style={[styles.addButton, added && styles.addButtonAdded]}
          onPress={handleAddToCart}
        >
          <Ionicons name={added ? "checkmark-circle" : "cart"} size={20} color="#FFF" />
          <Text style={styles.addButtonText}>{added ? "Added to Cart!" : "Add to Cart"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  errorText: { fontSize: 18, fontWeight: "600", color: colors.text },
  backBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  backBtnText: { color: "#FFF", fontWeight: "600" },
  scroll: { flex: 1 },
  imageContainer: { position: "relative", height: height * 0.42 },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: { backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  imageGradient: { position: "absolute", top: 0, left: 0, right: 0, height: 120 },
  backCircle: {
    position: "absolute",
    left: 16,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center", justifyContent: "center",
  },
  cartCircle: {
    position: "absolute",
    right: 16,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center", justifyContent: "center",
  },
  featuredBadge: {
    position: "absolute",
    bottom: 16,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  featuredBadgeText: { color: "#FFF", fontSize: 11, fontWeight: "700" },
  content: { padding: 20, gap: 20 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  categoryLabel: { fontSize: 12, color: colors.primary, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  productName: { fontSize: 26, fontWeight: "800", color: colors.text, lineHeight: 32 },
  priceDisplay: { fontSize: 28, fontWeight: "800", color: colors.primary, paddingTop: 8 },
  description: { fontSize: 15, color: colors.textSecondary, lineHeight: 22 },
  sectionLabel: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  sizeSection: {},
  sizeGrid: { flexDirection: "row", gap: 10 },
  sizeCard: {
    flex: 1,
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: "#FFF",
    gap: 4,
  },
  sizeCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryPale },
  sizeName: { fontSize: 14, fontWeight: "700", color: colors.textSecondary },
  sizeNameActive: { color: colors.primary },
  sizePrice: { fontSize: 13, fontWeight: "600", color: colors.textLight },
  sizePriceActive: { color: colors.primaryDark },
  quantitySection: {},
  quantityControl: { flexDirection: "row", alignItems: "center", gap: 0, alignSelf: "flex-start" },
  qtyButton: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: colors.borderLight,
    alignItems: "center", justifyContent: "center",
  },
  qtyText: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    minWidth: 50,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingTop: 16,
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  footerTotal: { gap: 2 },
  footerTotalLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: "500" },
  footerTotalAmount: { fontSize: 22, fontWeight: "800", color: colors.text },
  addButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  addButtonAdded: { backgroundColor: colors.success },
  addButtonText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});
