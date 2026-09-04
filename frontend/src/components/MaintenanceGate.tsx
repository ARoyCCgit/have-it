"use client"

import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { user_service, useAppData } from "@/context/Appcontext";
import HaveItLogo from "./HaveItLogo";
import { Wrench, RefreshCw, ShieldAlert } from "lucide-react";

interface SystemConfig {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  enableCalling: boolean;
  enableReels: boolean;
  enableStories: boolean;
}

export default function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { user } = useAppData();
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [checking, setChecking] = useState(false);

  const checkStatus = useCallback(async () => {
    setChecking(true);
    try {
      const { data } = await axios.get(`${user_service}/api/v1/system/config`);
      if (data.success && data.config) {
        setConfig(data.config);
      }
    } catch {
      // Non-blocking fallback
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
    // Poll status every 60 seconds
    const interval = setInterval(checkStatus, 60000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  // If maintenance is active and user is NOT admin, show maintenance screen
  if (config?.maintenanceMode && !isAdmin) {
    return (
      <div className="min-h-screen w-screen bg-[#0b141a] text-white flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="max-w-md w-full p-8 rounded-3xl bg-[#111b21] border border-[#03cafc]/30 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex justify-center">
            <HaveItLogo size={70} glow={true} />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Wrench className="w-3.5 h-3.5" />
              <span>Platform Maintenance</span>
            </div>
            <h1 className="text-xl font-black tracking-tight text-white">
              We&apos;ll Be Right Back!
            </h1>
            <p className="text-xs text-gray-300 leading-relaxed">
              {config.maintenanceMessage || "Have-it is currently undergoing scheduled infrastructure upgrades. We will be back online shortly."}
            </p>
          </div>

          <div className="pt-2 border-t border-gray-800">
            <button
              type="button"
              onClick={checkStatus}
              disabled={checking}
              className="px-5 py-2.5 bg-[#03cafc] hover:bg-[#029ecc] text-[#0b141a] font-bold text-xs rounded-xl shadow-lg shadow-[#03cafc]/20 transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`} />
              <span>{checking ? "Checking..." : "Check Status"}</span>
            </button>
          </div>

          <span className="text-[10px] text-gray-500 font-mono block">
            Have-it Infrastructure Engine • Secure Enclave
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Floating admin banner when maintenance mode is active */}
      {config?.maintenanceMode && isAdmin && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 px-4 py-1.5 rounded-full bg-rose-600/90 backdrop-blur-md text-white text-xs font-bold flex items-center gap-2 shadow-xl border border-rose-400/50 animate-bounce">
          <ShieldAlert className="w-4 h-4" />
          <span>Platform Maintenance Active — Admin Override</span>
        </div>
      )}
      {children}
    </>
  );
}
