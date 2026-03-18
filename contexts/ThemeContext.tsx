import React, { createContext, useState, useContext, ReactNode, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ColorValue, OpaqueColorValue } from "react-native";

// ---------------- TYPES ----------------
type ThemeType = {
  successBackground: ColorValue | undefined;
  border: ColorValue | undefined;
  borderLight: ColorValue | undefined;
  error: string | OpaqueColorValue | undefined;
  success: ColorValue | undefined;
  shadow: string;
  cardBackground: string;
  textSecondary: string;
  background: string;
  text: string;
  textLight: string;
  primary: string;
};

type ThemeContextType = {
  isDarkTheme: boolean;
  theme: ThemeType;
  toggleTheme: () => void;
};

// ---------------- DEFAULT THEME ----------------
const defaultTheme: ThemeContextType = {
  isDarkTheme: false,
  theme: {
    background: "#FFF",
    text: "#000",
    textLight: "#666",
    textSecondary: "#888",
    primary: "#FF4500",
    cardBackground: "#FFF",
    shadow: "#000",
    successBackground: undefined,
    border: undefined,
    borderLight: undefined,
    error: undefined,
    success: undefined
  },
  toggleTheme: () => {},
};

// ---------------- CONTEXT ----------------
const ThemeContext = createContext<ThemeContextType>(defaultTheme);

export const useTheme = () => useContext(ThemeContext);

// ---------------- PROVIDER ----------------
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  // Light and Dark theme objects
  const light: ThemeType = {
    background: "#FFF",
    text: "#000",
    textLight: "#666",
    textSecondary: "#888",
    primary: "#FF4500",
    cardBackground: "#FFF",
    shadow: "#000",
    successBackground: undefined,
    border: undefined,
    borderLight: undefined,
    error: undefined,
    success: undefined
  };

  const dark: ThemeType = {
    background: "#000",
    text: "#FFF",
    textLight: "#AAA",
    textSecondary: "#CCC",
    primary: "#FF4500",
    cardBackground: "#111",
    shadow: "#FFF",
    successBackground: undefined,
    border: undefined,
    borderLight: undefined,
    error: undefined,
    success: undefined
  };

  // Toggle theme and save in AsyncStorage
  const toggleTheme = () => {
    const newValue = !isDarkTheme;
    setIsDarkTheme(newValue);
    AsyncStorage.setItem("darkTheme", newValue ? "true" : "false");
  };

  // Load theme from AsyncStorage
  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem("darkTheme");
      if (stored) setIsDarkTheme(stored === "true");
    })();
  }, []);

  return (
    <ThemeContext.Provider
      value={{ isDarkTheme, toggleTheme, theme: isDarkTheme ? dark : light }}
    >
      {children}
    </ThemeContext.Provider>
  );
};