"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type AdminThemeMode = "system" | "dark" | "light";

interface AdminThemeContextType {
  themeMode: AdminThemeMode;
  resolvedTheme: "dark" | "light";
  setThemeMode: (mode: AdminThemeMode) => void;
}

const AdminThemeContext = createContext<AdminThemeContextType | undefined>(undefined);

export const AdminThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<AdminThemeMode>("dark");
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("dark");

  const getSystemTheme = (): "dark" | "light" => {
    if (typeof window === "undefined") return "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("haveit_admin_theme") as AdminThemeMode;
    if (saved && ["system", "dark", "light"].includes(saved)) {
      setThemeModeState(saved);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const actual = themeMode === "system" ? getSystemTheme() : themeMode;
    setResolvedTheme(actual);

    const root = document.documentElement;
    if (actual === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
      root.setAttribute("data-theme", "dark");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
    }

    if (themeMode === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => {
        const nextTheme = e.matches ? "dark" : "light";
        setResolvedTheme(nextTheme);
        if (nextTheme === "dark") {
          root.classList.add("dark");
          root.classList.remove("light");
          root.setAttribute("data-theme", "dark");
        } else {
          root.classList.add("light");
          root.classList.remove("dark");
          root.setAttribute("data-theme", "light");
        }
      };
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [themeMode]);

  const setThemeMode = (mode: AdminThemeMode) => {
    setThemeModeState(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("haveit_admin_theme", mode);
    }
  };

  return (
    <AdminThemeContext.Provider value={{ themeMode, resolvedTheme, setThemeMode }}>
      {children}
    </AdminThemeContext.Provider>
  );
};

export const useAdminTheme = (): AdminThemeContextType => {
  const context = useContext(AdminThemeContext);
  if (!context) {
    throw new Error("useAdminTheme must be used within an AdminThemeProvider");
  }
  return context;
};

export default AdminThemeContext;
