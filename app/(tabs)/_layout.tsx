import React from "react";
import { Platform, View, StyleSheet } from "react-native";
import { Tabs, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useCart } from "@/contexts/cart";
import { useAuth } from "@/contexts/auth";
import colors from "@/constants/colors";
import { Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function CartBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? "99+" : count}</Text>
    </View>
  );
}

export default function TabLayout() {
  const { totalItems } = useCart();
  const { isAdmin } = useAuth();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const isIOS = Platform.OS === "ios";

  // Redirect admin away from tabs
  React.useEffect(() => {
    if (isAdmin) router.replace("/(admin)");
  }, [isAdmin]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : "#FFFFFF",
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
          ...(Platform.OS === "android" ? {
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom,
          } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={95} tint="light" style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "#FFFFFF" }]} />
          ) : null,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginBottom: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="offers"
        options={{
          title: "Offers",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "pricetag" : "pricetag-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          tabBarIcon: ({ color, focused }) => (
            <View>
              <Ionicons name={focused ? "cart" : "cart-outline"} size={24} color={color} />
              <CartBadge count={totalItems} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "receipt" : "receipt-outline"} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#FFF",
  },
  badgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "700",
  },
});
