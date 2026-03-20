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
  Image,
  Alert,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import colors from "@/constants/colors";
import { LinearGradient } from "expo-linear-gradient";

const API_URL = "https://food-delivery-business-production-00a9.up.railway.app/api/register";

type FormType = {
  full_name: string;
  email: string;
  password: string;
  confirm_password: string;
  address: string;
  phone: string;
};

type ErrorType = Partial<FormType>;

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState<FormType>({
    full_name: "",
    email: "",
    password: "",
    confirm_password: "",
    address: "",
    phone: "",
  });
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [remember, setRemember] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [errors, setErrors] = useState<ErrorType>({});
  const [savedUser, setSavedUser] = useState<any>(null);

  // Load saved user on mount
  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem("rememberUser");
      if (stored) {
        const user = JSON.parse(stored);
        setSavedUser(user);
        setForm({
          full_name: user.full_name || "",
          email: user.email || "",
          password: "",
          confirm_password: "",
          address: user.address || "",
          phone: user.phone || "",
        });
        setProfileImage(user.profile_image || null);
        setRemember(true);
      }
    })();
  }, []);

  const updateForm = (key: keyof FormType, val: string) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const validate = () => {
    const e: ErrorType = {};
    if (!form.full_name.trim()) e.full_name = "Full name required";
    if (!form.email.trim()) e.email = "Email required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!form.password) e.password = "Password required";
    if (form.password !== form.confirm_password)
      e.confirm_password = "Passwords do not match";
    if (!form.address.trim()) e.address = "Address required";
    if (!form.phone.trim()) e.phone = "Phone required";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
  if (!validate()) return;
    if (!remember) {
    Alert.alert("Enable Remember Me", "Please enable Remember Me to create account");
    return;
  }
  setIsLoading(true);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        address: form.address,
        phone: form.phone,
        profile_image: profileImage || "",
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Registration failed");

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // ✅ Remember Me logic
    if (remember) {
      const userToSave = {
        full_name: form.full_name,
        email: form.email,
        address: form.address,
        phone: form.phone,
        profile_image: profileImage || "",
      };
      await AsyncStorage.setItem("rememberUser", JSON.stringify(userToSave));
      setSavedUser(userToSave);
    } else {
      // Agar unchecked ho to user save na ho lekin account backend pe register ho jaye
      await AsyncStorage.removeItem("rememberUser");
      setSavedUser({
        full_name: form.full_name,
        email: form.email,
        address: form.address,
        phone: form.phone,
        profile_image: profileImage || "",
      });
    }

    setSuccessModal(true);
  } catch (err: any) {
    Alert.alert("Registration Failed", err.message);
  } finally {
    setIsLoading(false);
  }
};

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("rememberUser");
          setSavedUser(null);
          setProfileImage(null);
          setForm({
            full_name: "",
            email: "",
            password: "",
            confirm_password: "",
            address: "",
            phone: "",
          });
          setRemember(false);
        },
      },
    ]);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.container, { paddingTop: topPad + 16 }]}
      >
        {/* BACK BUTTON */}
        {!savedUser && (
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
        )}

        {/* SAVED USER CARD */}
        {savedUser ? (
          <>
            <Pressable
              style={styles.savedBackButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </Pressable>
            <LinearGradient
              colors={["#FFF2E5", "#FFD9B3"]}
              start={[0, 0]}
              end={[1, 1]}
              style={styles.savedUserCard}
            >
              <Image
                source={
                  savedUser.profile_image
                    ? { uri: savedUser.profile_image }
                    : require("@/assets/images/icon.png")
                }
                style={styles.savedAvatar}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.savedName}>{savedUser.full_name}</Text>
                <Text style={styles.savedInfo}>Email: {savedUser.email}</Text>
                <Text style={styles.savedInfo}>Phone: {savedUser.phone}</Text>
                <Text style={styles.savedInfo}>Address: {savedUser.address}</Text>

                <Pressable
                  style={[styles.goHomeButton, { backgroundColor: "#FFF", borderWidth: 1, borderColor: "#000" }]}
                  onPress={() => router.replace("/(tabs)")}
                >
                  <Text style={[styles.goHomeText, { color: "#000" }]}>
                    Back to Home
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.goHomeButton, { marginTop: 8, backgroundColor: "#FF6347" }]}
                  onPress={handleLogout}
                >
                  <Text style={styles.goHomeText}>Logout</Text>
                </Pressable>
              </View>
            </LinearGradient>
          </>
        ) : (
          <>
            {/* HEADER & FORM */}
            <View style={styles.header}>
              <View style={styles.iconBadge}>
                <Ionicons name="person-add" size={28} color={colors.primary} />
              </View>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>
                Join FoodRush for the best food experience
              </Text>
            </View>

            {/* PROFILE IMAGE */}
            <View style={styles.profileImageSection}>
              <Pressable onPress={pickImage}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons
                      name="camera-outline"
                      size={28}
                      color={colors.primary}
                    />
                  </View>
                )}
              </Pressable>
            </View>

            {/* FORM FIELDS */}
            <View style={styles.form}>
              <Field
                label="Full Name"
                icon="person-outline"
                value={form.full_name}
                error={errors.full_name}
                placeholder="John Doe"
                onChange={(v) => updateForm("full_name", v)}
              />
              <Field
                label="Email"
                icon="mail-outline"
                value={form.email}
                error={errors.email}
                placeholder="you@example.com"
                keyboardType="email-address"
                onChange={(v) => updateForm("email", v)}
              />
              <PasswordField
                label="Password"
                value={form.password}
                error={errors.password}
                visible={showPassword}
                toggle={() => setShowPassword(!showPassword)}
                onChange={(v) => updateForm("password", v)}
              />
              <PasswordField
                label="Confirm Password"
                value={form.confirm_password}
                error={errors.confirm_password}
                visible={showConfirm}
                toggle={() => setShowConfirm(!showConfirm)}
                onChange={(v) => updateForm("confirm_password", v)}
              />
              <Field
                label="Address"
                icon="location-outline"
                value={form.address}
                error={errors.address}
                placeholder="Your delivery address"
                onChange={(v) => updateForm("address", v)}
              />
              <Field
                label="Phone"
                icon="call-outline"
                value={form.phone}
                error={errors.phone}
                placeholder="+92 300 0000000"
                onChange={(v) => updateForm("phone", v)}
              />

              {/* REMEMBER ME */}
              <Pressable
                style={[styles.rememberRow, { marginTop: 16 }]}
                onPress={() => setRemember(!remember)}
              >
                <Ionicons
                  name={remember ? "checkbox" : "square-outline"}
                  size={22}
                  color={colors.primary}
                />
                <Text style={styles.rememberText}>Remember Me</Text>
              </Pressable>

              {/* REGISTER BUTTON */}
              <Pressable
                style={styles.registerButton}
                onPress={handleRegister}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.registerButtonText}>Create Account</Text>
                  </>
                )}
              </Pressable>
            </View>
          </>
        )}

        {/* SUCCESS MODAL */}
        <Modal visible={successModal} transparent>
          <View style={styles.modalBackground}>
            <View style={styles.modalContent}>
              <Ionicons
                name="checkmark-circle"
                size={80}
                color={colors.success}
              />
              <Text style={styles.modalText}>Registration Successful</Text>
              <Pressable
                style={styles.continueButton}
                onPress={() => router.replace("/(tabs)")}
              >
                <Text style={styles.continueButtonText}>Continue</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Field & PasswordField Components
type FieldProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  error?: string;
  placeholder?: string;
  keyboardType?: any;
  onChange: (v: string) => void;
};

const Field = ({ label, icon, value, error, placeholder, keyboardType, onChange }: FieldProps) => (
  <View style={styles.fieldGroup}>
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.inputRow, error && styles.inputError]}>
      <Ionicons name={icon} size={20} color={error ? colors.error : colors.textLight} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.textLight}
        value={value}
        keyboardType={keyboardType}
        onChangeText={onChange}
      />
    </View>
    {error && <Text style={styles.fieldError}>{error}</Text>}
  </View>
);

type PasswordFieldProps = {
  label: string;
  value: string;
  visible: boolean;
  toggle: () => void;
  error?: string;
  onChange: (v: string) => void;
};

const PasswordField = ({ label, value, visible, toggle, error, onChange }: PasswordFieldProps) => (
  <View style={styles.fieldGroup}>
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.inputRow, error && styles.inputError]}>
      <Ionicons name="lock-closed-outline" size={20} color={colors.textLight} />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={colors.textLight}
        secureTextEntry={!visible}
        value={value}
        onChangeText={onChange}
      />
      <Pressable onPress={toggle}>
        <Ionicons name={visible ? "eye-off" : "eye"} size={20} />
      </Pressable>
    </View>
    {error && <Text style={styles.fieldError}>{error}</Text>}
  </View>
);

// ---------------- STYLES ----------------
const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  header: { marginBottom: 24 },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.primaryPale,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: { fontSize: 28, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 14, color: colors.textSecondary },
  profileImageSection: { alignItems: "center", marginBottom: 24 },
  avatar: { width: 90, height: 90, borderRadius: 45 },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.primaryPale,
    alignItems: "center",
    justifyContent: "center",
  },
  form: { gap: 14 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 14, fontWeight: "600" },
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
  input: { flex: 1, fontSize: 15, color: colors.text },
  inputError: { borderColor: colors.error },
  fieldError: { fontSize: 12, color: colors.error },
  rememberRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  rememberText: { fontSize: 14, color: colors.textSecondary },
  registerButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  registerButtonText: { color: "#FFF", fontSize: 17, fontWeight: "700" },

  // SAVED USER CARD
  savedBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF2E5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: -22,
    alignSelf: "flex-start",
    zIndex: 1,
  },
  savedUserCard: {
    flexDirection: "row",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 32,
  },
  savedAvatar: { width: 90, height: 90, borderRadius: 45 },
  savedName: { fontSize: 18, fontWeight: "700", color: "#000" },
  savedInfo: { color: "#000", fontSize: 14, marginTop: 4 },
  goHomeButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  goHomeText: { fontWeight: "700", fontSize: 16 },

  modalBackground: {
    flex: 1,
    backgroundColor: "#000000aa",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: { backgroundColor: "#fff", padding: 24, borderRadius: 16, alignItems: "center", width: "80%" },
  modalText: { fontSize: 20, fontWeight: "700", marginTop: 16, marginBottom: 16 },
  continueButton: { backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 40, borderRadius: 14 },
  continueButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});