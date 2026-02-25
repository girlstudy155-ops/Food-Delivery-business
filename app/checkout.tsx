import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { fetch } from "expo/fetch";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import colors from "@/constants/colors";
import { useAuth } from "@/contexts/auth";
import { useCart } from "@/contexts/cart";
import { getApiUrl } from "@/lib/query-client";

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const { user, token, isGuest } = useAuth();
  const { items, clearCart } = useCart();
  const params = useLocalSearchParams<{
    coupon_code: string;
    total: string;
    subtotal: string;
    discount: string;
    tax: string;
  }>();

  const [name, setName] = useState(isGuest ? "" : user?.full_name || "");
  const [phone, setPhone] = useState(isGuest ? "" : user?.phone || "");
  const [address, setAddress] = useState(isGuest ? "" : user?.address || "");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Name is required";
    if (!phone.trim()) e.phone = "Phone is required";
    if (!address.trim()) e.address = "Address is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const placeOrder = async () => {
    if (!validate()) return;
    if (items.length === 0) {
      Alert.alert("Empty Cart", "Add items to your cart first");
      return;
    }

    setIsLoading(true);
    try {
      const base = getApiUrl();
      const orderData = {
        user_id: isGuest ? null : user?.id,
        guest_id: isGuest ? user?.full_name : null,
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        notes: notes.trim() || null,
        coupon_code: params.coupon_code || null,
        items: items.map((item) => ({
          product_id: item.product_id,
          name: item.name,
          size: item.size,
          price: item.price,
          quantity: item.quantity,
        })),
      };

      const res = await fetch(`${base}api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(orderData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Order failed");

      // For guests, save to session storage
      if (isGuest) {
        const existing = await AsyncStorage.getItem("guest_orders_session");
        const guestOrders = existing ? JSON.parse(existing) : [];
        guestOrders.unshift(data);
        await AsyncStorage.setItem("guest_orders_session", JSON.stringify(guestOrders));
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      clearCart();

      router.replace({
        pathname: "/order-success",
        params: { order_id: data.id, total: params.total },
      });
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Order Failed", err.message || "Please try again");
    } finally {
      setIsLoading(false);
    }
  };

  const DELIVERY_CHARGE = 2.99;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <LinearGradient
        colors={["#FF4500", "#FF6B35"]}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Delivery Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Information</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={[styles.inputRow, errors.name && styles.inputError]}>
              <Ionicons name="person-outline" size={18} color={errors.name ? colors.error : colors.textLight} />
              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor={colors.textLight}
                value={name}
                onChangeText={setName}
              />
            </View>
            {errors.name && <Text style={styles.fieldError}>{errors.name}</Text>}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={[styles.inputRow, errors.phone && styles.inputError]}>
              <Ionicons name="call-outline" size={18} color={errors.phone ? colors.error : colors.textLight} />
              <TextInput
                style={styles.input}
                placeholder="Your phone"
                placeholderTextColor={colors.textLight}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
            {errors.phone && <Text style={styles.fieldError}>{errors.phone}</Text>}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Delivery Address</Text>
            <View style={[styles.inputRow, styles.textAreaRow, errors.address && styles.inputError]}>
              <Ionicons name="location-outline" size={18} color={errors.address ? colors.error : colors.textLight} style={{ alignSelf: "flex-start", marginTop: 2 }} />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Full delivery address"
                placeholderTextColor={colors.textLight}
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={3}
              />
            </View>
            {errors.address && <Text style={styles.fieldError}>{errors.address}</Text>}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Order Notes (Optional)</Text>
            <View style={[styles.inputRow, styles.textAreaRow]}>
              <Ionicons name="create-outline" size={18} color={colors.textLight} style={{ alignSelf: "flex-start", marginTop: 2 }} />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Special instructions..."
                placeholderTextColor={colors.textLight}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={2}
              />
            </View>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.paymentCard}>
            <View style={styles.paymentIcon}>
              <Ionicons name="cash" size={24} color={colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.paymentTitle}>Cash on Delivery</Text>
              <Text style={styles.paymentSubtitle}>Pay when your order arrives</Text>
            </View>
            <View style={styles.paymentSelected}>
              <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
            </View>
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryCard}>
            {items.map((item) => (
              <View key={`${item.product_id}-${item.size}`} style={styles.orderItem}>
                <Text style={styles.orderItemName} numberOfLines={1}>
                  {item.name} ({item.size})
                </Text>
                <Text style={styles.orderItemQty}>x{item.quantity}</Text>
                <Text style={styles.orderItemPrice}>
                  ${(item.price * item.quantity).toFixed(2)}
                </Text>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>${params.subtotal}</Text>
            </View>
            {parseFloat(params.discount || "0") > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.success }]}>Discount</Text>
                <Text style={[styles.summaryValue, { color: colors.success }]}>-${params.discount}</Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery</Text>
              <Text style={styles.summaryValue}>${DELIVERY_CHARGE.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax</Text>
              <Text style={styles.summaryValue}>${params.tax}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${params.total}</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Place Order */}
      <View style={[styles.footer, { paddingBottom: bottomPad + 20 }]}>
        <Pressable
          style={[styles.orderButton, isLoading && styles.orderButtonDisabled]}
          onPress={placeOrder}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={22} color="#FFF" />
              <Text style={styles.orderButtonText}>Place Order · ${params.total}</Text>
            </>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#FFF" },
  scroll: { flex: 1 },
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
  fieldGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600", color: colors.text },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  textAreaRow: { alignItems: "flex-start", paddingTop: 12 },
  inputError: { borderColor: colors.error },
  input: { flex: 1, fontSize: 14, color: colors.text },
  textArea: { height: 60, textAlignVertical: "top" },
  fieldError: { fontSize: 12, color: colors.error },
  paymentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  paymentIcon: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: "#ECFDF5",
    alignItems: "center", justifyContent: "center",
  },
  paymentTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  paymentSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  paymentSelected: {},
  summaryCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    gap: 8,
  },
  orderItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  orderItemName: { flex: 1, fontSize: 13, color: colors.text, fontWeight: "500" },
  orderItemQty: { fontSize: 12, color: colors.textSecondary },
  orderItemPrice: { fontSize: 13, fontWeight: "700", color: colors.text, minWidth: 50, textAlign: "right" },
  divider: { height: 1, backgroundColor: colors.borderLight, marginVertical: 4 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { fontSize: 13, color: colors.textSecondary },
  summaryValue: { fontSize: 13, color: colors.text, fontWeight: "600" },
  totalRow: { paddingTop: 8, marginTop: 4, borderTopWidth: 1, borderTopColor: colors.border },
  totalLabel: { fontSize: 16, fontWeight: "800", color: colors.text },
  totalValue: { fontSize: 18, fontWeight: "800", color: colors.primary },
  footer: {
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
  orderButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  orderButtonDisabled: { opacity: 0.7 },
  orderButtonText: { color: "#FFF", fontSize: 17, fontWeight: "700" },
});
