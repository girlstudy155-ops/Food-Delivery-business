import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { fetch } from "expo/fetch";
import colors from "@/constants/colors";
import { useAuth } from "@/contexts/auth";
import { getApiUrl } from "@/lib/query-client";

async function fetchUsers(token: string) {
  const base = getApiUrl();
  const res = await fetch(`${base}api/admin/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

async function toggleUser(token: string, userId: number) {
  const base = getApiUrl();
  const res = await fetch(`${base}api/admin/users/${userId}/toggle`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export default function AdminUsersScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: users = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-users", token],
    queryFn: () => fetchUsers(token!),
    enabled: !!token,
  });

  const mutation = useMutation({
    mutationFn: (userId: number) => toggleUser(token!, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
    onError: () => Alert.alert("Error", "Failed to update user"),
  });

  const base = getApiUrl().replace(/\/$/, "");

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#1E293B", "#334155"]}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Users</Text>
        <Text style={styles.count}>{users.length} registered</Text>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
        ) : users.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={colors.textLight} />
            <Text style={styles.emptyText}>No users yet</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {users.map((user: any) => {
              const imageUri = user.profile_image?.startsWith("http")
                ? user.profile_image
                : user.profile_image
                ? `${base}${user.profile_image}`
                : null;
              const joinDate = new Date(user.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });

              return (
                <View key={user.id} style={[styles.userCard, !user.is_active && styles.userCardInactive]}>
                  {!user.is_active && (
                    <View style={styles.inactiveBanner}>
                      <Text style={styles.inactiveBannerText}>Account Deactivated</Text>
                    </View>
                  )}

                  <View style={styles.userTop}>
                    <View style={styles.avatarContainer}>
                      {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.avatar} />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <Ionicons name="person" size={24} color={colors.primary} />
                        </View>
                      )}
                      <View style={[styles.statusDot, { backgroundColor: user.is_active ? colors.success : colors.error }]} />
                    </View>

                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{user.full_name}</Text>
                      <Text style={styles.userEmail}>{user.email}</Text>
                    </View>

                    <Pressable
                      style={[styles.toggleBtn, { backgroundColor: user.is_active ? "#FEF2F2" : "#ECFDF5" }]}
                      onPress={() => mutation.mutate(user.id)}
                      disabled={mutation.isPending}
                    >
                      <Ionicons
                        name={user.is_active ? "ban" : "checkmark-circle"}
                        size={18}
                        color={user.is_active ? colors.error : colors.success}
                      />
                    </Pressable>
                  </View>

                  <View style={styles.userDetails}>
                    {user.phone && (
                      <View style={styles.detailRow}>
                        <Ionicons name="call-outline" size={13} color={colors.textSecondary} />
                        <Text style={styles.detailText}>{user.phone}</Text>
                      </View>
                    )}
                    {user.address && (
                      <View style={styles.detailRow}>
                        <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
                        <Text style={styles.detailText} numberOfLines={1}>{user.address}</Text>
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
                      <Text style={styles.detailText}>Joined {joinDate}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 18, gap: 4 },
  backBtn: { marginBottom: 8, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#FFF" },
  count: { fontSize: 13, color: "rgba(255,255,255,0.7)" },
  scroll: { flex: 1 },
  list: { padding: 16, gap: 12 },
  userCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 4,
  },
  userCardInactive: { opacity: 0.75 },
  inactiveBanner: {
    backgroundColor: colors.error,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  inactiveBannerText: { color: "#FFF", fontSize: 11, fontWeight: "700", textAlign: "center" },
  userTop: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, paddingBottom: 0 },
  avatarContainer: { position: "relative" },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarPlaceholder: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.primaryPale,
    alignItems: "center", justifyContent: "center",
  },
  statusDot: {
    position: "absolute", bottom: 1, right: 1,
    width: 12, height: 12, borderRadius: 6,
    borderWidth: 2, borderColor: "#FFF",
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: "700", color: colors.text },
  userEmail: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },
  toggleBtn: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  userDetails: { padding: 14, paddingTop: 10, gap: 6 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  detailText: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  emptyState: { alignItems: "center", paddingTop: 64, gap: 12 },
  emptyText: { fontSize: 16, color: colors.textSecondary },
});
