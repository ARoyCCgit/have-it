"use client";

import React, { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import HaveItLogo from "./HaveItLogo";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const PWARegister: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("✅ Have-it PWA Service Worker registered:", reg.scope);
          })
          .catch((err) => {
            console.warn("Service Worker registration failed:", err);
          });
      });
    }

    // 2. Check if already installed / running in standalone mode
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        // @ts-expect-error navigator.standalone is iOS-specific
        Boolean(window.navigator.standalone);
      setIsStandalone(isStandaloneMode);
      return isStandaloneMode;
    };

    if (checkStandalone()) return;

    // 3. Detect iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 4. Check if user recently dismissed the banner
    const dismissedUntil = localStorage.getItem("haveit_pwa_dismissed");
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) {
      return;
    }

    // 5. Android / Chrome / Edge install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 6. On iOS show helper after a short delay if in Safari browser
    if (isIosDevice && !checkStandalone()) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    // Suppress for 7 days
    localStorage.setItem("haveit_pwa_dismissed", String(Date.now() + 7 * 24 * 60 * 60 * 1000));
  };

  if (!showBanner || isStandalone) return null;

  return (
    <div className="fixed bottom-3 inset-x-3 sm:left-auto sm:right-4 sm:bottom-4 z-50 max-w-sm mx-auto bg-[#182730] border border-[#03cafc]/40 rounded-2xl p-3.5 shadow-2xl shadow-black/80 animate-in slide-in-from-bottom duration-300">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <HaveItLogo size={36} glow={false} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white tracking-tight">Install Have-it App</h4>
            <button
              onClick={handleDismiss}
              className="p-1 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer -mr-1"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-gray-300 mt-0.5 leading-snug">
            {isIOS
              ? "Install on iPhone: tap Share, then 'Add to Home Screen' for instant messenger access."
              : "Install on your home screen for full-screen messaging and instant updates."}
          </p>

          <div className="mt-2.5 flex items-center gap-2">
            {!isIOS && deferredPrompt && (
              <button
                onClick={handleInstallClick}
                className="px-3 py-1.5 bg-[#03cafc] hover:bg-[#029ecc] text-[#0b141a] text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-[#03cafc]/20 transition-all cursor-pointer active:scale-95"
              >
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Install</span>
              </button>
            )}
            {isIOS && (
              <div className="flex items-center gap-1 text-[11px] text-[#03cafc] font-semibold bg-[#111b21] px-2.5 py-1 rounded-lg border border-[#03cafc]/20">
                <Share className="w-3 h-3" />
                <span>Tap Share &gt; Add to Home Screen</span>
              </div>
            )}
            <button
              onClick={handleDismiss}
              className="px-2.5 py-1 text-gray-400 hover:text-white text-xs font-medium cursor-pointer"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PWARegister;
