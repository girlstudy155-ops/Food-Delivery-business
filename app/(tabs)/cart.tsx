import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  TextInput,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { fetch } from "expo/fetch";
import * as Haptics from "expo-haptics";
import colors from "@/constants/colors";
import { useCart, CartItem } from "@/contexts/cart";
import { getApiUrl } from "@/lib/query-client";

const DELIVERY_CHARGE = 2.99;
const TAX_RATE = 0.08;

function CartItemCard({ item }: { item: CartItem }) {
  const { updateQuantity, removeItem } = useCart();
  const imageUri = item.image?.startsWith("http") ? item.image : item.image ? `${getApiUrl().replace(/\/$/, "")}${item.image}` : null;

  return (
    <View style={styles.cartItem}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.itemImage} resizeMode="cover" />
      ) : (
        <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
          <Ionicons name="restaurant" size={24} color={colors.textLight} />
        </View>
      )}
      <View style={styles.itemContent}>
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.itemSize}>{item.size}</Text>
        <Text style={styles.itemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
      </View>
      <View style={styles.quantityControl}>
        <Pressable
          style={styles.qtyButton}
          onPress={() => { Haptics.selectionAsync(); updateQuantity(item.product_id, item.size, item.quantity - 1); }}
        >
          <Ionicons name={item.quantity === 1 ? "trash-outline" : "remove"} size={16} color={item.quantity === 1 ? colors.error : colors.text} />
        </Pressable>
        <Text style={styles.qty}>{item.quantity}</Text>
        <Pressable
          style={styles.qtyButton}
          onPress={() => { Haptics.selectionAsync(); updateQuantity(item.product_id, item.size, item.quantity + 1); }}
        >
          <Ionicons name="add" size={16} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const { items, subtotal, clearCart } = useCart();
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const discount = appliedCoupon
    ? appliedCoupon.discount_type === "percentage"
      ? subtotal * (parseFloat(appliedCoupon.discount_value) / 100)
      : parseFloat(appliedCoupon.discount_value)
    : 0;

  const tax = (subtotal - discount) * TAX_RATE;
  const total = subtotal - discount + (items.length > 0 ? DELIVERY_CHARGE : 0) + tax;

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError("");
    try {
      const base = getApiUrl();
      const res = await fetch(`${base}api/coupons/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim().toUpperCase(), subtotal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Invalid coupon");
      setAppliedCoupon(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setCouponError(err.message || "Invalid coupon");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
  };

  if (items.length === 0) {
    return (
      <View style={[styles.emptyContainer, { paddingTop: topPad }]}>
        <LinearGradient colors={["#FF4500", "#FF6B35"]} style={[styles.header, { paddingTop: 12 }]}>
          <Text style={styles.headerTitle}>My Cart</Text>
        </LinearGradient>
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="cart-outline" size={64} color={colors.textLight} />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>Add some delicious items to get started</Text>
          <Pressable style={styles.browseButton} onPress={() => router.push("/(tabs)")}>
            <Ionicons name="restaurant-outline" size={18} color="#FFF" />
            <Text style={styles.browseButtonText}>Browse Menu</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <LinearGradient colors={["#FF4500", "#FF6B35"]} style={[styles.header, { paddingTop: 12 }]}>
        <Text style={styles.headerTitle}>My Cart</Text>
        <Text style={styles.headerSubtitle}>{items.length} {items.length === 1 ? "item" : "items"}</Text>
        <Pressable
          style={styles.clearButton}
          onPress={() => {
            Alert.alert("Clear Cart", "Remove all items?", [
              { text: "Cancel", style: "cancel" },
              { text: "Clear", style: "destructive", onPress: clearCart },
            ]);
          }}
        >
          <Ionicons name="trash-outline" size={18} color="rgba(255,255,255,0.85)" />
        </Pressable>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Items */}
        <View style={styles.itemsSection}>
          {items.map((item) => (
            <CartItemCard key={`${item.product_id}-${item.size}`} item={item} />
          ))}
        </View>

        {/* Coupon */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Coupon Code</Text>
          {appliedCoupon ? (
            <View style={styles.appliedCoupon}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.appliedCouponText}>{appliedCoupon.code} applied!</Text>
              <Pressable onPress={removeCoupon}>
                <Ionicons name="close-circle" size={20} color={colors.error} />
              </Pressable>
            </View>
          ) : (
            <View>
              <View style={styles.couponInput}>
                <TextInput
                  style={styles.couponTextField}
                  placeholder="Enter coupon code"
                  placeholderTextColor={colors.textLight}
                  value={couponCode}
                  onChangeText={setCouponCode}
                  autoCapitalize="characters"
                />
                <Pressable
                  style={[styles.couponApply, couponLoading && { opacity: 0.7 }]}
                  onPress={applyCoupon}
                  disabled={couponLoading}
                >
                  {couponLoading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.couponApplyText}>Apply</Text>
                  )}
                </Pressable>
              </View>
              {couponError ? (
                <Text style={styles.couponError}>{couponError}</Text>
              ) : null}
              <Text style={styles.couponHint}>Try: WELCOME20, SAVE5, WEEKEND15</Text>
            </View>
          )}
        </View>

        {/* Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
          </View>
          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.success }]}>Discount</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>-${discount.toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Charge</Text>
            <Text style={styles.summaryValue}>${DELIVERY_CHARGE.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax (8%)</Text>
            <Text style={styles.summaryValue}>${tax.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Checkout Button */}
      <View style={[styles.checkoutContainer, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 90 }]}>
        <Pressable
          style={styles.checkoutButton}
          onPress={() => router.push({ pathname: "/checkout", params: {
            coupon_code: appliedCoupon?.code || "",
            total: total.toFixed(2),
            subtotal: subtotal.toFixed(2),
            discount: discount.toFixed(2),
            tax: tax.toFixed(2),
          }})}
        >
          <Text style={styles.checkoutButtonText}>Place Order</Text>
          <View style={styles.checkoutTotal}>
            <Text style={styles.checkoutTotalText}>${total.toFixed(2)}</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  emptyContainer: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    position: "relative",
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#FFF" },
  headerSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.8)", flex: 1 },
  clearButton: {
    position: "absolute",
    right: 20,
    bottom: 16,
    padding: 6,
  },
  scroll: { flex: 1 },
  itemsSection: { paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  cartItem: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  itemImage: { width: 70, height: 70, borderRadius: 12, backgroundColor: "#F3F4F6" },
  itemImagePlaceholder: { alignItems: "center", justifyContent: "center" },
  itemContent: { flex: 1, gap: 2 },
  itemName: { fontSize: 14, fontWeight: "700", color: colors.text },
  itemSize: { fontSize: 12, color: colors.textSecondary, fontWeight: "500" },
  itemPrice: { fontSize: 15, fontWeight: "800", color: colors.primary },
  quantityControl: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyButton: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: colors.borderLight,
    alignItems: "center", justifyContent: "center",
  },
  qty: { fontSize: 15, fontWeight: "700", color: colors.text, minWidth: 20, textAlign: "center" },
  card: {
    margin: 16,
    marginBottom: 0,
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 14 },
  appliedCoupon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ECFDF5",
    borderRadius: 10,
    padding: 10,
  },
  appliedCouponText: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.success },
  couponInput: { flexDirection: "row", gap: 8 },
  couponTextField: {
    flex: 1,
    backgroundColor: colors.borderLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    fontWeight: "600",
    letterSpacing: 1,
  },
  couponApply: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 70,
  },
  couponApplyText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  couponError: { color: colors.error, fontSize: 12, marginTop: 6 },
  couponHint: { color: colors.textLight, fontSize: 11, marginTop: 6 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  summaryLabel: { fontSize: 14, color: colors.textSecondary },
  summaryValue: { fontSize: 14, color: colors.text, fontWeight: "600" },
  totalRow: {
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: 0,
  },
  totalLabel: { fontSize: 16, fontWeight: "800", color: colors.text },
  totalValue: { fontSize: 20, fontWeight: "800", color: colors.primary },
  checkoutContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  checkoutButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  checkoutButtonText: { fontSize: 17, fontWeight: "700", color: "#FFF" },
  checkoutTotal: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  checkoutTotalText: { fontSize: 16, fontWeight: "800", color: "#FFF" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 12 },
  emptyIconContainer: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: colors.borderLight,
    alignItems: "center", justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 22, fontWeight: "700", color: colors.text },
  emptySubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 20 },
  browseButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  browseButtonText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
});
