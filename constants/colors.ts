const ORANGE = "#FF4500";
const ORANGE_DARK = "#E03C00";
const ORANGE_LIGHT = "#FF6B35";
const ORANGE_PALE = "#FFF0EB";

const colors = {
  primary: ORANGE,
  primaryDark: ORANGE_DARK,
  primaryLight: ORANGE_LIGHT,
  primaryPale: ORANGE_PALE,
  accent: "#FFB347",
  background: "#FAFAFA",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  text: "#1A1A1A",
  textSecondary: "#6B7280",
  textLight: "#9CA3AF",
  border: "#E5E7EB",
  borderLight: "#F3F4F6",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",
  shadow: "rgba(0,0,0,0.08)",
  overlay: "rgba(0,0,0,0.5)",
  tabBar: "#FFFFFF",
  tabBarActive: ORANGE,
  tabBarInactive: "#9CA3AF",
  light: {
    tint: ORANGE,
    tabIconDefault: "#9CA3AF",
    tabIconSelected: ORANGE,
  },
  statusColors: {
    Pending: "#F59E0B",
    Confirmed: "#3B82F6",
    Preparing: "#8B5CF6",
    "Out for Delivery": "#F97316",
    Delivered: "#10B981",
  } as Record<string, string>,
};

export default colors;
