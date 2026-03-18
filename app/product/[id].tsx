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
import { useTheme } from "@/contexts/ThemeContext";

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

const API_HOST =
  "https://food-delivery-business-production-00a9.up.railway.app";
const API_URL = `${API_HOST}/api`;

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { addItem } = useCart();
  const { theme } = useTheme();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedSize, setSelectedSize] = useState<SizeKey>("Medium");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const sizes: SizeKey[] = ["Small", "Medium", "Large"];

  const fetchProduct = async () => {
    try {
      const res = await fetch(`${API_URL}/products/${id}`);
      if (!res.ok) throw new Error("Product not found");
      const data = await res.json();
      setProduct(data);
    } catch (error) {
      console.log("Fetch Product Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchProduct();
  }, [id]);

  const priceMap: Record<SizeKey, number> = product
    ? {
        Small: Number(product.price_small),
        Medium: Number(product.price_medium),
        Large: Number(product.price_large),
      }
    : { Small: 0, Medium: 0, Large: 0 };

  const selectedPrice = priceMap[selectedSize];

  const imageUri = product?.image
    ? product.image.startsWith("http")
      ? product.image
      : `${API_HOST}${product.image}`
    : null;

  const handleAddToCart = () => {
    if (!product) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // ✅ FIX: Properly add item to cart
    addItem({
      product_id: product.id,
      name: product.name,
      image: product.image, // use fully resolved URL
      size: selectedSize,
      price: selectedPrice,
      quantity,
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { paddingTop: topPad, backgroundColor: theme.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { paddingTop: topPad, backgroundColor: theme.background },
        ]}
      >
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={[styles.errorText, { color: theme.text }]}>
          Product not found
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* IMAGE */}
        <View style={styles.imageContainer}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} />
          ) : (
            <View
              style={[
                styles.image,
                styles.imagePlaceholder,
                { backgroundColor: theme.cardBackground },
              ]}
            >
              <Ionicons
                name="restaurant"
                size={80}
                color={theme.textSecondary}
              />
            </View>
          )}

          <LinearGradient
            colors={["rgba(0,0,0,0.35)", "transparent"]}
            style={styles.imageGradient}
          />

          <Pressable
            style={[styles.backCircle, { top: topPad + 12 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </Pressable>

          <Pressable
            style={[styles.cartCircle, { top: topPad + 12 }]}
            onPress={() => router.push("/(tabs)/cart")}
          >
            <Ionicons name="cart-outline" size={22} color="#FFF" />
          </Pressable>
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              {product.category_name && (
                <Text style={[styles.categoryLabel, { color: colors.primary }]}>
                  {product.category_name}
                </Text>
              )}

              <Text style={[styles.productName, { color: theme.text }]}>
                {product.name}
              </Text>
            </View>

            <Text style={[styles.priceDisplay, { color: colors.primary }]}>
              ${selectedPrice.toFixed(2)}
            </Text>
          </View>

          {product.description && (
            <Text style={[styles.description, { color: theme.textSecondary }]}>
              {product.description}
            </Text>
          )}

          {/* SIZE */}
          <View>
            <Text style={[styles.sectionLabel, { color: theme.text }]}>
              Select Size
            </Text>

            <View style={styles.sizeGrid}>
              {sizes.map((size) => {
                const price = priceMap[size];
                const isSelected = selectedSize === size;

                return (
                  <Pressable
                    key={size}
                    style={[
                      styles.sizeCard,
                      {
                        backgroundColor: theme.cardBackground,
                        borderColor: isSelected ? colors.primary : theme.border,
                      },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedSize(size);
                    }}
                  >
                    <Text
                      style={[
                        styles.sizeName,
                        {
                          color: isSelected
                            ? colors.primary
                            : theme.textSecondary,
                        },
                      ]}
                    >
                      {size}
                    </Text>

                    <Text
                      style={[
                        styles.sizePrice,
                        {
                          color: isSelected
                            ? colors.primary
                            : theme.textSecondary,
                        },
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
            <Text style={[styles.sectionLabel, { color: theme.text }]}>
              Quantity
            </Text>

            <View style={styles.quantityControl}>
              <Pressable
                style={[styles.qtyButton, { backgroundColor: theme.border }]}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Ionicons name="remove" size={20} color={theme.text} />
              </Pressable>

              <Text style={[styles.qtyText, { color: theme.text }]}>{quantity}</Text>

              <Pressable
                style={[styles.qtyButton, { backgroundColor: theme.border }]}
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
      <View
        style={[
          styles.footer,
          {
            paddingBottom: bottomPad + 24,
            backgroundColor: theme.cardBackground,
          },
        ]}
      >
        <View>
          <Text style={[styles.footerTotalLabel, { color: theme.textSecondary }]}>
            Total
          </Text>
          <Text style={[styles.footerTotalAmount, { color: theme.text }]}>
            ${(selectedPrice * quantity).toFixed(2)}
          </Text>
        </View>

        <Pressable
          style={[
            styles.addButton,
            { backgroundColor: added ? colors.success : colors.primary },
          ]}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  errorText: { fontSize: 18, fontWeight: "600", color: colors.text },
  imageContainer: { position: "relative", height: height * 0.42 },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: { alignItems: "center", justifyContent: "center" },
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
  content: { padding: 20, gap: 20 },
  titleRow: { flexDirection: "row", gap: 12 },
  categoryLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase" },
  productName: { fontSize: 26, fontWeight: "800" },
  priceDisplay: { fontSize: 28, fontWeight: "800" },
  description: { fontSize: 15 },
  sectionLabel: { fontSize: 14, fontWeight: "700", marginBottom: 10 },
  sizeGrid: { flexDirection: "row", gap: 10 },
  sizeCard: { flex: 1, alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 2 },
  sizeName: { fontSize: 14, fontWeight: "700" },
  sizePrice: { fontSize: 13 },
  quantityControl: { flexDirection: "row", alignItems: "center" },
  qtyButton: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  qtyText: { fontSize: 20, fontWeight: "800", minWidth: 50, textAlign: "center" },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, flexDirection: "row", alignItems: "center", gap: 16 },
  footerTotalLabel: { fontSize: 11 },
  footerTotalAmount: { fontSize: 22, fontWeight: "800" },
  addButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, paddingVertical: 16 },
  addButtonText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});