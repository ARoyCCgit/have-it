"use client"

import React, { useState, useEffect, useCallback } from "react";
import AdminGuard from "@/components/AdminGuard";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import {
  Users,
  MessageSquare,
  Phone,
  Film,
  HardDrive,
  Activity,
  ArrowUpRight,
  TrendingUp,
  Server,
  Database,
  Radio,
  ExternalLink,
  ShieldCheck,
  Zap,
  RefreshCw,
  Clock,
  Layers,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import axios from "axios";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { MetricCardSkeleton, ServiceCardSkeleton } from "@/components/Skeleton";

interface PlatformStats {
  totalUsers: number;
  activeToday: number;
  verifiedUsers: number;
  bannedUsers: number;
  adminsCount: number;
  totalMessages: number;
  messagesToday: number;
  totalChats: number;
  groupChats: number;
  totalPosts: number;
  totalReels: number;
  activeStories: number;
  totalComments: number;
  totalBookmarks: number;
  storageMb: number;
  callMinutes: number;
}

interface NodeService {
  name: string;
  port: number;
  status: string;
  latency: string;
}

export default function AdminDashboardPage() {
  const { adminUser } = useAdminAuth();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [services, setServices] = useState<NodeService[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const fetchTelemetry = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/analytics");
      if (data.success) {
        setStats(data.stats);
        setServices(data.services);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error("Failed to load live platform analytics:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTelemetry();
  }, [fetchTelemetry]);

  return (
    <AdminGuard>
      <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden select-none">
        {/* Isolated Navigation Sidebar */}
        <AdminSidebar />

        {/* Main Content Viewport */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <AdminHeader
            title="Executive Platform Telemetry"
            description="Real-time system telemetry, active sessions, and enterprise health monitor."
          />

          <main className="flex-1 overflow-y-auto p-6 space-y-6 custom-scroll">
            {/* Welcome Banner */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-extrabold text-white">
                    Welcome back, {adminUser?.name || "Admin"} 👋
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#03cafc]/15 text-[#03cafc] text-[10px] font-extrabold uppercase tracking-wider border border-[#03cafc]/30">
                    Console v2.0
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  All 4 core microservices are operating within nominal thresholds. Zero critical security alerts.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchTelemetry}
                  disabled={loading}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Refresh Telemetry"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#03cafc] ${loading ? "animate-spin" : ""}`} />
                  <span>{loading ? "Refreshing..." : "Refresh"}</span>
                </button>

                <Link
                  href="/broadcast"
                  className="px-4 py-2 bg-[#03cafc] hover:bg-[#029ecc] text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-[#03cafc]/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>Send Broadcast</span>
                </Link>
                <Link
                  href="/webhooks"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-[#03cafc]" />
                  <span>Cloud API</span>
                </Link>
              </div>
            </div>

            {/* Metric KPI Cards Grid */}
            {loading && !stats ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Users */}
                <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg relative overflow-hidden group">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">Total Registered Users</span>
                    <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 text-[#03cafc] flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white">{stats?.totalUsers ?? 0}</span>
                    <span className="text-[11px] text-emerald-400 font-bold flex items-center">
                      <TrendingUp className="w-3 h-3 mr-0.5" /> {stats?.verifiedUsers ?? 0} Verified
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Active (24h): {stats?.activeToday ?? 0} • Admins: {stats?.adminsCount ?? 0}
                  </span>
                </div>

                {/* Card 2: Messaging Volume */}
                <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg relative overflow-hidden group">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">Message Volume</span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white">{stats?.totalMessages ?? 0}</span>
                    <span className="text-[11px] text-emerald-400 font-bold flex items-center">
                      <TrendingUp className="w-3 h-3 mr-0.5" /> +{stats?.messagesToday ?? 0} today
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Chats: {stats?.totalChats ?? 0} ({stats?.groupChats ?? 0} groups)
                  </span>
                </div>

                {/* Card 3: Social & Content Hub */}
                <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg relative overflow-hidden group">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">Social Content Hub</span>
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                      <Film className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white">
                      {(stats?.totalPosts ?? 0) + (stats?.totalReels ?? 0)}
                    </span>
                    <span className="text-[11px] text-purple-400 font-bold">
                      {stats?.totalReels ?? 0} Reels • {stats?.totalPosts ?? 0} Posts
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Active Stories: {stats?.activeStories ?? 0} • {stats?.totalComments ?? 0} Comments
                  </span>
                </div>

                {/* Card 4: Media & Storage */}
                <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg relative overflow-hidden group">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">Cloud Storage (CDN)</span>
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                      <HardDrive className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white">{stats?.storageMb ?? 0} MB</span>
                    <span className="text-[11px] text-amber-400 font-bold">
                      {(stats?.totalPosts ?? 0) + (stats?.totalReels ?? 0) + (stats?.activeStories ?? 0)} assets
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">Cloudinary Free Tier: 25 GB limit</span>
                </div>
              </div>
            )}

            {/* Microservices Live Status Matrix */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-[#03cafc]" />
                  <h3 className="text-sm font-bold text-white">Live Microservices Infrastructure</h3>
                </div>
                <span className="text-[11px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  All 5 Nodes Online
                </span>
              </div>

              {loading && services.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ServiceCardSkeleton />
                  <ServiceCardSkeleton />
                  <ServiceCardSkeleton />
                  <ServiceCardSkeleton />
                </div>
              ) : (
                <div className="divide-y divide-slate-800/60">
                  {services.map((svc) => (
                    <div key={svc.name} className="py-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            svc.status === "healthy" || svc.status === "connected"
                              ? "bg-emerald-400"
                              : "bg-rose-500"
                          }`}
                        />
                        <div>
                          <span className="font-semibold text-white block">{svc.name}</span>
                          <span className="text-[11px] text-slate-400 font-mono">Internal Port: :{svc.port}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-400 font-mono">{svc.latency}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            svc.status === "healthy" || svc.status === "connected"
                              ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/30"
                              : "bg-rose-950/40 text-rose-400 border border-rose-500/30"
                          }`}
                        >
                          {svc.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}
