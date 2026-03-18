import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { router } from "expo-router";
import { useAuth } from "@/contexts/auth";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import colors from "@/constants/colors";

const { width, height } = Dimensions.get("window");

export default function SplashScreen() {
  const { user, isLoading } = useAuth();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.6);
  const textOpacity = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);

  const navigate = () => {
    if (user) {
      if (user.role === "admin") {
        router.replace("/(admin)");
      } else {
        router.replace("/(tabs)");
      }
    } else {
      router.replace("/(auth)");
    }
  };

  useEffect(() => {
    if (isLoading) return;

    opacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) });
    scale.value = withSequence(
      withTiming(1.15, { duration: 500, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: 200 })
    );
    textOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));
    taglineOpacity.value = withDelay(700, withTiming(1, { duration: 500 }));

    const timer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 400 }, (finished) => {
        if (finished) runOnJS(navigate)();
      });
    }, 2600);

    return () => clearTimeout(timer);
  }, [isLoading]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  return (
    <LinearGradient colors={["#FF4500", "#FF6B35", "#FFB347"]} style={styles.container}>
      <Animated.View style={[styles.logoContainer, logoStyle]}>
        <View style={styles.logoCircle}>
          <Ionicons name="flame" size={64} color="#FF4500" />
        </View>
      </Animated.View>
      <Animated.View style={[styles.textContainer, textStyle]}>
        <Text style={styles.appName}>FoodRush</Text>
      </Animated.View>
      <Animated.View style={[styles.taglineContainer, taglineStyle]}>
        <Text style={styles.tagline}>Delicious food, delivered fast</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  textContainer: {
    marginBottom: 8,
  },
  appName: {
    fontSize: 42,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  taglineContainer: {},
  tagline: {
    fontSize: 16,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "500",
    letterSpacing: 0.5,
  },
});
