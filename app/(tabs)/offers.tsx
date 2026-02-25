import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  Platform,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { fetch } from "expo/fetch";
import * as Haptics from "expo-haptics";
import colors from "@/constants/colors";
import { useCart } from "@/contexts/cart";
import { getApiUrl } from "@/lib/query-client";

const { width } = Dimensions.get("window");

async function fetchHighlighted() {
  const base = getApiUrl();
  const res = await fetch(`${base}api/products?highlighted=true`);
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

async function fetchCoupons() {
  const base = getApiUrl();
  const res = await fetch(`${base}api/coupons/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "WELCOME20" }),
  });
  return null; // just to get the coupon codes displayed differently
}

const COUPONS = [
  { code: "WELCOME20", discount: "20% OFF", description: "First order - min $15", color: ["#FF4500", "#FF6B35"] as [string, string] },
  { code: "SAVE5", discount: "$5 OFF", description: "Any order above $25", color: ["#7C3AED", "#A78BFA"] as [string, string] },
  { code: "WEEKEND15", discount: "15% OFF", description: "Weekend special - min $10", color: ["#059669", "#34D399"] as [string, string] },
];

export default function OffersScreen() {
  const insets = useSafeAreaInsets();
  const { addItem } = useCart();

  const productsQuery = useQuery({
    queryKey: ["products-highlighted"],
    queryFn: fetchHighlighted,
  });

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleAddToCart = (product: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addItem({
      product_id: product.id,
      name: product.name,
      image: product.image,
      size: "Medium",
      price: parseFloat(product.price_medium),
      quantity: 1,
    });
  };

  return (
    <View style={[styles.container]}>
      <LinearGradient
        colors={["#FF4500", "#FF6B35"]}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <Text style={styles.headerTitle}>Offers & Deals</Text>
        <Text style={styles.headerSubtitle}>Exclusive discounts just for you</Text>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Coupon Codes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coupon Codes</Text>
          <View style={styles.couponsContainer}>
            {COUPONS.map((coupon) => (
              <LinearGradient
                key={coupon.code}
                colors={coupon.color}
                style={styles.couponCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.couponLeft}>
                  <Text style={styles.couponDiscount}>{coupon.discount}</Text>
                  <Text style={styles.couponDescription}>{coupon.description}</Text>
                </View>
                <View style={styles.couponRight}>
                  <View style={styles.couponCodeBox}>
                    <Text style={styles.couponCodeText}>{coupon.code}</Text>
                  </View>
                  <Text style={styles.couponApplyText}>Use at checkout</Text>
                </View>
                <View style={styles.couponDivider} />
              </LinearGradient>
            ))}
          </View>
        </View>

        {/* Featured Products */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured Items</Text>
          {productsQuery.isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
          ) : (productsQuery.data || []).length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="pricetag-outline" size={48} color={colors.textLight} />
              <Text style={styles.emptyText}>No featured items right now</Text>
            </View>
          ) : (
            (productsQuery.data || []).map((product: any) => (
              <Pressable
                key={product.id}
                style={styles.productRow}
                onPress={() => router.push({ pathname: "/product/[id]", params: { id: product.id } })}
              >
                <Image
                  source={{ uri: product.image || "https://via.placeholder.com/80" }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
                <View style={styles.productInfo}>
                  <View style={styles.productBadge}>
                    <Ionicons name="star" size={10} color="#FFF" />
                    <Text style={styles.productBadgeText}>Featured</Text>
                  </View>
                  <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                  <Text style={styles.productDesc} numberOfLines={2}>{product.description || ""}</Text>
                  <View style={styles.productFooter}>
                    <Text style={styles.productPrice}>${parseFloat(product.price_medium).toFixed(2)}</Text>
                    <Pressable
                      style={styles.addButton}
                      onPress={() => handleAddToCart(product)}
                    >
                      <Ionicons name="cart-outline" size={14} color="#FFF" />
                      <Text style={styles.addButtonText}>Add</Text>
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: { fontSize: 26, fontWeight: "800", color: "#FFF", marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.8)" },
  scroll: { flex: 1 },
  section: { marginTop: 24, paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: 14 },
  couponsContainer: { gap: 12 },
  couponCard: {
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    overflow: "hidden",
    position: "relative",
  },
  couponLeft: { flex: 1 },
  couponDiscount: { fontSize: 28, fontWeight: "900", color: "#FFF" },
  couponDescription: { fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 2 },
  couponRight: { alignItems: "flex-end", gap: 4 },
  couponCodeBox: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    borderStyle: "dashed",
  },
  couponCodeText: { color: "#FFF", fontSize: 14, fontWeight: "800", letterSpacing: 1 },
  couponApplyText: { color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: "500" },
  couponDivider: {
    position: "absolute",
    left: "55%",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  productRow: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: "#FFF",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  productImage: { width: 110, height: 110 },
  productInfo: { flex: 1, padding: 12, justifyContent: "space-between" },
  productBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  productBadgeText: { color: "#FFF", fontSize: 9, fontWeight: "700" },
  productName: { fontSize: 15, fontWeight: "700", color: colors.text },
  productDesc: { fontSize: 12, color: colors.textSecondary, lineHeight: 16 },
  productFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  productPrice: { fontSize: 17, fontWeight: "800", color: colors.primary },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addButtonText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 16, color: colors.textSecondary, fontWeight: "500" },
});
