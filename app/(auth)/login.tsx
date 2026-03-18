import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Switch,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const BASE_URL = "https://food-delivery-business-production-00a9.up.railway.app"; // your backend IP

  // ---------------- Auto-login check ----------------
  useEffect(() => {
    const checkRememberedUser = async () => {
      try {
        const user = await AsyncStorage.getItem("rememberUser");
        if (user) {
          const parsedUser = JSON.parse(user);
          // Only redirect if valid role
          if (parsedUser.role === "admin") {
            router.replace("/(admin)");
          } else if (parsedUser.role === "user") {
            router.replace("/(tabs)");
          }
        }
      } catch (err) {
        console.log("Error reading remembered user:", err);
      }
    };
    checkRememberedUser();
  }, []);

  // ---------------- Form validation ----------------
  const validate = () => {
    const e: Record<string, string> = {};
    if (!email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ---------------- Login ----------------
  const handleLogin = async () => {
    if (!validate()) return;

    setIsLoading(true);

    try {
      // Admin login
      if (email.toLowerCase() === "admin@gmail.com" && password === "123") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        if (rememberMe) {
          await AsyncStorage.setItem(
            "rememberUser",
            JSON.stringify({ email: "admin@gmail.com", role: "admin" })
          );
        } else {
          await AsyncStorage.removeItem("rememberUser"); // clear if unchecked
        }

        router.replace("/(admin)");
        return;
      }

      // Normal user login
      const res = await fetch(`${BASE_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors({ general: data.message || "Login failed" });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      await AsyncStorage.setItem("user_id", data.user.id.toString());
      await AsyncStorage.removeItem("guest_id");

      if (rememberMe) {
        await AsyncStorage.setItem(
          "rememberUser",
          JSON.stringify({ ...data.user, role: "user" })
        );
      } else {
        await AsyncStorage.removeItem("rememberUser");
      }

      router.replace("/(tabs)");
    } catch (err: any) {
      console.log("LOGIN ERROR:", err);
      setErrors({ general: "Network or backend error" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.container, { paddingTop: topPad + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button */}
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconBadge}>
            <Ionicons name="flame" size={32} color={colors.primary} />
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue ordering</Text>
        </View>

        {/* General Error */}
        {errors.general && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={colors.error} />
            <Text style={styles.errorBannerText}>{errors.general}</Text>
          </View>
        )}

        {/* Form */}
        <View style={styles.form}>
          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputRow, errors.email && styles.inputError]}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={errors.email ? colors.error : colors.textLight}
              />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.textLight}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            {errors.email && <Text style={styles.fieldError}>{errors.email}</Text>}
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={[styles.inputRow, errors.password && styles.inputError]}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={errors.password ? colors.error : colors.textLight}
              />
              <TextInput
                style={styles.input}
                placeholder="Your password"
                placeholderTextColor={colors.textLight}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={colors.textLight}
                />
              </Pressable>
            </View>
            {errors.password && <Text style={styles.fieldError}>{errors.password}</Text>}
          </View>

          {/* Remember Me */}
          <View style={styles.rememberMeRow}>
            <Switch
              value={rememberMe}
              onValueChange={setRememberMe}
              trackColor={{ true: colors.primary, false: colors.surface }}
              thumbColor={rememberMe ? colors.primary : "#fff"}
            />
            <Text style={styles.rememberMeText}>Remember Me</Text>
          </View>

          {/* Login Button */}
          <Pressable
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="log-in" size={20} color="#FFF" />
                <Text style={styles.loginButtonText}>Sign In</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Register Link */}
        <Pressable
          style={styles.registerLinkContainer}
          onPress={() => router.push("/register")}
        >
          <Text style={styles.registerLinkText}>
            Don't have an account? Please Register
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  header: { marginBottom: 24, alignItems: "center" },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primaryPale,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: { fontSize: 28, fontWeight: "800", color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.textSecondary },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: { color: colors.error, fontSize: 14, flex: 1 },
  form: { gap: 16 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 14, fontWeight: "600", color: colors.text },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  inputError: { borderColor: colors.error },
  input: { flex: 1, fontSize: 15, color: colors.text },
  fieldError: { fontSize: 12, color: colors.error, marginTop: 2 },
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  loginButtonDisabled: { opacity: 0.7 },
  loginButtonText: { color: "#FFF", fontSize: 17, fontWeight: "700" },
  rememberMeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 8 },
  rememberMeText: { color: colors.text, fontSize: 14 },
  registerLinkContainer: { marginTop: 16, alignItems: "center" },
  registerLinkText: { color: colors.primary, fontSize: 14, fontWeight: "600", textDecorationLine: "underline" },
}); 
