import React, { useState } from "react";
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
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import colors from "@/constants/colors";
import { useAuth } from "@/contexts/auth";
import { useCart } from "@/contexts/cart";

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const { clearCart } = useCart();

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    confirm_password: "",
    address: "",
    phone: "",
    remember_me: false,
  });
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateForm = (key: string, val: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setProfileImage(result.assets[0].uri);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.full_name.trim()) e.full_name = "Full name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 6) e.password = "Minimum 6 characters";
    if (form.password !== form.confirm_password) e.confirm_password = "Passwords do not match";
    if (!form.address.trim()) e.address = "Address is required";
    if (!form.phone.trim()) e.phone = "Phone number is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      clearCart();
      await register({
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        address: form.address.trim(),
        phone: form.phone.trim(),
        remember_me: form.remember_me,
        profile_image_uri: profileImage || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrors({ general: err.message || "Registration failed" });
    } finally {
      setIsLoading(false);
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const Field = ({
    label,
    icon,
    fieldKey,
    ...props
  }: {
    label: string;
    icon: string;
    fieldKey: string;
    [key: string]: any;
  }) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, errors[fieldKey] && styles.inputError]}>
        <Ionicons name={icon as any} size={20} color={errors[fieldKey] ? colors.error : colors.textLight} />
        <TextInput
          style={[styles.input, props.multiline && { height: 70, textAlignVertical: "top" }]}
          placeholderTextColor={colors.textLight}
          value={form[fieldKey as keyof typeof form] as string}
          onChangeText={(v) => updateForm(fieldKey, v)}
          {...props}
        />
      </View>
      {errors[fieldKey] && <Text style={styles.fieldError}>{errors[fieldKey]}</Text>}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.container, { paddingTop: topPad + 16 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>

        <View style={styles.header}>
          <View style={styles.iconBadge}>
            <Ionicons name="person-add" size={28} color={colors.primary} />
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join FoodRush for the best food experience</Text>
        </View>

        {errors.general ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={colors.error} />
            <Text style={styles.errorBannerText}>{errors.general}</Text>
          </View>
        ) : null}

        {/* Profile Image */}
        <View style={styles.profileImageSection}>
          <Pressable style={styles.avatarButton} onPress={pickImage}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="camera-outline" size={28} color={colors.primary} />
              </View>
            )}
            <View style={styles.avatarBadge}>
              <Ionicons name="camera" size={14} color="#FFF" />
            </View>
          </Pressable>
          <Text style={styles.avatarHint}>Profile photo (optional)</Text>
        </View>

        <View style={styles.form}>
          <Field label="Full Name" icon="person-outline" fieldKey="full_name" placeholder="John Doe" />
          <Field label="Email" icon="mail-outline" fieldKey="email" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
          
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={[styles.inputRow, errors.password && styles.inputError]}>
              <Ionicons name="lock-closed-outline" size={20} color={errors.password ? colors.error : colors.textLight} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Min 6 characters"
                placeholderTextColor={colors.textLight}
                value={form.password}
                onChangeText={(v) => updateForm("password", v)}
                secureTextEntry={!showPassword}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textLight} />
              </Pressable>
            </View>
            {errors.password && <Text style={styles.fieldError}>{errors.password}</Text>}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={[styles.inputRow, errors.confirm_password && styles.inputError]}>
              <Ionicons name="lock-closed-outline" size={20} color={errors.confirm_password ? colors.error : colors.textLight} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Repeat password"
                placeholderTextColor={colors.textLight}
                value={form.confirm_password}
                onChangeText={(v) => updateForm("confirm_password", v)}
                secureTextEntry={!showConfirm}
              />
              <Pressable onPress={() => setShowConfirm(!showConfirm)} hitSlop={8}>
                <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textLight} />
              </Pressable>
            </View>
            {errors.confirm_password && <Text style={styles.fieldError}>{errors.confirm_password}</Text>}
          </View>

          <Field label="Address" icon="location-outline" fieldKey="address" placeholder="Your delivery address" multiline numberOfLines={2} />
          <Field label="Phone Number" icon="call-outline" fieldKey="phone" placeholder="+1 234 567 8900" keyboardType="phone-pad" />

          {/* Remember Me */}
          <Pressable
            style={styles.checkboxRow}
            onPress={() => { updateForm("remember_me", !form.remember_me); Haptics.selectionAsync(); }}
          >
            <View style={[styles.checkbox, form.remember_me && styles.checkboxActive]}>
              {form.remember_me && <Ionicons name="checkmark" size={14} color="#FFF" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.checkboxLabel}>Remember Me</Text>
              <Text style={styles.checkboxSub}>Don't register another account on this device</Text>
            </View>
          </Pressable>

          <Pressable
            style={[styles.registerButton, isLoading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                <Text style={styles.registerButtonText}>Create Account</Text>
              </>
            )}
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Pressable onPress={() => router.replace("/(auth)/login")}>
            <Text style={styles.footerLink}>Sign In</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  backButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
  },
  header: { marginBottom: 24 },
  iconBadge: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: colors.primaryPale,
    alignItems: "center", justifyContent: "center", marginBottom: 14,
  },
  title: { fontSize: 28, fontWeight: "800", color: colors.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: colors.textSecondary },
  errorBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#FEF2F2", borderRadius: 12, padding: 12, marginBottom: 16,
  },
  errorBannerText: { color: colors.error, fontSize: 14, flex: 1 },
  profileImageSection: { alignItems: "center", marginBottom: 24 },
  avatarButton: { position: "relative" },
  avatar: { width: 90, height: 90, borderRadius: 45 },
  avatarPlaceholder: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: colors.primaryPale,
    borderWidth: 2, borderColor: colors.primary,
    borderStyle: "dashed",
    alignItems: "center", justifyContent: "center",
  },
  avatarBadge: {
    position: "absolute", bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#FFF",
  },
  avatarHint: { fontSize: 12, color: colors.textLight, marginTop: 8 },
  form: { gap: 14 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 14, fontWeight: "600", color: colors.text },
  inputRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: colors.surface, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 14,
    borderWidth: 1.5, borderColor: colors.border,
  },
  inputError: { borderColor: colors.error },
  input: { flex: 1, fontSize: 15, color: colors.text },
  fieldError: { fontSize: 12, color: colors.error, marginTop: 2 },
  checkboxRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    backgroundColor: colors.surface, borderRadius: 14,
    padding: 14, borderWidth: 1.5, borderColor: colors.border,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
    marginTop: 2,
  },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxLabel: { fontSize: 14, fontWeight: "600", color: colors.text },
  checkboxSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  registerButton: {
    backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 17,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    marginTop: 8,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14, elevation: 10,
  },
  buttonDisabled: { opacity: 0.7 },
  registerButtonText: { color: "#FFF", fontSize: 17, fontWeight: "700" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  footerText: { fontSize: 15, color: colors.textSecondary },
  footerLink: { fontSize: 15, color: colors.primary, fontWeight: "700" },
});
