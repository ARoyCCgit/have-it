"use client"

import React, { useState, useEffect, useCallback } from "react";
import AdminGuard from "@/components/AdminGuard";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import {
  Sliders,
  ShieldAlert,
  PhoneCall,
  Film,
  Clock,
  HardDrive,
  Mail,
  Check,
  Save,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { SettingsSkeleton } from "@/components/Skeleton";

interface SystemConfig {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  enableCalling: boolean;
  enableReels: boolean;
  enableStories: boolean;
  maxMediaUploadMb: number;
  maxOtpPerHour: number;
}

export default function SettingsPage() {
  const [config, setConfig] = useState<SystemConfig>({
    maintenanceMode: false,
    maintenanceMessage: "Have-it is currently undergoing scheduled infrastructure upgrades. We will be back online shortly.",
    enableCalling: true,
    enableReels: true,
    enableStories: true,
    maxMediaUploadMb: 50,
    maxOtpPerHour: 5,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/settings");
      if (data.success && data.config) {
        setConfig(data.config);
      }
    } catch (err) {
      console.error("Failed to load platform settings:", err);
      toast.error("Failed to load platform settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await axios.put("/api/settings", config);
      if (data.success) {
        toast.success("Platform settings and feature flags updated! ⚙️");
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
      toast.error("Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminGuard>
      <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden select-none">
        <AdminSidebar />
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <AdminHeader
            title="System Feature Flags & Platform Controls"
            description="Manage global platform killswitches, toggle WebRTC calling, regulate reels/stories, and trigger emergency maintenance mode."
          />

          <main className="flex-1 overflow-y-auto p-6 space-y-6 custom-scroll">
            {loading ? (
              <SettingsSkeleton />
            ) : (
              <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
                {/* 1. Maintenance Mode Killswitch */}
                <div className={`p-6 rounded-3xl border transition-all ${
                  config.maintenanceMode
                    ? "bg-rose-950/20 border-rose-500/50 shadow-2xl shadow-rose-950/30"
                    : "bg-slate-900/80 border-slate-800 shadow-xl"
                }`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className={`w-5 h-5 ${config.maintenanceMode ? "text-rose-400" : "text-slate-400"}`} />
                        <h3 className="text-sm font-bold text-white">Emergency Maintenance Mode</h3>
                      </div>
                      <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                        When enabled, all non-admin user access across web and mobile will be locked out with your custom maintenance banner.
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={config.maintenanceMode}
                        onChange={(e) => setConfig({ ...config, maintenanceMode: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                    </label>
                  </div>

                  {config.maintenanceMode && (
                    <div className="mt-4 pt-4 border-t border-rose-500/30 space-y-2 animate-in fade-in duration-200">
                      <label className="text-xs font-semibold text-rose-300 block">
                        Custom Maintenance Banner Message
                      </label>
                      <textarea
                        rows={2}
                        value={config.maintenanceMessage}
                        onChange={(e) => setConfig({ ...config, maintenanceMessage: e.target.value })}
                        className="w-full p-2.5 bg-slate-950 border border-rose-500/40 rounded-xl text-xs text-rose-200 focus:outline-none focus:border-rose-400 resize-none"
                      />
                    </div>
                  )}
                </div>

                {/* 2. Dynamic Feature Switches */}
                <div className="rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl p-6 space-y-5">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                    <Sliders className="w-4 h-4 text-[#03cafc]" />
                    <h3 className="text-sm font-bold text-white">Core Subsystem Feature Flags</h3>
                  </div>

                  {/* Calling Switch */}
                  <div className="flex items-center justify-between gap-4 py-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 font-bold text-xs text-white">
                        <PhoneCall className="w-3.5 h-3.5 text-[#03cafc]" />
                        <span>WebRTC Audio & Video Calling</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Enable peer-to-peer real-time voice and video calls between users.
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={config.enableCalling}
                        onChange={(e) => setConfig({ ...config, enableCalling: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#03cafc]"></div>
                    </label>
                  </div>

                  {/* Reels Switch */}
                  <div className="flex items-center justify-between gap-4 py-2 border-t border-slate-800/60">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 font-bold text-xs text-white">
                        <Film className="w-3.5 h-3.5 text-purple-400" />
                        <span>Vertical Video Reels</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Allow users to record, upload, and browse vertical short-form video reels.
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={config.enableReels}
                        onChange={(e) => setConfig({ ...config, enableReels: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#03cafc]"></div>
                    </label>
                  </div>

                  {/* Stories Switch */}
                  <div className="flex items-center justify-between gap-4 py-2 border-t border-slate-800/60">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 font-bold text-xs text-white">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>24-Hour Ephemeral Stories</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Enable daily status stories that automatically expire after 24 hours.
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={config.enableStories}
                        onChange={(e) => setConfig({ ...config, enableStories: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#03cafc]"></div>
                    </label>
                  </div>
                </div>

                {/* 3. Platform Rate Limits & Quotas */}
                <div className="rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl p-6 space-y-5">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                    <HardDrive className="w-4 h-4 text-[#03cafc]" />
                    <h3 className="text-sm font-bold text-white">Resource Quotas & Rate Safeguards</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Max Media Size */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 block">
                        Max Media Upload Size per File (MB)
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={500}
                        value={config.maxMediaUploadMb}
                        onChange={(e) => setConfig({ ...config, maxMediaUploadMb: Number(e.target.value) })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-[#03cafc]"
                      />
                      <span className="text-[10px] text-slate-500">Allowed range: 5 MB to 500 MB</span>
                    </div>

                    {/* Max OTP Requests */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 block flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span>Max OTP Verification Attempts / Hour</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={config.maxOtpPerHour}
                        onChange={(e) => setConfig({ ...config, maxOtpPerHour: Number(e.target.value) })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-[#03cafc]"
                      />
                      <span className="text-[10px] text-slate-500">Prevents email relay abuse</span>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={fetchConfig}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reset Changes</span>
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 bg-[#03cafc] hover:bg-[#029ecc] text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-[#03cafc]/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>Save Platform Settings</span>
                  </button>
                </div>
              </form>
            )}
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}
