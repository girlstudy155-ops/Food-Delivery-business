import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export type UserRole = "user" | "admin" | "guest";

export interface User {
  id?: number;
  full_name: string;
  email?: string;
  address?: string;
  phone?: string;
  profile_image?: string;
  role: UserRole;
  guest_id?: string;
  is_active?: boolean;
}

export interface RegisterData {
  full_name: string;
  email: string;
  password: string;
  address: string;
  phone: string;
  device_id?: string;
  remember_me?: boolean;
  profile_image_uri?: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isGuest: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// 🌟 Backend base URL auto-detect
const getBaseUrl = () => {
  if (Platform.OS === "android") return "http://10.81.83.70::5000/";
  if (Platform.OS === "ios") return "http://localhost:5000/";
  return "http://10.81.83.70::5000/"; // <-- Your PC LAN IP
};

// 🔹 Smooth AuthProvider
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const savedToken = await AsyncStorage.getItem("auth_token");
        const savedUser = await AsyncStorage.getItem("auth_user");
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        }
      } catch (err) {
        console.log("Storage error:", err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const buildUrl = (endpoint: string) => `${getBaseUrl()}${endpoint}`;

  // 🌟 Friendly fetch wrapper (no crashes on error)
  const handleFetch = async (url: string, options: RequestInit) => {
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.log("API Error:", errData.message || `Status ${res.status}`);
        return null;
      }
      return await res.json();
    } catch (err: any) {
      console.log("FETCH ERROR:", err);
      return null;
    }
  };

  // 🔹 Login
  const login = async (email: string, password: string) => {
    const url = buildUrl("api/auth/login");
    const data = await handleFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (data) {
      await AsyncStorage.setItem("auth_token", data.token);
      await AsyncStorage.setItem("auth_user", JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
    } else {
      console.log("Login failed or backend unreachable.");
    }
  };

  // 🔹 Register
  const register = async (formData: RegisterData) => {
    const url = buildUrl("api/auth/register");
    const body = new FormData();
    body.append("full_name", formData.full_name);
    body.append("email", formData.email);
    body.append("password", formData.password);
    body.append("address", formData.address);
    body.append("phone", formData.phone);

    if (formData.device_id) body.append("device_id", formData.device_id);
    if (formData.remember_me !== undefined)
      body.append("remember_me", String(formData.remember_me));

    if (formData.profile_image_uri) {
      const filename = formData.profile_image_uri.split("/").pop() || "photo.jpg";
      const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
      const mimeMap: Record<string, string> = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
      };
      body.append("profile_image", {
        uri: formData.profile_image_uri,
        name: filename,
        type: mimeMap[ext] || "image/jpeg",
      } as any);
    }

    const data = await handleFetch(url, { method: "POST", body });

    if (data) {
      await AsyncStorage.setItem("auth_token", data.token);
      await AsyncStorage.setItem("auth_user", JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
    } else {
      console.log("Registration failed or backend unreachable.");
    }
  };

  // 🔹 Continue as guest
  const continueAsGuest = async () => {
    const guestUser: User = {
      full_name: `Guest#${Math.floor(1000 + Math.random() * 9000)}`,
      role: "guest",
    };
    setToken(null);
    setUser(guestUser);
  };

  // 🔹 Logout
  const logout = async () => {
    await AsyncStorage.removeItem("auth_token");
    await AsyncStorage.removeItem("auth_user");
    setToken(null);
    setUser(null);
  };

  // 🔹 Update user
  const updateUser = (updated: User) => {
    setUser(updated);
    AsyncStorage.setItem("auth_user", JSON.stringify(updated));
  };

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      isGuest: user?.role === "guest",
      isAdmin: user?.role === "admin",
      login,
      register,
      continueAsGuest,
      logout,
      updateUser,
    }),
    [user, token, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}