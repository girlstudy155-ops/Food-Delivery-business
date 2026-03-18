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
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import colors from "@/constants/colors";
import { useAuth } from "@/contexts/auth";
import { useCart } from "@/contexts/cart";
import { getApiUrl } from "@/lib/query-client";
import { useTheme } from "@/contexts/ThemeContext";

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const { user, token, isGuest } = useAuth();
  const { items, clearCart } = useCart();
  const params = useLocalSearchParams<{
    coupon_code?: string;
    total: string;
    subtotal?: string;
    discount?: string;
    tax?: string;
  }>();
  const { theme } = useTheme();

  const [name, setName] = useState(isGuest ? "" : user?.full_name || "");
  const [phone, setPhone] = useState(isGuest ? "" : user?.phone || "");
  const [address, setAddress] = useState(isGuest ? "" : user?.address || "");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const DELIVERY_CHARGE = 2.99;

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

      let userId: string | null = null;
      let guestId: string | null = null;

      if (user && user.id) {
        userId = user.id.toString();
      } else {
        // Guest logic
        const storedGuest = await AsyncStorage.getItem("guest");
        let guestData = storedGuest ? JSON.parse(storedGuest) : null;

        if (!guestData) {
          guestId = `guest_${Date.now()}`;
          guestData = { id: guestId };
          await AsyncStorage.setItem("guest", JSON.stringify(guestData));
        } else {
          guestId = guestData.id;
        }
      }

      const orderData = {
        user_id: userId,
        guest_id: guestId,
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

      // Save guest order in AsyncStorage
      if (isGuest) {
        const existing = await AsyncStorage.getItem("guest_orders_session");
        const guestOrders = existing ? JSON.parse(existing) : [];
        guestOrders.unshift({
          id: data.id,
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          notes: notes.trim() || null,
          items: orderData.items,
          total: params.total,
          date: new Date().toISOString(),
        });
        await AsyncStorage.setItem(
          "guest_orders_session",
          JSON.stringify(guestOrders)
        );
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
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
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Delivery Information
          </Text>

          {/* Name */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Full Name</Text>
            <View
              style={[
                styles.inputRow,
                errors.name && styles.inputError,
                { backgroundColor: theme.cardBackground, borderColor: errors.name ? colors.error : theme.border },
              ]}
            >
              <Ionicons
                name="person-outline"
                size={18}
                color={errors.name ? colors.error : theme.textSecondary}
              />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Your name"
                placeholderTextColor={theme.textSecondary}
                value={name}
                onChangeText={setName}
              />
            </View>
            {errors.name && (
              <Text style={[styles.fieldError, { color: colors.error }]}>{errors.name}</Text>
            )}
          </View>

          {/* Phone */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Phone Number</Text>
            <View
              style={[
                styles.inputRow,
                errors.phone && styles.inputError,
                { backgroundColor: theme.cardBackground, borderColor: errors.phone ? colors.error : theme.border },
              ]}
            >
              <Ionicons
                name="call-outline"
                size={18}
                color={errors.phone ? colors.error : theme.textSecondary}
              />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Your phone"
                placeholderTextColor={theme.textSecondary}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
            {errors.phone && (
              <Text style={[styles.fieldError, { color: colors.error }]}>{errors.phone}</Text>
            )}
          </View>

          {/* Address */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Delivery Address</Text>
            <View
              style={[
                styles.inputRow,
                styles.textAreaRow,
                errors.address && styles.inputError,
                { backgroundColor: theme.cardBackground, borderColor: errors.address ? colors.error : theme.border },
              ]}
            >
              <Ionicons
                name="location-outline"
                size={18}
                color={errors.address ? colors.error : theme.textSecondary}
                style={{ alignSelf: "flex-start", marginTop: 2 }}
              />
              <TextInput
                style={[styles.input, styles.textArea, { color: theme.text }]}
                placeholder="Full delivery address"
                placeholderTextColor={theme.textSecondary}
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={3}
              />
            </View>
            {errors.address && (
              <Text style={[styles.fieldError, { color: colors.error }]}>{errors.address}</Text>
            )}
          </View>

          {/* Notes */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Order Notes (Optional)</Text>
            <View
              style={[
                styles.inputRow,
                styles.textAreaRow,
                { backgroundColor: theme.cardBackground, borderColor: theme.border },
              ]}
            >
              <Ionicons
                name="create-outline"
                size={18}
                color={theme.textSecondary}
                style={{ alignSelf: "flex-start", marginTop: 2 }}
              />
              <TextInput
                style={[styles.input, styles.textArea, { color: theme.text }]}
                placeholder="Special instructions..."
                placeholderTextColor={theme.textSecondary}
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
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Payment Method</Text>
          <View
            style={[styles.paymentCard, { backgroundColor: theme.cardBackground, borderColor: colors.primary }]}
          >
            <View style={[styles.paymentIcon, { backgroundColor: theme.successBackground || "#ECFDF5" }]}>
              <Ionicons name="cash" size={24} color={colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.paymentTitle, { color: theme.text }]}>Cash on Delivery</Text>
              <Text style={[styles.paymentSubtitle, { color: theme.textSecondary }]}>
                Pay when your order arrives
              </Text>
            </View>
            <View style={styles.paymentSelected}>
              <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
            </View>
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Order Summary</Text>
          <View style={[styles.summaryCard, { backgroundColor: theme.cardBackground }]}>
            {items.map((item) => (
              <View key={`${item.product_id}-${item.size}`} style={styles.orderItem}>
                <Text style={[styles.orderItemName, { color: theme.text }]}>{item.name} ({item.size})</Text>
                <Text style={[styles.orderItemQty, { color: theme.textSecondary }]}>x{item.quantity}</Text>
                <Text style={[styles.orderItemPrice, { color: theme.text }]}>${(item.price * item.quantity).toFixed(2)}</Text>
              </View>
            ))}
            <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Subtotal</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>{params.subtotal || "0.00"}</Text>
            </View>
            {parseFloat(params.discount || "0") > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.success }]}>Discount</Text>
                <Text style={[styles.summaryValue, { color: colors.success }]}>-${params.discount}</Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Delivery</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>{DELIVERY_CHARGE.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Tax</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>{params.tax || "0.00"}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={[styles.totalLabel, { color: theme.text }]}>Total</Text>
              <Text style={[styles.totalValue, { color: colors.primary }]}>${params.total}</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: bottomPad + 20, backgroundColor: theme.cardBackground }]}>
        <Pressable
          style={[styles.orderButton, { backgroundColor: colors.primary }, isLoading && styles.orderButtonDisabled]}
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
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#FFF" },
  scroll: { flex: 1 },
  section: { paddingHorizontal: 16, paddingTop: 20, gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "800" },
  fieldGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600" },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, borderWidth: 1.5 },
  textAreaRow: { alignItems: "flex-start", paddingTop: 12 },
  inputError: { borderColor: colors.error },
  input: { flex: 1, fontSize: 14 },
  textArea: { height: 60, textAlignVertical: "top" },
  fieldError: { fontSize: 12 },
  paymentCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, padding: 14, borderWidth: 2 },
  paymentIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  paymentTitle: { fontSize: 15, fontWeight: "700" },
  paymentSubtitle: { fontSize: 12, marginTop: 2 },
  paymentSelected: {},
  summaryCard: { borderRadius: 16, padding: 14, gap: 8 },
  orderItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  orderItemName: { flex: 1, fontSize: 13, fontWeight: "500" },
  orderItemQty: { fontSize: 12 },
  orderItemPrice: { fontSize: 13, fontWeight: "700", minWidth: 50, textAlign: "right" },
  divider: { height: 1, marginVertical: 4 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 13, fontWeight: "600" },
  totalRow: { paddingTop: 8, marginTop: 4, borderTopWidth: 1 },
  totalLabel: { fontSize: 16, fontWeight: "800" },
  totalValue: { fontSize: 18, fontWeight: "800" },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 12 },
  orderButton: { borderRadius: 16, paddingVertical: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  orderButtonDisabled: { opacity: 0.7 },
  orderButtonText: { color: "#FFF", fontSize: 17, fontWeight: "700" },
});