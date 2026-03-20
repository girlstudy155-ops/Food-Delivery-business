 import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
  TextInput,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useCart } from "@/contexts/cart";

const { width } = Dimensions.get("window");
const BANNER_WIDTH = width - 32;

// ----------------- API -----------------
export const getApiUrl = () => {
  return "https://food-delivery-business-production-00a9.up.railway.app/";
};

async function fetchApi(endpoint: string) {
  const res = await fetch(`${getApiUrl()}api/${endpoint}`);
  if (!res.ok) throw new Error("Fetch failed");
  return res.json();
}

const getProductImage = (product: any) =>
  product.image
    ? product.image.startsWith("http")
      ? product.image
      : getApiUrl().replace(/\/$/, "") + product.image
    : null;

// ----------------- Components -----------------
function BannerSlider({ banners }: { banners: any[] }) {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (!banners || banners.length <= 1) return;
    const interval = setInterval(() => {
      const next = (activeIdx + 1) % banners.length;
      scrollRef.current?.scrollTo({ x: next * (BANNER_WIDTH + 12), animated: true });
      setActiveIdx(next);
    }, 3500);
    return () => clearInterval(interval);
  }, [activeIdx, banners]);

  if (!banners || banners.length === 0) return null;

  return (
    <View style={bannerStyles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={BANNER_WIDTH + 12}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / (BANNER_WIDTH + 12));
          setActiveIdx(idx);
        }}
      >
        {banners.map((banner, i) => (
          <View key={i} style={bannerStyles.card}>
            <Image
              source={{ uri: getProductImage(banner) || "" }}
              style={bannerStyles.image}
              resizeMode="cover"
            />
            {banner.title && (
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.65)"]}
                style={bannerStyles.gradient}
              >
                <Text style={bannerStyles.title} numberOfLines={2}>
                  {banner.title}
                </Text>
              </LinearGradient>
            )}
          </View>
        ))}
      </ScrollView>
      {banners.length > 1 && (
        <View style={bannerStyles.dots}>
          {banners.map((_, i) => (
            <View key={i} style={[bannerStyles.dot, i === activeIdx && bannerStyles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

function ProductCard({ product, addItem }: { product: any; addItem: any }) {
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addItem({
      product_id: product.id,
      name: product.name,
      image: getProductImage(product),
      size: "Medium",
      price: parseFloat(product.price_medium),
      quantity: 1,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <Pressable
      style={productStyles.card}
      onPress={() => router.push({ pathname: "/product/[id]", params: { id: product.id } })}
    >
      <View style={productStyles.imageContainer}>
        {getProductImage(product) ? (
          <Image source={{ uri: getProductImage(product) }} style={productStyles.image} resizeMode="cover" />
        ) : (
          <View style={[productStyles.image, { backgroundColor: "#EEE", justifyContent: "center", alignItems: "center" }]}>
            <Ionicons name="image-outline" size={24} color={colors.textLight} />
          </View>
        )}
        {product.is_highlighted && (
          <View style={productStyles.badge}>
            <Ionicons name="star" size={10} color="#FFF" />
            <Text style={productStyles.badgeText}>Featured</Text>
          </View>
        )}
      </View>
      <View style={productStyles.content}>
        <Text style={productStyles.name} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={productStyles.description} numberOfLines={2}>
          {product.description || ""}
        </Text>
        <View style={productStyles.footer}>
          <Text style={productStyles.price}>${parseFloat(product.price_medium).toFixed(2)}</Text>
          <Pressable style={[productStyles.addButton, added && productStyles.addButtonAdded]} onPress={handleAdd}>
            <Ionicons name={added ? "checkmark" : "add"} size={18} color="#FFF" />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

// ----------------- HomeScreen -----------------
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { totalItems, addItem, clearCart } = useCart();
  const [user, setUser] = useState<any>(null);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
    const [searchText, setSearchText] = useState(""); // <-- NEW

  const bannersQuery = useQuery({ queryKey: ["banners"], queryFn: () => fetchApi("banners") });
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: () => fetchApi("admin/categories") });
 const productsQuery = useQuery({
  queryKey: ["products", selectedCategory],
  queryFn: () =>
    fetchApi(selectedCategory
      ? `products?category_id=${selectedCategory}`
      : "products"
    ),
});
  const highlightedQuery = useQuery({
    queryKey: ["products-highlighted"], 
    queryFn: () => fetchApi("products?highlighted=true"),
  });
  // Filter products based on search
// Get all products for the selected category
const allProducts = productsQuery.data || [];

// Get highlighted product IDs
const highlightedIds = (highlightedQuery.data || []).map((p: any) => p.id);

// Filter products based on search AND exclude highlighted ones
const filteredProducts = allProducts
  .filter((p: any) => !highlightedIds.includes(p.id))
  .filter((p: any) =>
    p.name.toLowerCase().includes(searchText.toLowerCase())
  );
const { isDarkTheme, toggleTheme, theme } = useTheme();
  // ----------------- Load Remembered User -----------------
 useEffect(() => {
  const initUserAndGuest = async () => {
    const storedUser = await AsyncStorage.getItem("rememberUser");
    const currentUser = await AsyncStorage.getItem("currentUser");

    if (storedUser) {
      setUser(JSON.parse(storedUser));
      return;
    } else if (currentUser) {
      setUser(JSON.parse(currentUser));
      return;
    }

    let guest = await AsyncStorage.getItem("guest_id");
    if (!guest) {
      guest = `Guest#${Math.floor(Math.random() * 9000) + 1000}`;
      await AsyncStorage.setItem("guest_id", guest);
    }
    setGuestId(guest);
  };

  initUserAndGuest();
}, []);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const profileUri: string | null = user?.profile_image
    ? user.profile_image.startsWith("http") || user.profile_image.startsWith("file://")
      ? user.profile_image
      : getApiUrl().replace(/\/$/, "") + "/" + user.profile_image.replace(/^\/+/, "")
    : null;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([bannersQuery.refetch(), categoriesQuery.refetch(), productsQuery.refetch(), highlightedQuery.refetch()]);
    setRefreshing(false);
  }, [selectedCategory]);

const handleLogout = () => {
  Alert.alert(
    "Logout",
    "Are you sure you want to logout?",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          // Clear user and remembered data
          await AsyncStorage.removeItem("rememberUser");
          await AsyncStorage.removeItem("currentUser");
          clearCart();
          setUser(null);

          // Generate new guest ID
          const newGuest = `Guest#${Math.floor(Math.random() * 9000) + 1000}`;
          await AsyncStorage.setItem("guest_id", newGuest);
          setGuestId(newGuest);

          // Redirect to home
          router.replace("/(auth)");
        },
      },
    ]
  );
};

  return (
    <View style={[styles.container,{ backgroundColor: theme.background } ,{ paddingBottom: bottomPad }]}>
      {/* Header */}
      <LinearGradient colors={["#FF4500", "#FF6B35"]} style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.headerLeft}>
          {profileUri ? (
            <Image source={{ uri: profileUri}} style={styles.avatar} />
          ) : (
             <Image
      source={require("@/assets/images/icon.png")} // <-- make sure the path is correct
      style={styles.avatar}
    />
          )}
      <View style={styles.headerLeftText}>
  {user?.address && (
    <>
      <Text style={styles.locationLabel}>Deliver to</Text>
      <Text style={styles.locationText} numberOfLines={1}>
        {user.address}
      </Text>
    </>
  )}
</View>
        </View>

        <View style={styles.headerRight}>
          <View>
          <Text style={styles.welcomeLabel}>Welcome</Text>
  {user ? (
    <Text style={styles.welcomeName} numberOfLines={1}>
      {user?.full_name ? user.full_name.split(" ")[0] : `Guest#${Math.floor(Math.random() * 9000) + 1000}`}
    </Text>
  ) : (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
     <Text style={styles.welcomeName}>
    {guestId || "Guest"}
  </Text>
            
          </View>
            )}
</View>
         <View style={styles.headerIcons}>
  {/* Theme Toggle */}
  <Pressable
    style={styles.themeButton}
    onPress={toggleTheme}
  >
    <Ionicons
      name={isDarkTheme ? "moon" : "sunny"}
      size={22}
      color="#FFF"
    />
  </Pressable>

  {/* Logout */}
  <Pressable style={styles.logoutButton} onPress={handleLogout}>
    <Ionicons name="log-out-outline" size={22} color="#FFF" />
  </Pressable>
</View>
        </View>
      </LinearGradient>

      {/* Scroll */}
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={{ height: 20 }} />
        {bannersQuery.isLoading ? <View style={styles.bannerSkeleton} /> : <BannerSlider banners={bannersQuery.data || []} />}
{/* Highlighted Deals */}
{(highlightedQuery.data?.length || 0) > 0 && (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: isDarkTheme ? "#FFF" : "#000" }]}>Hot Deals</Text>
      <Ionicons name="flame" size={18} color={colors.primary} />
    </View>

    <ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
>
  {(highlightedQuery.data || []).map((p: any) => (
    <Pressable
      key={p.id}
      style={dealStyles.card}
      onPress={() =>
        router.push({ pathname: "/product/[id]", params: { id: p.id } })
      }
    >
      <Image
        source={{ uri: getProductImage(p) }}
        style={dealStyles.image}
      />

      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.7)"]}
        style={dealStyles.overlay}
      >
        <Text style={dealStyles.name} numberOfLines={1}>
          {p.name}
        </Text>

        <Text style={dealStyles.price}>
          ${parseFloat(p.price_medium).toFixed(2)}
        </Text>
      </LinearGradient>
    </Pressable>
  ))}
</ScrollView>
    {/* --- SEARCH BAR --- */}
            <View style={searchStyles.container}>
            <TextInput
  value={searchText}
  onChangeText={setSearchText}
  placeholder="Search products..."
  placeholderTextColor={isDarkTheme ? "#AAA" : "#666"}
  style={[
    searchStyles.input,
    { color: isDarkTheme ? "#FFF" : colors.text }
  ]}
/>
              <Pressable style={searchStyles.button}>
                <Ionicons name="search" size={20} color="#FFF" />
              </Pressable>
            </View>
          </View>
        )}
        {/* Categories */}
<View style={styles.section}>
  <Text style={[styles.sectionTitle, { paddingHorizontal: 16, marginBottom: 12 }, { color: isDarkTheme ? "#FFF" : "#000" }]}>
    Categories
  </Text>

  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
  >
    {(categoriesQuery.data || []).map((cat: any) => (
      <Pressable
        key={cat.id}
        style={[
          catStyles.pill,
          selectedCategory === cat.id && catStyles.pillActive,
        ]}
      onPress={() => setSelectedCategory(cat.id)}
      >
        <Text
          style={[
            catStyles.text,
            selectedCategory === cat.id && catStyles.textActive,
          ]}
        >
          {cat.name}
        </Text>
      </Pressable>
    ))}
  </ScrollView>
</View>
      
  {/* Products Grid */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { paddingHorizontal: 16, marginBottom: 16 }, { color: isDarkTheme ? "#FFF" : "#000" }]}>All Items</Text>
          {productsQuery.isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
          ) : filteredProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="restaurant-outline" size={48} color={colors.textLight} />
              <Text style={styles.emptyText}>No products found</Text>
            </View>
          ) : (
            <View style={styles.productsGrid}>
              {filteredProducts.map((product: any) => (
                <ProductCard key={product.id} product={product} addItem={addItem} />
              ))}
            </View>
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// --- styles (same as before) ---

// ----------------- Styles -----------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 18, gap: 8 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  logoSmall: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center" },
  avatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: "rgba(255,255,255,0.5)" },
  avatarPlaceholder: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  headerLeftText: { flex: 1 },
  locationLabel: { fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: "500" },
  locationText: { fontSize: 13, color: "#FFF", fontWeight: "600" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerIcons: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoutButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  welcomeLabel: { fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: "500", textAlign: "right" },
  welcomeName: { fontSize: 16, color: "#FFF", fontWeight: "700", textAlign: "right", maxWidth: 120 },
  cartButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center", position: "relative" },
  cartBadge: { position: "absolute", top: -2, right: -2, backgroundColor: colors.accent, borderRadius: 10, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 3, borderWidth: 2, borderColor: "#FF4500" },
  cartBadgeText: { color: "#FFF", fontSize: 10, fontWeight: "800" },
  scroll: { flex: 1 },
  bannerSkeleton: { marginHorizontal: 16, height: 180, borderRadius: 20, backgroundColor: "#F3F4F6", marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  productsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 12 },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyText: { color: colors.textLight, fontSize: 16 },
  themeButton: { 
  width: 42, 
  height: 42, 
  borderRadius: 21, 
  backgroundColor: "rgba(255,255,255,0.25)", 
  alignItems: "center", 
  justifyContent: "center" 
},
});

const bannerStyles = StyleSheet.create({
  container: {},
  card: { width: BANNER_WIDTH, height: 180, borderRadius: 16, overflow: "hidden" },
  image: { width: "100%", height: "100%" },
  gradient: { position: "absolute", bottom: 0, left: 0, right: 0, height: 60, justifyContent: "flex-end", paddingHorizontal: 12, paddingBottom: 8 },
  title: { color: "#FFF", fontWeight: "700", fontSize: 14 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#CCC" },
  dotActive: { backgroundColor: colors.primary },
});
// --- SEARCH STYLES ---
const searchStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.text,
  },
  button: {
    backgroundColor: "#FF4500",
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});
const productStyles = StyleSheet.create({
  card: { width: (width - 48) / 2, backgroundColor: "#FFF", borderRadius: 12, overflow: "hidden", marginBottom: 12 },
  imageContainer: { width: "100%", height: 120, position: "relative" },
  image: { width: "100%", height: "100%" },
  badge: { position: "absolute", top: 8, left: 8, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FF4500", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, color: "#FFF", fontWeight: "700" },
  content: { padding: 8 },
  name: { fontSize: 14, fontWeight: "700", color: colors.text },
  description: { fontSize: 12, color: colors.textLight, marginVertical: 4 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  price: { fontWeight: "700", color: colors.text },
  addButton: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  addButtonAdded: { backgroundColor: "#28A745" },
});

const dealStyles = StyleSheet.create({
  card: { width: 140, height: 180, borderRadius: 12, overflow: "hidden" },
  image: { width: "100%", height: "100%" },
  overlay: { position: "absolute", bottom: 0, left: 0, right: 0, height: 50, paddingHorizontal: 8, justifyContent: "flex-end" },
  name: { color: "#FFF", fontWeight: "700", fontSize: 12 },
  price: { color: "#FFF", fontWeight: "700", fontSize: 12 },
});

const catStyles = StyleSheet.create({
  pill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: "#F3F4F6" },
  pillActive: { backgroundColor: colors.primary },
  text: { fontSize: 12, fontWeight: "500", color: colors.text },
  textActive: { color: "#FFF" },
}); 