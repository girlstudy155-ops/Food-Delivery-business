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
  KeyboardAvoidingView,
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

  /* ================= API URL ================= */

  const API_URL =
    "https://food-delivery-business-production-00a9.up.railway.app/";

  /* ================= FETCH ================= */

  const fetchCategories = async () => {
    try {
      const res = await fetch(API_URL + "api/admin/categories");
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
      Alert.alert("Error", "Category name required");
      return;
    }

    try {

      const url = editing
        ? API_URL + `api/admin/categories/${editing.id}`
        : API_URL + "api/admin/categories";

      const method = editing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: categoryName.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Request failed");
      }

      Alert.alert(
        "Success",
        editing ? "Category updated" : "Category added"
      );

      closeModal();
      fetchCategories();

    } catch (err: any) {

      Alert.alert("Error", err.message);

    }
  };

  /* ================= DELETE ================= */

  const deleteCategory = async (id: number) => {

    try {

      await fetch(API_URL + `api/admin/categories/${id}`, {
        method: "DELETE",
      });

      Alert.alert("Deleted", "Category removed");

      fetchCategories();

    } catch {

      Alert.alert("Error", "Delete failed");

    }

  };

  /* ================= MODAL CONTROL ================= */

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

      {/* HEADER */}

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

        <Pressable
          style={styles.addBtn}
          onPress={openAdd}
        >
          <Ionicons name="add" size={28} color="#FFF" />
        </Pressable>

      </LinearGradient>

      {/* CATEGORY LIST */}

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

          <ActivityIndicator
            style={{ marginTop: 40 }}
            size="large"
          />

        ) : (

          <View style={styles.list}>

            {categories.map((cat) => (

              <View
                key={cat.id}
                style={styles.categoryCard}
              >

                <Text style={styles.catName}>
                  {cat.name}
                </Text>

                <View style={styles.actionButtons}>

                  <Pressable
                    onPress={() => openEdit(cat)}
                    style={styles.iconBtn}
                  >
                    <Ionicons
                      name="create-outline"
                      size={20}
                      color="#FFA500"
                    />
                  </Pressable>

                  <Pressable
                    style={styles.iconBtn}
                    onPress={() =>
                      Alert.alert(
                        "Delete?",
                        `Delete "${cat.name}"?`,
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Delete",
                            style: "destructive",
                            onPress: () => deleteCategory(cat.id),
                          },
                        ]
                      )
                    }
                  >

                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color="#FF3B30"
                    />

                  </Pressable>

                </View>

              </View>

            ))}

          </View>

        )}

      </ScrollView>

      {/* MODAL */}

      <Modal
        visible={modal}
        transparent
        animationType="slide"
      >

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >

          <Pressable
            style={styles.modalOverlay}
            onPress={closeModal}
          >

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

                <Pressable
                  style={styles.cancelBtn}
                  onPress={closeModal}
                >
                  <Text style={styles.cancelBtnText}>
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.saveBtn}
                  onPress={saveCategory}
                >
                  <Text style={styles.saveBtnText}>
                    {editing ? "Update" : "Add"}
                  </Text>
                </Pressable>

              </View>

            </Pressable>

          </Pressable>

        </KeyboardAvoidingView>

      </Modal>

    </View>

  );

}

/* ================= STYLES ================= */

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backBtn: {
    marginBottom: 8,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFF",
  },

  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  list: {
    padding: 16,
    gap: 10,
  },

  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 14,
    borderRadius: 12,
    justifyContent: "space-between",
  },

  catName: {
    fontSize: 16,
    flex: 1,
  },

  actionButtons: {
    flexDirection: "row",
    gap: 10,
  },

  iconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#FFF",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },

  modalContent: {
    backgroundColor: "#FFF",
    padding: 24,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },

  modalInput: {
    borderWidth: 1,
    borderColor: "#DDD",
    padding: 10,
    borderRadius: 10,
    marginBottom: 20,
  },

  modalButtons: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },

  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#999",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  cancelBtnText: {
    fontSize: 16,
    color: "#333",
  },

  saveBtn: {
    flex: 1,
    backgroundColor: "#FFA500",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  saveBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },

});