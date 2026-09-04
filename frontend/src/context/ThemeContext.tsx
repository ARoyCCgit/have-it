"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAppData } from "./Appcontext";

export type ThemeMode = "system" | "dark" | "light";

interface ThemeContextType {
  themeMode: ThemeMode;
  resolvedTheme: "dark" | "light";
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, updateUserTheme } = useAppData();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("dark");

  // Determine current system preference
  const getSystemTheme = (): "dark" | "light" => {
    if (typeof window === "undefined") return "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };

  // 1. Initial Load: Read from user profile or localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    let savedMode: ThemeMode = "system";
    if (user?.theme && ["system", "dark", "light"].includes(user.theme)) {
      savedMode = user.theme as ThemeMode;
    } else {
      const local = localStorage.getItem("haveit_theme") as ThemeMode;
      if (local && ["system", "dark", "light"].includes(local)) {
        savedMode = local;
      }
    }

    setThemeModeState(savedMode);
  }, [user?.theme]);

  // 2. Apply theme classes to <html>
  useEffect(() => {
    if (typeof window === "undefined") return;

    const actualTheme = themeMode === "system" ? getSystemTheme() : themeMode;
    setResolvedTheme(actualTheme);

    const root = document.documentElement;
    if (actualTheme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
      root.setAttribute("data-theme", "dark");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
    }

    // Listen for OS changes if in system mode
    if (themeMode === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = (e: MediaQueryListEvent) => {
        const newTheme = e.matches ? "dark" : "light";
        setResolvedTheme(newTheme);
        if (newTheme === "dark") {
          root.classList.add("dark");
          root.classList.remove("light");
          root.setAttribute("data-theme", "dark");
        } else {
          root.classList.add("light");
          root.classList.remove("dark");
          root.setAttribute("data-theme", "light");
        }
      };

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [themeMode]);

  // 3. Setter function: updates local state, localStorage, and backend
  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("haveit_theme", mode);
    }

    // Persist to backend database via user service
    if (updateUserTheme) {
      await updateUserTheme(mode);
    }
  };

  return (
    <ThemeContext.Provider value={{ themeMode, resolvedTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export default ThemeContext;
