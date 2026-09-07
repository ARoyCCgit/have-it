"use client"

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  Webhook,
  Megaphone,
  Settings,
  LogOut,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { useAdminAuth } from "@/context/AdminAuthContext";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
}

export const AdminSidebar: React.FC = () => {
  const pathname = usePathname();
  const { adminUser, logout } = useAdminAuth();

  const navItems: NavItem[] = [
    {
      label: "Analytics & Overview",
      href: "/",
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      label: "User Management",
      href: "/users",
      icon: <Users className="w-4 h-4" />,
    },
    {
      label: "Content Moderation",
      href: "/moderation",
      icon: <ShieldAlert className="w-4 h-4" />,
    },
    {
      label: "API & Webhooks Hub",
      href: "/webhooks",
      icon: <Webhook className="w-4 h-4" />,
      badge: "Cloud API",
    },
    {
      label: "Broadcast Studio",
      href: "/broadcast",
      icon: <Megaphone className="w-4 h-4" />,
    },
    {
      label: "System Controls",
      href: "/settings",
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  return (
    <aside className="w-64 h-screen border-r border-slate-800 bg-slate-950 flex flex-col justify-between select-none shrink-0">
      {/* Top Brand Logo */}
      <div>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#03cafc] to-sky-400 flex items-center justify-center shadow-lg shadow-[#03cafc]/20">
              <ShieldCheck className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
                <span>Have<span className="text-[#03cafc]">-it</span></span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-[#03cafc]/15 text-[#03cafc] rounded border border-[#03cafc]/30 font-bold">
                  Admin
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block font-medium">Enterprise Control Hub</span>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-[#03cafc] text-slate-950 font-bold shadow-md shadow-[#03cafc]/20"
                    : "text-slate-300 hover:text-white hover:bg-slate-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                      isActive ? "bg-slate-950 text-[#03cafc]" : "bg-[#03cafc]/15 text-[#03cafc]"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom User Profile & Consumer App Link */}
      <div className="p-3 border-t border-slate-800 space-y-2">
        <a
          href={process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000"}
          target="_blank"
          rel="noreferrer"
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-[#03cafc] hover:bg-slate-900 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Consumer App</span>
          </span>
        </a>

        {/* Admin Info Card */}
        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div className="min-w-0 flex-1 pr-2">
            <div className="text-xs font-bold text-white truncate">{adminUser?.name || "Admin User"}</div>
            <div className="text-[10px] text-slate-400 font-mono truncate">{adminUser?.email}</div>
            <span className="inline-block mt-0.5 text-[9px] font-extrabold uppercase tracking-widest text-[#03cafc]">
              {adminUser?.role === "super_admin" ? "SUPER ADMIN" : "PLATFORM ADMIN"}
            </span>
          </div>
          <button
            type="button"
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
            title="Terminate Admin Session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
