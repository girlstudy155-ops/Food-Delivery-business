import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetch } from "expo/fetch";
import { getApiUrl } from "@/lib/query-client";

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

const AuthContext = createContext<AuthContextValue | null>(null);

function generateGuestId(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `Guest#${num}`;
}

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
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const baseUrl = getApiUrl();
    const res = await fetch(`${baseUrl}api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Login failed");
    await AsyncStorage.setItem("auth_token", data.token);
    await AsyncStorage.setItem("auth_user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (formData: RegisterData) => {
    const baseUrl = getApiUrl();
    const body = new FormData();
    body.append("full_name", formData.full_name);
    body.append("email", formData.email);
    body.append("password", formData.password);
    body.append("address", formData.address);
    body.append("phone", formData.phone);
    if (formData.device_id) body.append("device_id", formData.device_id);
    if (formData.remember_me !== undefined) body.append("remember_me", String(formData.remember_me));
    if (formData.profile_image_uri) {
      const filename = formData.profile_image_uri.split("/").pop() || "photo.jpg";
      const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
      const mimeMap: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif" };
      body.append("profile_image", { uri: formData.profile_image_uri, name: filename, type: mimeMap[ext] || "image/jpeg" } as any);
    }
    const res = await fetch(`${baseUrl}api/auth/register`, {
      method: "POST",
      body,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Registration failed");
    await AsyncStorage.setItem("auth_token", data.token);
    await AsyncStorage.setItem("auth_user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  };

  const continueAsGuest = async () => {
    const guestUser: User = {
      full_name: generateGuestId(),
      role: "guest",
      guest_id: generateGuestId(),
    };
    // Don't persist guest - it's session only
    setToken(null);
    setUser(guestUser);
  };

  const logout = async () => {
    await AsyncStorage.removeItem("auth_token");
    await AsyncStorage.removeItem("auth_user");
    setToken(null);
    setUser(null);
  };

  const updateUser = (updated: User) => {
    setUser(updated);
    AsyncStorage.setItem("auth_user", JSON.stringify(updated));
  };

  const value = useMemo(() => ({
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
  }), [user, token, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
