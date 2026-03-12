import React, { useEffect, useState } from "react";
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
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import colors from "@/constants/colors";
import { useCart } from "@/contexts/cart";

const { width } = Dimensions.get("window");
const BASE_URL = Platform.OS === "android" ? "http://10.81.83.70:5000/" : "http://localhost:5000/";

// ---------------- HELPERS ----------------
const getProductImage = (product: any) =>
  product.image
    ? product.image.startsWith("http")
      ? product.image
      : BASE_URL.replace(/\/$/, "") + product.image
    : "https://via.placeholder.com/80";

// ----------------- OffersScreen -----------------
export default function OffersScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { addItem } = useCart();

  const [coupons, setCoupons] = useState<any[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(true);

  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // ---------------- FETCH COUPONS ----------------
  const fetchCoupons = async () => {
    try {
      setLoadingCoupons(true);
      const res = await fetch(`${BASE_URL}api/admin/coupons`);
      const data = await res.json();
      setCoupons(data || []);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to fetch coupons");
    } finally {
      setLoadingCoupons(false);
    }
  };

  // ---------------- FETCH FEATURED PRODUCTS ----------------
  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const res = await fetch(`${BASE_URL}api/products?highlighted=true`);
      const data = await res.json();
      setProducts(data || []);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to fetch products");
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
    fetchProducts();
  }, []);

  const handleAddToCart = (product: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addItem({
      product_id: product.id,
      name: product.name,
      image: getProductImage(product),
      size: "Medium",
      price: parseFloat(product.price_medium) || 0,
      quantity: 1,
    });
  };

  const gradients: [string, string][] = [
    ["#FF4500", "#FF6B35"],
    ["#7C3AED", "#A78BFA"],
    ["#059669", "#34D399"],
  ];
  const getGradient = (i: number): [string, string] => gradients[i % gradients.length];

  return (
    <View style={styles.container}>
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

          {loadingCoupons ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
          ) : coupons.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="pricetag-outline" size={48} color={colors.textLight} />
              <Text style={styles.emptyText}>No coupons available</Text>
            </View>
          ) : (
            <View style={styles.couponsContainer}>
              {coupons.map((coupon, i) => (
                <LinearGradient
                  key={coupon.code}
                  colors={getGradient(i)}
                  style={styles.couponCard}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.couponLeft}>
                    <Text style={styles.couponDiscount}>
                      {coupon.discount_type === "percentage"
                        ? `${coupon.discount_value}% OFF`
                        : `$${coupon.discount_value} OFF`}
                    </Text>
                    {coupon.description ? (
                      <Text style={styles.couponDescription}>{coupon.description}</Text>
                    ) : null}
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
          )}
        </View>

        {/* Featured Products */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured Items</Text>

          {loadingProducts ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
          ) : products.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="pricetag-outline" size={48} color={colors.textLight} />
              <Text style={styles.emptyText}>No featured items right now</Text>
            </View>
          ) : (
            products.map((product: any) => (
              <Pressable
                key={product.id}
                style={styles.productRow}
                onPress={() => console.log("Navigate to product", product.id)}
              >
                <Image
                  source={{ uri: getProductImage(product) }}
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

// ---------------- STYLES ----------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { fontSize: 26, fontWeight: "800", color: "#FFF", marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.8)" },
  scroll: { flex: 1 },
  section: { marginTop: 24, paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: 14 },
  couponsContainer: { gap: 12 },
  couponCard: { borderRadius: 18, padding: 18, flexDirection: "row", alignItems: "center", gap: 16, overflow: "hidden", position: "relative" },
  couponLeft: { flex: 1 },
  couponDiscount: { fontSize: 28, fontWeight: "900", color: "#FFF" },
  couponDescription: { fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 2 },
  couponRight: { alignItems: "flex-end", gap: 4 },
  couponCodeBox: { backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.4)", borderStyle: "dashed" },
  couponCodeText: { color: "#FFF", fontSize: 14, fontWeight: "800", letterSpacing: 1 },
  couponApplyText: { color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: "500" },
  couponDivider: { position: "absolute", left: "55%", top: 0, bottom: 0, width: 1, backgroundColor: "rgba(255,255,255,0.2)" },
  productRow: { flexDirection: "row", gap: 14, backgroundColor: "#FFF", borderRadius: 18, overflow: "hidden", marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  productImage: { width: 110, height: 110 },
  productInfo: { flex: 1, padding: 12, justifyContent: "space-between" },
  productBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: colors.primary, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start", marginBottom: 4 },
  productBadgeText: { color: "#FFF", fontSize: 9, fontWeight: "700" },
  productName: { fontSize: 15, fontWeight: "700", color: colors.text },
  productDesc: { fontSize: 12, color: colors.textSecondary, lineHeight: 16 },
  productFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  productPrice: { fontSize: 17, fontWeight: "800", color: colors.primary },
  addButton: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  addButtonText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 16, color: colors.textSecondary, fontWeight: "500" },
});