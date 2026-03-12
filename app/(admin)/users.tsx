import React, { useState } from "react";
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
  Switch,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import colors from "@/constants/colors";

// -------------------- FETCH USERS --------------------
async function fetchUsers() {
  const res = await fetch("http://10.81.83.70:5000/api/users");
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

// -------------------- DELETE USER --------------------
async function deleteUser(userId: number) {
  const res = await fetch(`http://10.81.83.70:5000/api/users/${userId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete user");
  return res.json();
}

// -------------------- TOGGLE USER ACTIVE --------------------
async function toggleUserStatus(userId: number, isActive: boolean) {
  const res = await fetch(`http://10.81.83.70:5000/api/users/${userId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive }),
  });
  if (!res.ok) throw new Error("Failed to update status");
  return res.json();
}

export default function AdminUsersScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: users = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: number) => deleteUser(userId),
    onSuccess: () => {
      Alert.alert("Success", "User deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: () => Alert.alert("Error", "Failed to delete user"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: number; isActive: boolean }) =>
      toggleUserStatus(userId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: () => Alert.alert("Error", "Failed to update status"),
  });

  const handleToggle = (userId: number, currentStatus: boolean) => {
    toggleMutation.mutate({ userId, isActive: !currentStatus });
  };

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
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
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
              // Handle profile image
              let imageUri = null;
              if (user.profile_image) {
                if (user.profile_image.startsWith("http")) {
                  imageUri = user.profile_image;
                } else if (user.profile_image.startsWith("file://")) {
                  imageUri = user.profile_image;
                } else {
                  imageUri = `http://10.81.83.70:5000${user.profile_image}`;
                }
              }

              const joinDate = new Date(user.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });

              return (
                <View key={user.id} style={styles.userCard}>
                  <View style={styles.userTop}>
                    <View style={styles.avatarContainer}>
                      {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.avatar} />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <Ionicons name="person" size={24} color={colors.primary} />
                        </View>
                      )}
                    </View>

                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{user.full_name}</Text>
                      <Text style={styles.userEmail}>{user.email}</Text>
                    </View>

                    {/* Delete Button */}
                    <Pressable
                      style={[styles.toggleBtn, { backgroundColor: "#FEE2E2" }]}
                      onPress={() => deleteMutation.mutate(user.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
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
                        <Text style={styles.detailText} numberOfLines={1}>
                          {user.address}
                        </Text>
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
                      <Text style={styles.detailText}>Joined {joinDate}</Text>
                    </View>

                    {/* Activate/Deactivate Toggle */}
                    <View style={[styles.detailRow, { marginTop: 6 }]}>
                      <Text style={[styles.detailText, { flex: 0 }]}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Text>
                      <Switch
                        value={user.isActive}
                        onValueChange={() => handleToggle(user.id, user.isActive)}
                        trackColor={{ false: "#ccc", true: colors.primary }}
                        thumbColor="#fff"
                      />
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
  backBtn: {
    marginBottom: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
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
  userTop: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, paddingBottom: 0 },
  avatarContainer: { position: "relative" },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryPale,
    alignItems: "center",
    justifyContent: "center",
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: "700", color: colors.text },
  userEmail: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },
  toggleBtn: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  userDetails: { padding: 14, paddingTop: 10, gap: 6 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  detailText: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  emptyState: { alignItems: "center", paddingTop: 64, gap: 12 },
  emptyText: { fontSize: 16, color: colors.textSecondary },
});