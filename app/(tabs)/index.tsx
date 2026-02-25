import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Pressable,
  Image,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import colors from "@/constants/colors";
import { useAuth } from "@/contexts/auth";
import { useCart } from "@/contexts/cart";
import { getApiUrl } from "@/lib/query-client";
import { fetch } from "expo/fetch";

const { width } = Dimensions.get("window");
const BANNER_WIDTH = width - 32;

async function fetchApi(endpoint: string) {
  const base = getApiUrl();
  const res = await fetch(`${base}api/${endpoint}`);
  if (!res.ok) throw new Error("Fetch failed");
  return res.json();
}

// Banner Slider
function BannerSlider({ banners }: { banners: any[] }) {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      const next = (activeIdx + 1) % banners.length;
      scrollRef.current?.scrollTo({ x: next * (BANNER_WIDTH + 12), animated: true });
      setActiveIdx(next);
    }, 3500);
    return () => clearInterval(interval);
  }, [activeIdx, banners.length]);

  if (banners.length === 0) return null;

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
        {banners.map((banner: any, i: number) => (
          <View key={i} style={bannerStyles.card}>
            <Image
              source={{ uri: banner.image }}
              style={bannerStyles.image}
              resizeMode="cover"
            />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.65)"]}
              style={bannerStyles.gradient}
            >
              {banner.title ? (
                <Text style={bannerStyles.title} numberOfLines={2}>{banner.title}</Text>
              ) : null}
            </LinearGradient>
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

const bannerStyles = StyleSheet.create({
  container: { marginBottom: 24 },
  card: {
    width: BANNER_WIDTH,
    height: 180,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },
  image: { width: "100%", height: "100%" },
  gradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    justifyContent: "flex-end",
    padding: 14,
  },
  title: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  dots: { flexDirection: "row", justifyContent: "center", marginTop: 10, gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#D1D5DB" },
  dotActive: { width: 18, backgroundColor: colors.primary },
});

// Product Card
function ProductCard({ product }: { product: any }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addItem({
      product_id: product.id,
      name: product.name,
      image: product.image,
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
        <Image
          source={{ uri: product.image || "https://via.placeholder.com/200" }}
          style={productStyles.image}
          resizeMode="cover"
        />
        {product.is_highlighted && (
          <View style={productStyles.badge}>
            <Ionicons name="star" size={10} color="#FFF" />
            <Text style={productStyles.badgeText}>Featured</Text>
          </View>
        )}
      </View>
      <View style={productStyles.content}>
        <Text style={productStyles.name} numberOfLines={1}>{product.name}</Text>
        <Text style={productStyles.description} numberOfLines={2}>{product.description || ""}</Text>
        <View style={productStyles.footer}>
          <Text style={productStyles.price}>${parseFloat(product.price_medium).toFixed(2)}</Text>
          <Pressable
            style={[productStyles.addButton, added && productStyles.addButtonAdded]}
            onPress={handleAdd}
          >
            <Ionicons name={added ? "checkmark" : "add"} size={18} color="#FFF" />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const productStyles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    overflow: "hidden",
    width: (width - 48) / 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  imageContainer: { position: "relative" },
  image: { width: "100%", height: 130 },
  badge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: colors.primary,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  badgeText: { color: "#FFF", fontSize: 10, fontWeight: "700" },
  content: { padding: 10 },
  name: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 2 },
  description: { fontSize: 11, color: colors.textSecondary, lineHeight: 15, marginBottom: 8, minHeight: 30 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  price: { fontSize: 16, fontWeight: "800", color: colors.primary },
  addButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonAdded: { backgroundColor: colors.success },
});

// Highlighted Deal Card (horizontal scroll)
function DealCard({ product }: { product: any }) {
  const { addItem } = useCart();

  return (
    <Pressable
      style={dealStyles.card}
      onPress={() => router.push({ pathname: "/product/[id]", params: { id: product.id } })}
    >
      <Image
        source={{ uri: product.image || "https://via.placeholder.com/150" }}
        style={dealStyles.image}
        resizeMode="cover"
      />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.7)"]}
        style={dealStyles.overlay}
      >
        <Text style={dealStyles.name} numberOfLines={1}>{product.name}</Text>
        <Text style={dealStyles.price}>${parseFloat(product.price_medium).toFixed(2)}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const dealStyles = StyleSheet.create({
  card: {
    width: 150,
    height: 110,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },
  image: { width: "100%", height: "100%" },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    padding: 10,
    justifyContent: "flex-end",
  },
  name: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  price: { color: colors.accent, fontSize: 13, fontWeight: "800" },
});

// Category Pill
function CategoryPill({ category, isSelected, onPress }: { category: any; isSelected: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={[catStyles.pill, isSelected && catStyles.pillActive]}
      onPress={() => { Haptics.selectionAsync(); onPress(); }}
    >
      <Text style={[catStyles.text, isSelected && catStyles.textActive]}>{category.name}</Text>
    </Pressable>
  );
}

const catStyles = StyleSheet.create({
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  pillActive: {
    backgroundColor: colors.primaryPale,
    borderColor: colors.primary,
  },
  text: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  textActive: { color: colors.primary },
});

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { totalItems, clearCart } = useCart();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const bannersQuery = useQuery({ queryKey: ["banners"], queryFn: () => fetchApi("banners") });
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: () => fetchApi("categories") });
  const productsQuery = useQuery({
    queryKey: ["products", selectedCategory],
    queryFn: () => fetchApi(selectedCategory ? `products?category_id=${selectedCategory}` : "products"),
  });
  const highlightedQuery = useQuery({
    queryKey: ["products-highlighted"],
    queryFn: () => fetchApi("products?highlighted=true"),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      bannersQuery.refetch(),
      categoriesQuery.refetch(),
      productsQuery.refetch(),
      highlightedQuery.refetch(),
    ]);
    setRefreshing(false);
  }, []);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const isGuest = user?.role === "guest";
  const profileUri = user?.profile_image
    ? (user.profile_image.startsWith("http") ? user.profile_image : `${getApiUrl().replace(/\/$/, "")}${user.profile_image}`)
    : null;

  const handleLogout = () => {
    Alert.alert(
      isGuest ? "End Guest Session" : "Logout",
      isGuest ? "This will clear your session and cart. Continue?" : "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isGuest ? "End Session" : "Logout",
          style: "destructive",
          onPress: async () => {
            clearCart();
            await logout();
            router.replace("/(auth)");
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: bottomPad }]}>
      {/* Header */}
      <LinearGradient
        colors={["#FF4500", "#FF6B35"]}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <View style={styles.headerLeft}>
          {isGuest ? (
            <View style={styles.logoSmall}>
              <Ionicons name="flame" size={22} color="#FF4500" />
            </View>
          ) : profileUri ? (
            <Image source={{ uri: profileUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={20} color="#FFF" />
            </View>
          )}
          <View style={styles.headerLeftText}>
            {!isGuest && user?.address ? (
              <>
                <Text style={styles.locationLabel}>Deliver to</Text>
                <Text style={styles.locationText} numberOfLines={1}>{user.address}</Text>
              </>
            ) : null}
          </View>
        </View>

        <View style={styles.headerRight}>
          <View>
            <Text style={styles.welcomeLabel}>Welcome</Text>
            <Text style={styles.welcomeName} numberOfLines={1}>
              {isGuest ? user?.full_name : user?.full_name?.split(" ")[0] || "Friend"}
            </Text>
          </View>
          <View style={styles.headerIcons}>
            {!isGuest && (
              <Pressable
                style={styles.cartButton}
                onPress={() => router.push("/(tabs)/cart")}
              >
                <Ionicons name="cart-outline" size={22} color="#FFF" />
                {totalItems > 0 && (
                  <View style={styles.cartBadge}>
                    <Text style={styles.cartBadgeText}>{totalItems}</Text>
                  </View>
                )}
              </Pressable>
            )}
            <Pressable style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={22} color="#FFF" />
            </Pressable>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={{ height: 20 }} />

        {/* Banners */}
        {bannersQuery.isLoading ? (
          <View style={styles.bannerSkeleton} />
        ) : (
          <BannerSlider banners={bannersQuery.data || []} />
        )}

        {/* Highlighted Deals */}
        {(highlightedQuery.data?.length || 0) > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Hot Deals</Text>
              <Ionicons name="flame" size={18} color={colors.primary} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
              {(highlightedQuery.data || []).map((p: any) => (
                <DealCard key={p.id} product={p} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Categories */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { paddingHorizontal: 16, marginBottom: 12 }]}>Browse Categories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            <CategoryPill
              category={{ id: null, name: "All" }}
              isSelected={selectedCategory === null}
              onPress={() => setSelectedCategory(null)}
            />
            {(categoriesQuery.data || []).map((cat: any) => (
              <CategoryPill
                key={cat.id}
                category={cat}
                isSelected={selectedCategory === cat.id}
                onPress={() => setSelectedCategory(cat.id)}
              />
            ))}
          </ScrollView>
        </View>

        {/* Products Grid */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { paddingHorizontal: 16, marginBottom: 16 }]}>
            {selectedCategory
              ? (categoriesQuery.data || []).find((c: any) => c.id === selectedCategory)?.name || "Products"
              : "All Items"}
          </Text>

          {productsQuery.isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
          ) : (productsQuery.data || []).length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="restaurant-outline" size={48} color={colors.textLight} />
              <Text style={styles.emptyText}>No products found</Text>
            </View>
          ) : (
            <View style={styles.productsGrid}>
              {(productsQuery.data || []).map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 18,
    gap: 8,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  logoSmall: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "#FFF",
    alignItems: "center", justifyContent: "center",
  },
  avatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: "rgba(255,255,255,0.5)" },
  avatarPlaceholder: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center", justifyContent: "center",
  },
  headerLeftText: { flex: 1 },
  locationLabel: { fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: "500" },
  locationText: { fontSize: 13, color: "#FFF", fontWeight: "600" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerIcons: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoutButton: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center", justifyContent: "center",
  },
  welcomeLabel: { fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: "500", textAlign: "right" },
  welcomeName: { fontSize: 16, color: "#FFF", fontWeight: "700", textAlign: "right", maxWidth: 120 },
  cartButton: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center", justifyContent: "center",
    position: "relative",
  },
  cartBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: colors.accent,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 2,
    borderColor: "#FF4500",
  },
  cartBadgeText: { color: "#FFF", fontSize: 10, fontWeight: "800" },
  scroll: { flex: 1 },
  bannerSkeleton: {
    marginHorizontal: 16,
    height: 180,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginBottom: 24,
  },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
  },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 16, color: colors.textSecondary, fontWeight: "500" },
});
