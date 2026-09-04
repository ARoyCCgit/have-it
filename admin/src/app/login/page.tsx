"use client"

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { ShieldCheck, Mail, KeyRound, Loader2, ArrowRight, ShieldAlert } from "lucide-react";
import AdminThemeToggle from "@/components/AdminThemeToggle";

export default function AdminLoginPage() {
  const { isAuthenticated, requestOtp, verifyOtp } = useAdminAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    const success = await requestOtp(email.trim().toLowerCase());
    setLoading(false);
    if (success) {
      setStep("otp");
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;

    setLoading(true);
    const success = await verifyOtp(email.trim().toLowerCase(), otp.trim());
    setLoading(false);
    if (success) {
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative select-none">
      {/* Top Bar Theme Toggle */}
      <div className="absolute top-4 right-4">
        <AdminThemeToggle />
      </div>

      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        {/* Header Icon & Branding */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#03cafc] to-sky-400 mx-auto flex items-center justify-center shadow-xl shadow-[#03cafc]/20">
            <ShieldCheck className="w-8 h-8 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">
              Have<span className="text-[#03cafc]">-it</span> Command Center
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Elevated Administrative Gateway & API Control
            </p>
          </div>
        </div>

        {/* Form */}
        {step === "email" ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Admin Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="admin@haveit.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 focus:border-[#03cafc] rounded-xl text-sm text-white focus:outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#03cafc] hover:bg-[#029ecc] text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-[#03cafc]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Request Admin OTP</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Verification Code
                </label>
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className="text-[11px] text-[#03cafc] hover:underline cursor-pointer"
                >
                  Change email
                </button>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 focus:border-[#03cafc] rounded-xl text-sm text-white font-mono tracking-widest text-center focus:outline-none transition-colors"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 text-center">
                Code sent to <span className="text-slate-300 font-mono">{email}</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full py-3 bg-[#03cafc] hover:bg-[#029ecc] text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-[#03cafc]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authenticate & Enter Console</span>
                </>
              )}
            </button>
          </form>
        )}

        <div className="pt-3 border-t border-slate-800 text-center">
          <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Encrypted Session • Role Verification Enforced</span>
          </p>
        </div>
      </div>
    </div>
  );
}
