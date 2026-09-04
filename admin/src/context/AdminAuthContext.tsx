"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import Cookies from "js-cookie";
import axios from "axios";
import toast from "react-hot-toast";

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "super_admin" | "moderator" | "user";
  avatar?: { url?: string } | string;
  isVerified?: boolean;
  isBanned?: boolean;
}

interface AdminAuthContextType {
  adminUser: AdminUser | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  requestOtp: (email: string) => Promise<boolean>;
  verifyOtp: (email: string, otp: string) => Promise<boolean>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const USER_SERVICE = process.env.NEXT_PUBLIC_USER_SERVICE || "http://localhost:5000";

export const AdminAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Validate session on load
  const validateSession = async () => {
    const savedToken = Cookies.get("haveit_admin_token");
    if (!savedToken) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await axios.get(`${USER_SERVICE}/api/v1/me`, {
        headers: { Authorization: `Bearer ${savedToken}` },
      });

      const user = data.user || data;
      if (user && (user.role === "admin" || user.role === "super_admin")) {
        setAdminUser(user);
        setToken(savedToken);
      } else {
        // Not an admin: clear cookie
        Cookies.remove("haveit_admin_token");
        setAdminUser(null);
        setToken(null);
        toast.error("Access Denied: Administrative permissions required.");
      }
    } catch (err) {
      console.error("Failed to validate admin session:", err);
      Cookies.remove("haveit_admin_token");
      setAdminUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    validateSession();
  }, []);

  const requestOtp = async (email: string): Promise<boolean> => {
    try {
      const { data } = await axios.post(`${USER_SERVICE}/api/v1/login`, { email });
      toast.success(data.message || "OTP code sent to your admin email.");
      return true;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to send OTP code.");
      return false;
    }
  };

  const verifyOtp = async (email: string, otp: string): Promise<boolean> => {
    try {
      const { data } = await axios.post(`${USER_SERVICE}/api/v1/verify`, { email, otp });
      const user = data.user;
      const newToken = data.token;

      if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
        toast.error("403 Forbidden: You do not have administrative privileges.");
        return false;
      }

      Cookies.set("haveit_admin_token", newToken, { expires: 15 });
      setAdminUser(user);
      setToken(newToken);
      toast.success(`Welcome to Have-it Command Center, ${user.name}! 👑`);
      return true;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Invalid OTP code.");
      return false;
    }
  };

  const logout = () => {
    Cookies.remove("haveit_admin_token");
    setAdminUser(null);
    setToken(null);
    toast.success("Admin session terminated.");
  };

  return (
    <AdminAuthContext.Provider
      value={{
        adminUser,
        token,
        loading,
        isAuthenticated: Boolean(adminUser && token),
        requestOtp,
        verifyOtp,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = (): AdminAuthContextType => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
};

export default AdminAuthContext;
