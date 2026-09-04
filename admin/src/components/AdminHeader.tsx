"use client"

import React from "react";
import { AdminThemeToggle } from "./AdminThemeToggle";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { Activity, Radio } from "lucide-react";

interface AdminHeaderProps {
  title: string;
  description?: string;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ title, description }) => {
  const { adminUser } = useAdminAuth();

  return (
    <header className="h-16 px-6 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md flex items-center justify-between select-none">
      <div>
        <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          <span>{title}</span>
        </h1>
        {description && (
          <p className="text-xs text-slate-400 mt-0.5">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Microservices Live Health Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span>Core Microservices Active</span>
        </div>

        {/* 3-Mode Theme Selector */}
        <AdminThemeToggle />

        {/* Admin Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#03cafc] to-sky-400 p-[1.5px] shadow-sm">
          <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
            {adminUser?.avatar && typeof adminUser.avatar === "object" && adminUser.avatar.url ? (
              <img src={adminUser.avatar.url} alt="Admin" className="w-full h-full object-cover" />
            ) : (
              adminUser?.name?.slice(0, 1).toUpperCase() || "A"
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
