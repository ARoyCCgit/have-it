"use client"

import React, { useState, useRef, useEffect } from "react";
import { Sun, Moon, Laptop } from "lucide-react";
import { useAdminTheme, AdminThemeMode } from "@/context/AdminThemeContext";

export const AdminThemeToggle: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { themeMode, resolvedTheme, setThemeMode } = useAdminTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const renderIcon = () => {
    if (themeMode === "system") return <Laptop className="w-4 h-4 text-[#03cafc]" />;
    if (resolvedTheme === "light") return <Sun className="w-4 h-4 text-amber-500" />;
    return <Moon className="w-4 h-4 text-[#03cafc]" />;
  };

  const options: Array<{ mode: AdminThemeMode; label: string; icon: React.ReactNode }> = [
    { mode: "light", label: "Light", icon: <Sun className="w-4 h-4 text-amber-500" /> },
    { mode: "dark", label: "Dark", icon: <Moon className="w-4 h-4 text-[#03cafc]" /> },
    { mode: "system", label: "System", icon: <Laptop className="w-4 h-4 text-gray-400" /> },
  ];

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="p-2 rounded-xl border border-gray-700/60 hover:bg-gray-800/40 text-gray-300 hover:text-white transition-all cursor-pointer flex items-center justify-center shadow-sm"
        title={`Admin Theme: ${themeMode} (${resolvedTheme} active)`}
      >
        {renderIcon()}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-36 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-1.5 z-50 animate-in zoom-in-95 duration-100">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2.5 py-1">
            Console Theme
          </div>
          {options.map((opt) => (
            <button
              key={opt.mode}
              type="button"
              onClick={() => {
                setThemeMode(opt.mode);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                themeMode === opt.mode
                  ? "bg-[#03cafc] text-[#080e12] font-bold"
                  : "text-slate-200 hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center gap-2">
                {opt.icon}
                <span>{opt.label}</span>
              </div>
              {themeMode === opt.mode && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#080e12]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminThemeToggle;
