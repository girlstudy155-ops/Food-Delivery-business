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
  TextInput,
  Modal,
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

async function fetchAdminCategories(token: string) {
  const base = getApiUrl();
  const res = await fetch(`${base}api/admin/categories`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

async function createCategory(token: string, name: string) {
  const base = getApiUrl();
  const res = await fetch(`${base}api/admin/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

async function updateCategory(token: string, id: number, name: string, is_active: boolean) {
  const base = getApiUrl();
  const res = await fetch(`${base}api/admin/categories/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name, is_active }),
  });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

async function deleteCategory(token: string, id: number) {
  const base = getApiUrl();
  const res = await fetch(`${base}api/admin/categories/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export default function AdminCategoriesScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [categoryName, setCategoryName] = useState("");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: categories = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-categories", token],
    queryFn: () => fetchAdminCategories(token!),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: () => createCategory(token!, categoryName.trim()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-categories"] }); closeModal(); },
    onError: () => Alert.alert("Error", "Failed to create category"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active?: boolean }) =>
      updateCategory(token!, id, editing?.name || categoryName, is_active ?? editing?.is_active),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-categories"] }); closeModal(); },
    onError: () => Alert.alert("Error", "Failed to update"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCategory(token!, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-categories"] }),
    onError: () => Alert.alert("Error", "Failed to delete"),
  });

  const openAdd = () => { setEditing(null); setCategoryName(""); setModal(true); };
  const openEdit = (cat: any) => { setEditing(cat); setCategoryName(cat.name); setModal(true); };
  const closeModal = () => { setModal(false); setEditing(null); setCategoryName(""); };

  const handleSave = () => {
    if (!categoryName.trim()) { Alert.alert("Error", "Name is required"); return; }
    if (editing) {
      updateMutation.mutate({ id: editing.id });
    } else {
      createMutation.mutate();
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#1E293B", "#334155"]}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <View style={styles.headerRow}>
          <View>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color="#FFF" />
            </Pressable>
            <Text style={styles.headerTitle}>Categories</Text>
          </View>
          <Pressable style={styles.addBtn} onPress={openAdd}>
            <Ionicons name="add" size={22} color="#FFF" />
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
        ) : (
          <View style={styles.list}>
            {categories.map((cat: any) => (
              <View key={cat.id} style={styles.categoryCard}>
                <View style={[styles.catIcon, { backgroundColor: cat.is_active ? colors.primaryPale : "#F3F4F6" }]}>
                  <Ionicons name="grid" size={22} color={cat.is_active ? colors.primary : colors.textLight} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.catName}>{cat.name}</Text>
                  <Text style={[styles.catStatus, { color: cat.is_active ? colors.success : colors.error }]}>
                    {cat.is_active ? "Active" : "Inactive"}
                  </Text>
                </View>
                <Pressable
                  style={styles.iconBtn}
                  onPress={() => updateMutation.mutate({ id: cat.id, is_active: !cat.is_active })}
                >
                  <Ionicons
                    name={cat.is_active ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={colors.textSecondary}
                  />
                </Pressable>
                <Pressable style={styles.iconBtn} onPress={() => openEdit(cat)}>
                  <Ionicons name="create-outline" size={18} color={colors.info} />
                </Pressable>
                <Pressable
                  style={styles.iconBtn}
                  onPress={() => Alert.alert("Delete", `Delete "${cat.name}"?`, [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(cat.id) },
                  ])}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={modal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{editing ? "Edit Category" : "Add Category"}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Category name"
              placeholderTextColor={colors.textLight}
              value={categoryName}
              onChangeText={setCategoryName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable style={styles.cancelBtn} onPress={closeModal}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.saveBtn, (createMutation.isPending || updateMutation.isPending) && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.saveBtnText}>{editing ? "Update" : "Add"}</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 18 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  backBtn: { marginBottom: 8, width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#FFF" },
  addBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  scroll: { flex: 1 },
  list: { padding: 16, gap: 10 },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  catIcon: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  catName: { fontSize: 15, fontWeight: "700", color: colors.text },
  catStatus: { fontSize: 12, fontWeight: "600", marginTop: 1 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.borderLight, alignItems: "center", justifyContent: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingTop: 16, gap: 16 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#E5E7EB", alignSelf: "center" },
  modalTitle: { fontSize: 20, fontWeight: "800", color: colors.text },
  modalInput: {
    backgroundColor: colors.borderLight, borderRadius: 14, padding: 14,
    fontSize: 15, color: colors.text, borderWidth: 1.5, borderColor: colors.border,
  },
  modalButtons: { flexDirection: "row", gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, alignItems: "center" },
  cancelBtnText: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center" },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#FFF" },
});
