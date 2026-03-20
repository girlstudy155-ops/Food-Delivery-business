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
  Image,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import colors from "@/constants/colors";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
// ---------------- TYPES ----------------
type UserType = {
  profile_image: string;
  id?: number;
  name?: string;
  email: string;
  profilePhoto?: string;
  role?: string;
  isLoggedIn?: boolean;
   address?: string; // ✅ add this
};

type ErrorType = {
  email?: string;
  password?: string;
  general?: string;
};

export default function LoginScreen() {
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [errors, setErrors] = useState<ErrorType>({});
  const [user, setUser] = useState<UserType | null>(null); // logged-in user

  const BASE_URL = "https://food-delivery-business-production-00a9.up.railway.app";

  // ---------------- CHECK REMEMBERED USER ----------------
  useEffect(() => {
    const checkUser = async () => {
      const savedUser = await AsyncStorage.getItem("rememberUser");
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    };
    checkUser();
  }, []);
  // ✅ 🔥 ADD THIS HERE (Notification Listener)
   useEffect(() => {
  const subscription = Notifications.addNotificationReceivedListener(notification => {
    console.log("Notification:", notification);

    Alert.alert(
      "Order Update",
      notification.request.content.body || "You have a new update"
    );
  });

  return () => subscription.remove();
}, []);

  // ---------------- FORM VALIDATION ----------------
  const validate = () => {
    const e: ErrorType = {};
    if (!email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    // Remember Me required only for normal users
    if (!rememberMe && email.toLowerCase() !== "admin@gmail.com") e.general = "You must check 'Remember Me' to login";
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  async function registerForPushNotificationsAsync(userId: number) {
  if (!Device.isDevice) {
    alert("Use real device for notifications");
    return;
  }

  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } =
      await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    alert("Permission not granted!");
    return;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;

  console.log("Push Token:", token);

  // 🔥 SEND TOKEN TO BACKEND
  await fetch(`${BASE_URL}/api/save-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId: userId,
      expoPushToken: token,
    }),
  });
}

  // ---------------- LOGIN ----------------
  const handleLogin = async () => {
    if (!validate()) return;

    setIsLoading(true);

    try {
      // ---------------- ADMIN LOGIN ----------------
      if (email.toLowerCase() === "admin@gmail.com" && password === "123") {
        router.replace("/(admin)");
        return;
      }

      // ---------------- USER LOGIN ----------------
      const res = await fetch(`${BASE_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors({ general: data.message || "Login failed" });
        return;
      }

      const loggedUser: UserType = {
        ...data.user,
        role: "user",
        isLoggedIn: true,
        profilePhoto: data.user.profile_image || "https://via.placeholder.com/100",
          address: data.user.address || "", // <-- added this line
      };

      await AsyncStorage.setItem("currentUser", JSON.stringify(loggedUser));
     if (loggedUser.id) {
  await registerForPushNotificationsAsync(loggedUser.id);
}

// Only persist long-term if Remember Me is checked
              if (rememberMe) {
         await AsyncStorage.setItem("rememberUser", JSON.stringify(loggedUser));
           }

      setUser(loggedUser);
       router.replace("/(tabs)"); // <-- This will go to your home/tab page immediately
    } catch (err) {
      console.log("LOGIN ERROR:", err);
      setErrors({ general: "Network or backend error" });
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------- LOGOUT ----------------
  const handleLogout = async () => {
    await AsyncStorage.removeItem("rememberUser");
    setUser(null);
    setEmail("");
    setPassword("");
    setRememberMe(false);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  // ---------------- UI ----------------
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: topPad + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back Button */}
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>

        {/* ---------------- USER INFO AFTER LOGIN ---------------- */}
        {user ? (
          <View style={styles.loggedInContainer}>
            <Text style={styles.alreadyLoggedIn}>You are already logged in</Text>
            <Image
              source={{ uri: user.profile_image || "https://via.placeholder.com/100" }}
              style={styles.profileImage}
            />
            <Text style={styles.userEmail}>{user.email}</Text>
            <View style={styles.actionButtons}>
              <Pressable style={styles.homeButton} onPress={() => router.replace("/(tabs)")}>
                <Ionicons name="home-outline" size={20} color="#FFF" />
                <Text style={styles.buttonText}>Back to Home</Text>
              </Pressable>
              <Pressable style={styles.logoutButton} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color="#FFF" />
                <Text style={styles.buttonText}>Logout</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
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
                <Text style={styles.errorText}>{errors.general}</Text>
              </View>
            )}

            {/* Email */}
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={20} color={colors.textLight} />
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

            {/* Password */}
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textLight} />
              <TextInput
                style={styles.input}
                placeholder="Your password"
                placeholderTextColor={colors.textLight}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
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

            {/* Remember Me */}
            <View style={styles.rememberMeRow}>
              <Switch
                value={rememberMe}
                onValueChange={setRememberMe}
                trackColor={{ true: colors.primary, false: colors.surface }}
                thumbColor={rememberMe ? colors.primary : "#fff"}
              />
              <Text style={styles.rememberMeText}>Remember Me (required)</Text>
            </View>

            {/* Login Button */}
            <Pressable
              style={[styles.loginButton, isLoading && { opacity: 0.7 }]}
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

            {/* Register Link */}
            <Pressable
              style={{ marginTop: 16, alignItems: "center" }}
              onPress={() => router.push("/register")}
            >
              <Text style={styles.registerText}>
                Don't have an account? Please Register
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ---------------- STYLES ----------------
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
    marginBottom: 8,
  },
  input: { flex: 1, fontSize: 15, color: colors.text },
  fieldError: { fontSize: 12, color: colors.error, marginBottom: 8 },

  rememberMeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 8 },
  rememberMeText: { color: colors.text, fontSize: 14 },

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
  loginButtonText: { color: "#FFF", fontSize: 17, fontWeight: "700" },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: colors.error, fontSize: 14, flex: 1 },

  registerText: { color: colors.primary, fontSize: 14, fontWeight: "600", textDecorationLine: "underline" },

  // ---------------- LOGGED-IN USER ----------------
  loggedInContainer: { alignItems: "center", marginTop: 32 },
  profileImage: { width: 100, height: 100, borderRadius: 50, marginVertical: 16 },
  userEmail: { fontSize: 16, fontWeight: "600", color: colors.text },
  alreadyLoggedIn: { fontSize: 14, color: colors.textSecondary, marginBottom: 16 },
  actionButtons: { flexDirection: "row", gap: 16, marginTop: 16 },
  logoutButton: { flexDirection: "row", alignItems: "center", backgroundColor: colors.error, padding: 12, borderRadius: 12, gap: 8 },
  homeButton: { flexDirection: "row", alignItems: "center", backgroundColor: colors.primary, padding: 12, borderRadius: 12, gap: 8 },
  buttonText: { color: "#FFF", fontWeight: "600", fontSize: 14 },
});