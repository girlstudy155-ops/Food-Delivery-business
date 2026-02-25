import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  withSpring,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import colors from "@/constants/colors";

export default function OrderSuccessScreen() {
  const insets = useSafeAreaInsets();
  const { order_id, total } = useLocalSearchParams<{ order_id: string; total: string }>();

  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const btnOpacity = useSharedValue(0);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    scale.value = withSequence(
      withSpring(1.2, { damping: 8 }),
      withSpring(1, { damping: 12 })
    );
    opacity.value = withTiming(1, { duration: 400 });
    textOpacity.value = withDelay(500, withTiming(1, { duration: 400 }));
    btnOpacity.value = withDelay(900, withTiming(1, { duration: 400 }));
  }, []);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({ opacity: textOpacity.value }));
  const btnStyle = useAnimatedStyle(() => ({ opacity: btnOpacity.value }));

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <LinearGradient colors={["#FAFAFA", "#FFF0EB"]} style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad + 24 }]}>
      <View style={styles.content}>
        <Animated.View style={[styles.checkContainer, checkStyle]}>
          <LinearGradient colors={["#FF4500", "#FF6B35"]} style={styles.checkGradient}>
            <Ionicons name="checkmark" size={60} color="#FFF" />
          </LinearGradient>
        </Animated.View>

        <Animated.View style={[styles.textSection, textStyle]}>
          <Text style={styles.title}>Order Placed!</Text>
          <Text style={styles.subtitle}>Your delicious food is being prepared</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="receipt-outline" size={18} color={colors.primary} />
              <Text style={styles.infoLabel}>Order ID</Text>
              <Text style={styles.infoValue}>#{order_id}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Ionicons name="cash-outline" size={18} color={colors.success} />
              <Text style={styles.infoLabel}>Total</Text>
              <Text style={styles.infoValue}>${total}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Ionicons name="card-outline" size={18} color={colors.info} />
              <Text style={styles.infoLabel}>Payment</Text>
              <Text style={styles.infoValue}>Cash on Delivery</Text>
            </View>
          </View>

          <View style={styles.stepsContainer}>
            {[
              { icon: "checkmark-circle", label: "Order Confirmed", done: true },
              { icon: "restaurant", label: "Preparing", done: false },
              { icon: "bicycle", label: "Out for Delivery", done: false },
              { icon: "home", label: "Delivered", done: false },
            ].map((step, i) => (
              <View key={i} style={styles.step}>
                <Ionicons
                  name={step.icon as any}
                  size={18}
                  color={step.done ? colors.success : colors.textLight}
                />
                <Text style={[styles.stepLabel, step.done && { color: colors.success, fontWeight: "600" }]}>
                  {step.label}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View style={[styles.buttons, btnStyle]}>
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.replace("/(tabs)/orders")}
          >
            <Ionicons name="receipt" size={18} color="#FFF" />
            <Text style={styles.primaryButtonText}>Track Order</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.replace("/(tabs)")}
          >
            <Text style={styles.secondaryButtonText}>Continue Shopping</Text>
          </Pressable>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 24,
  },
  checkContainer: {},
  checkGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  textSection: { alignItems: "center", gap: 12, width: "100%" },
  title: { fontSize: 30, fontWeight: "900", color: colors.text, textAlign: "center" },
  subtitle: { fontSize: 15, color: colors.textSecondary, textAlign: "center" },
  infoCard: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 16,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    marginTop: 4,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoLabel: { flex: 1, fontSize: 13, color: colors.textSecondary, fontWeight: "500" },
  infoValue: { fontSize: 13, fontWeight: "700", color: colors.text },
  infoDivider: { height: 1, backgroundColor: colors.borderLight, marginVertical: 10 },
  stepsContainer: { flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "center" },
  step: { alignItems: "center", gap: 4 },
  stepLabel: { fontSize: 10, color: colors.textLight, fontWeight: "500", textAlign: "center", maxWidth: 60 },
  buttons: { gap: 10, width: "100%" },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
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
  primaryButtonText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  secondaryButton: {
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: "#FFF",
  },
  secondaryButtonText: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
});
