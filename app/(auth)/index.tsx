import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors from "@/constants/colors";
import { useAuth } from "@/contexts/auth";
import * as Haptics from "expo-haptics";

const { width, height } = Dimensions.get("window");

function AnimatedButton({ onPress, style, children }: { onPress: () => void; style: any; children: React.ReactNode }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[animStyle, style]}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.95); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        onPress={onPress}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { continueAsGuest } = useAuth();

  const handleGuest = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await continueAsGuest();
    router.replace("/(tabs)");
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad + 24 }]}>
      <LinearGradient
        colors={["#FF4500", "#FF6B35"]}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.logoCircle}>
            <Ionicons name="flame" size={48} color="#FF4500" />
          </View>
          <Text style={styles.headerTitle}>FoodRush</Text>
          <Text style={styles.headerSubtitle}>Order food you love</Text>
        </View>

        <View style={styles.floatingCards}>
          {[
            { icon: "pizza", label: "Pizza" },
            { icon: "fast-food", label: "Burgers" },
            { icon: "restaurant", label: "Sushi" },
          ].map((item, i) => (
            <View key={i} style={[styles.foodCard, { transform: [{ rotate: `${i % 2 === 0 ? -3 : 3}deg` }] }]}>
              <Ionicons name={item.icon as any} size={24} color={colors.primary} />
              <Text style={styles.foodCardLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <View style={styles.bottomSheet}>
        <View style={styles.handle} />

        <Text style={styles.welcomeText}>Welcome back!</Text>
        <Text style={styles.subText}>Sign in or create an account to start ordering</Text>

        <Pressable
          style={styles.primaryButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/(auth)/login");
          }}
        >
          <Ionicons name="log-in-outline" size={20} color="#FFF" />
          <Text style={styles.primaryButtonText}>Sign In</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/(auth)/register");
          }}
        >
          <Ionicons name="person-add-outline" size={20} color={colors.primary} />
          <Text style={styles.secondaryButtonText}>Create Account</Text>
        </Pressable>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable style={styles.guestButton} onPress={handleGuest}>
          <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.guestButtonText}>Continue as Guest</Text>
        </Pressable>

        <Text style={styles.terms}>By continuing, you agree to our Terms of Service</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FF4500" },
  headerGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    minHeight: height * 0.42,
  },
  headerContent: { alignItems: "center", marginBottom: 24 },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
    fontWeight: "500",
  },
  floatingCards: {
    flexDirection: "row",
    gap: 12,
  },
  foodCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  foodCardLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text,
  },
  bottomSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 28,
    paddingTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 16,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  subText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 28,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: colors.primaryPale,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 20,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "700",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textLight,
    fontSize: 14,
  },
  guestButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 20,
  },
  guestButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "600",
  },
  terms: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: "center",
    lineHeight: 18,
  },
});
