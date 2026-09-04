"use client"

import React from "react";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { ShieldAlert, Loader2, Lock } from "lucide-react";
import { useRouter } from "next/navigation";

export const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { adminUser, loading, isAuthenticated } = useAdminAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-2 border-[#03cafc]/20 border-t-[#03cafc] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Lock className="w-5 h-5 text-[#03cafc]" />
          </div>
        </div>
        <p className="mt-4 text-xs font-semibold tracking-wider uppercase text-slate-400">
          Verifying Administrative Access...
        </p>
      </div>
    );
  }

  if (!isAuthenticated || !adminUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Administrative Access Required</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              This terminal is reserved exclusively for Have-it platform administrators. Please authenticate with your verified administrative credentials.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/login")}
            className="w-full py-3 bg-[#03cafc] hover:bg-[#029ecc] text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-[#03cafc]/20 transition-all cursor-pointer"
          >
            Authenticate Admin Credentials
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminGuard;
