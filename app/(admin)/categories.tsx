import React, { useEffect, useState } from "react";
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
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import colors from "@/constants/colors";

export default function AdminCategoriesScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [categoryName, setCategoryName] = useState("");

  /* ================= API BASE URL ================= */
  const getApiUrl = () => {
    let host = "";
    if (Platform.OS === "android") host = "10.81.83.70:5000";
    else if (Platform.OS === "ios") host = "localhost:5000";
    else host = "10.51.185.70:5000"; // apna PC IP
    return `http://${host}/`;
  };

  /* ================= FETCH ================= */
  const fetchCategories = async () => {
    try {
      const res = await fetch(getApiUrl() + "api/admin/categories");
      const data = await res.json();
      setCategories(data);
    } catch (error) {
      Alert.alert("Error", "Failed to fetch categories");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  /* ================= CREATE / UPDATE ================= */
  const saveCategory = async () => {
    if (!categoryName.trim()) {
      Alert.alert("Error", "Name is required");
      return;
    }

    try {
      const url = editing
        ? getApiUrl() + `api/admin/categories/${editing.id}`
        : getApiUrl() + "api/admin/categories";
      const method = editing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: categoryName.trim(),
          is_active: editing ? editing.is_active : true,
        }),
      });

      if (!res.ok) throw new Error("Failed");

      Alert.alert(
        "Success",
        editing ? "Category updated" : "Category added"
      );
      closeModal();
      fetchCategories();
    } catch {
      Alert.alert("Error", editing ? "Update failed" : "Create failed");
    }
  };

  /* ================= DELETE ================= */
  const deleteCategory = async (id: number) => {
    try {
      await fetch(getApiUrl() + `api/admin/categories/${id}`, {
        method: "DELETE",
      });
      Alert.alert("Deleted", "Category removed");
      fetchCategories();
    } catch {
      Alert.alert("Error", "Failed to delete category");
    }
  };

  const openAdd = () => {
    setEditing(null);
    setCategoryName("");
    setModal(true);
  };

  const openEdit = (cat: any) => {
    setEditing(cat);
    setCategoryName(cat.name);
    setModal(true);
  };

  const closeModal = () => {
    setModal(false);
    setEditing(null);
    setCategoryName("");
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={["#1E293B", "#334155"]}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </Pressable>

        <Text style={styles.headerTitle}>Categories</Text>

        <Pressable style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={28} color="#FFF" />
        </Pressable>
      </LinearGradient>

      {/* Category List */}
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchCategories();
            }}
          />
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} size="large" />
        ) : (
          <View style={styles.list}>
            {categories.map((cat) => (
              <View key={cat.id} style={styles.categoryCard}>
                <Text style={styles.catName}>{cat.name}</Text>

                <View style={styles.actionButtons}>
                  <Pressable onPress={() => openEdit(cat)} style={styles.iconBtn}>
                    <Ionicons name="create-outline" size={20} color="#FFA500" />
                  </Pressable>

                  <Pressable
                    onPress={() =>
                      Alert.alert("Delete?", `Delete "${cat.name}"?`, [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Delete",
                          style: "destructive",
                          onPress: () => deleteCategory(cat.id),
                        },
                      ])
                    }
                    style={styles.iconBtn}
                  >
                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal */}
      <Modal visible={modal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>
              {editing ? "Edit Category" : "Add Category"}
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Category name"
              value={categoryName}
              onChangeText={setCategoryName}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <Pressable style={styles.cancelBtn} onPress={closeModal}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable style={styles.saveBtn} onPress={saveCategory}>
                <Text style={styles.saveBtnText}>
                  {editing ? "Update" : "Add"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
   headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  backBtn: { marginBottom: 8, width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#FFF" },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  list: { padding: 16, gap: 10 },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 14,
    borderRadius: 12,
    justifyContent: "space-between",
  },
  catName: { fontSize: 16, flex: 1 },
  actionButtons: { flexDirection: "row", gap: 10 },
  iconBtn: { padding: 6, borderRadius: 8, backgroundColor: "#FFF" },

  /* Modal */
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFF", padding: 24, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  modalInput: { borderWidth: 1, borderColor: "#DDD", padding: 10, borderRadius: 10, marginBottom: 20 },
  modalButtons: { flexDirection: "row", gap: 12, justifyContent: "space-between" },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: "#999", padding: 12, borderRadius: 10, alignItems: "center" },
  cancelBtnText: { fontSize: 16, color: "#333" },
  saveBtn: { flex: 1, backgroundColor: "#FFA500", padding: 12, borderRadius: 10, alignItems: "center" },
  saveBtnText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
});