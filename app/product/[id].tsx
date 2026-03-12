import React, { useEffect, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import colors from "@/constants/colors";
import { useCart } from "@/contexts/cart";

const { height } = Dimensions.get("window");

type SizeKey = "Small" | "Medium" | "Large";

interface Product {
  id: number;
  name: string;
  description?: string;
  category_name?: string;
  price_small: number;
  price_medium: number;
  price_large: number;
  is_highlighted: boolean;
  image?: string;
}

/* ================= API HOST ================= */

const API_HOST =
  Platform.OS === "android"
    ? "10.81.83.70:5000"
    : Platform.OS === "web"
    ? "10.81.83.70:5000"
    : "localhost:5000";

const API_URL = `http://${API_HOST}/api`;

/* ================= SCREEN ================= */

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { addItem } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedSize, setSelectedSize] = useState<SizeKey>("Medium");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const sizes: SizeKey[] = ["Small", "Medium", "Large"];

  /* ================= FETCH PRODUCT ================= */

  const fetchProduct = async () => {
    try {
      const res = await fetch(`${API_URL}/products/${id}`);
      if (!res.ok) throw new Error("Product not found");

      const data = await res.json();
      setProduct(data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
  }, []);

  /* ================= PRICE MAP ================= */

  const priceMap: Record<SizeKey, number> = product
    ? {
        Small: Number(product.price_small),
        Medium: Number(product.price_medium),
        Large: Number(product.price_large),
      }
    : { Small: 0, Medium: 0, Large: 0 };

  const selectedPrice = priceMap[selectedSize];

  /* ================= IMAGE ================= */

  const imageUri = product?.image?.startsWith("http")
    ? product.image
    : product?.image
    ? `http://${API_HOST}${product.image}`
    : null;

  /* ================= CART ================= */

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

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  /* ================= LOADING ================= */

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: topPad }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!product) {
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

  /* ================= UI ================= */

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* IMAGE */}
        <View style={styles.imageContainer}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Ionicons name="restaurant" size={80} color={colors.textLight} />
            </View>
          )}

          <LinearGradient
            colors={["rgba(0,0,0,0.35)", "transparent"]}
            style={styles.imageGradient}
          />

          {/* BACK */}
          <Pressable
            style={[styles.backCircle, { top: topPad + 12 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </Pressable>

          {/* CART */}
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

        {/* CONTENT */}

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              {product.category_name && (
                <Text style={styles.categoryLabel}>
                  {product.category_name}
                </Text>
              )}
              <Text style={styles.productName}>{product.name}</Text>
            </View>

            <Text style={styles.priceDisplay}>
              ${selectedPrice.toFixed(2)}
            </Text>
          </View>

          {product.description && (
            <Text style={styles.description}>{product.description}</Text>
          )}

          {/* SIZE */}
          <View>
            <Text style={styles.sectionLabel}>Select Size</Text>

            <View style={styles.sizeGrid}>
              {sizes.map((size) => {
                const price = priceMap[size];
                const isSelected = selectedSize === size;

                return (
                  <Pressable
                    key={size}
                    style={[
                      styles.sizeCard,
                      isSelected && styles.sizeCardActive,
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedSize(size);
                    }}
                  >
                    <Text
                      style={[
                        styles.sizeName,
                        isSelected && styles.sizeNameActive,
                      ]}
                    >
                      {size}
                    </Text>

                    <Text
                      style={[
                        styles.sizePrice,
                        isSelected && styles.sizePriceActive,
                      ]}
                    >
                      ${price.toFixed(2)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* QUANTITY */}

          <View>
            <Text style={styles.sectionLabel}>Quantity</Text>

            <View style={styles.quantityControl}>
              <Pressable
                style={styles.qtyButton}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Ionicons name="remove" size={20} color={colors.text} />
              </Pressable>

              <Text style={styles.qtyText}>{quantity}</Text>

              <Pressable
                style={styles.qtyButton}
                onPress={() => setQuantity(quantity + 1)}
              >
                <Ionicons name="add" size={20} color={colors.primary} />
              </Pressable>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* FOOTER */}

      <View style={[styles.footer, { paddingBottom: bottomPad + 24 }]}>
        <View>
          <Text style={styles.footerTotalLabel}>Total</Text>
          <Text style={styles.footerTotalAmount}>
            ${(selectedPrice * quantity).toFixed(2)}
          </Text>
        </View>

        <Pressable
          style={[styles.addButton, added && styles.addButtonAdded]}
          onPress={handleAddToCart}
        >
          <Ionicons
            name={added ? "checkmark-circle" : "cart"}
            size={20}
            color="#FFF"
          />
          <Text style={styles.addButtonText}>
            {added ? "Added to Cart!" : "Add to Cart"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ================= STYLES SAME ================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  errorText: { fontSize: 18, fontWeight: "600", color: colors.text },
  backBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  backBtnText: { color: "#FFF", fontWeight: "600" },

  imageContainer: { position: "relative", height: height * 0.42 },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: { backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },

  imageGradient: { position: "absolute", top: 0, left: 0, right: 0, height: 120 },

  backCircle: {
    position: "absolute",
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },

  cartCircle: {
    position: "absolute",
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
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

  titleRow: { flexDirection: "row", gap: 12 },

  categoryLabel: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "600",
    textTransform: "uppercase",
  },

  productName: { fontSize: 26, fontWeight: "800", color: colors.text },

  priceDisplay: { fontSize: 28, fontWeight: "800", color: colors.primary },

  description: { fontSize: 15, color: colors.textSecondary },

  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 10,
  },

  sizeGrid: { flexDirection: "row", gap: 10 },

  sizeCard: {
    flex: 1,
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: "#FFF",
  },

  sizeCardActive: { borderColor: colors.primary },

  sizeName: { fontSize: 14, fontWeight: "700", color: colors.textSecondary },
  sizeNameActive: { color: colors.primary },

  sizePrice: { fontSize: 13, color: colors.textLight },
  sizePriceActive: { color: colors.primaryDark },

  quantityControl: { flexDirection: "row", alignItems: "center" },

  qtyButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },

  qtyText: { fontSize: 20, fontWeight: "800", minWidth: 50, textAlign: "center" },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },

  footerTotalLabel: { fontSize: 11, color: colors.textSecondary },
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
  },

  addButtonAdded: { backgroundColor: colors.success },

  addButtonText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});