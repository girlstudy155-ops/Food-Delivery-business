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
import colors from "@/constants/colors";

// -------------------- FETCH USERS --------------------
async function fetchUsers() {
  const res = await fetch(
    "https://food-delivery-business-production-00a9.up.railway.app/api/users"
  );
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

// -------------------- DELETE USER --------------------
async function deleteUser(userId: number) {
  const res = await fetch(
    `https://food-delivery-business-production-00a9.up.railway.app/api/users/${userId}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error("Failed to delete user");
  return res.json();
}

// -------------------- TOGGLE STATUS --------------------
async function toggleUserStatus(userId: number, currentStatus: boolean) {
  const newStatus = !currentStatus;
  const res = await fetch(
    `https://food-delivery-business-production-00a9.up.railway.app/api/users/${userId}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: newStatus }),
    }
  );
  if (!res.ok) throw new Error("Failed to update status");
  return { userId, isActive: newStatus };
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
    mutationFn: ({
      userId,
      currentStatus,
    }: {
      userId: number;
      currentStatus: boolean;
    }) => toggleUserStatus(userId, currentStatus),

    onMutate: async ({ userId, currentStatus }) => {
      await queryClient.cancelQueries({ queryKey: ["users"] });

      const previousUsers = queryClient.getQueryData<any[]>(["users"]);

      queryClient.setQueryData(["users"], (old: any[]) =>
        old?.map((u) =>
          u.id === userId ? { ...u, isActive: !currentStatus } : u
        )
      );

      return { previousUsers };
    },

    onError: (_err, _variables, context: any) => {
      queryClient.setQueryData(["users"], context.previousUsers);
      Alert.alert("Error", "Failed to update status");
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const handleToggle = (userId: number, currentStatus: boolean) => {
    toggleMutation.mutate({ userId, currentStatus });
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
              let imageUri = null;

              if (user.profile_image) {
                if (
                  user.profile_image.startsWith("http") ||
                  user.profile_image.startsWith("file://")
                ) {
                  imageUri = user.profile_image;
                } else {
                  imageUri = `https://food-delivery-business-production-00a9.up.railway.app${user.profile_image}`;
                }
              }

              const joinDate = new Date(user.created_at).toLocaleDateString(
                "en-US",
                {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }
              );

              return (
                <View
                  key={user.id}
                  style={[
                    styles.userCard,
                    !user.isActive && styles.inactiveCard,
                  ]}
                >
                  {/* TOP */}
                  <View style={styles.userTop}>
                    <View style={styles.avatarContainer}>
                      {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.avatar} />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <Ionicons name="person" size={24} color={colors.primary} />
                        </View>
                      )}

                      {user.isActive && <View style={styles.onlineDot} />}
                    </View>

                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{user.full_name}</Text>
                      <Text style={styles.userEmail}>{user.email}</Text>
                    </View>

                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: "#FEE2E2" }]}
                      onPress={() => deleteMutation.mutate(user.id)}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
                    </Pressable>
                  </View>

                  {/* DETAILS */}
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

                    <Pressable
                      style={styles.blockBtn}
                      onPress={() => handleToggle(user.id, user.isActive)}
                    >
                      <Ionicons name="ban-outline" size={14} color="#FFF" />
                      <Text style={styles.blockText}>
                        {user.isActive ? "Block" : "Blocked"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 18 },

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
    paddingBottom: 10,
    elevation: 4,
  },

  inactiveCard: {
    backgroundColor: "#E5E7EB",
    opacity: 0.8,
  },

  userTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },

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

  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFF",
  },

  userInfo: { flex: 1 },

  userName: { fontSize: 15, fontWeight: "700" },
  userEmail: { fontSize: 13, color: colors.textSecondary },

  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  userDetails: { paddingHorizontal: 14 },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  detailText: { fontSize: 13, color: colors.textSecondary },

  blockBtn: {
    marginTop: 10,
    backgroundColor: "#FF8C00",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  blockText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 12,
  },

  emptyState: { alignItems: "center", marginTop: 60 },
  emptyText: { marginTop: 10 },
});