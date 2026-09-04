"use client"

import React, { useState, useRef, useEffect } from "react";
import { Sun, Moon, Laptop } from "lucide-react";
import { useTheme, ThemeMode } from "@/context/ThemeContext";

interface ThemeToggleBtnProps {
  className?: string;
}

export const ThemeToggleBtn: React.FC<ThemeToggleBtnProps> = ({ className = "" }) => {
  const { themeMode, resolvedTheme, setThemeMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const renderCurrentIcon = () => {
    if (themeMode === "system") {
      return <Laptop className="w-4 h-4 text-[#03cafc]" />;
    }
    if (resolvedTheme === "light") {
      return <Sun className="w-4 h-4 text-amber-400" />;
    }
    return <Moon className="w-4 h-4 text-[#03cafc]" />;
  };

  const options: Array<{ mode: ThemeMode; label: string; icon: React.ReactNode }> = [
    { mode: "light", label: "Light", icon: <Sun className="w-4 h-4 text-amber-400" /> },
    { mode: "dark", label: "Dark", icon: <Moon className="w-4 h-4 text-[#03cafc]" /> },
    { mode: "system", label: "System", icon: <Laptop className="w-4 h-4 text-gray-300" /> },
  ];

  return (
    <div className={`relative inline-block ${className}`} ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="p-2 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-xl transition-all cursor-pointer flex items-center justify-center border border-gray-700/50 shadow-sm"
        title={`Theme: ${themeMode} (${resolvedTheme} active)`}
      >
        {renderCurrentIcon()}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-36 bg-[#202c33] border border-gray-700 rounded-2xl shadow-2xl p-1.5 z-50 animate-in zoom-in-95 duration-100">
          <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400 px-2.5 py-1">
            Theme Mode
          </div>
          {options.map((opt) => (
            <button
              key={opt.mode}
              type="button"
              onClick={() => {
                setThemeMode(opt.mode);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                themeMode === opt.mode
                  ? "bg-[#03cafc] text-[#0b141a] font-bold"
                  : "text-gray-200 hover:bg-[#111b21]"
              }`}
            >
              <div className="flex items-center gap-2">
                {opt.icon}
                <span>{opt.label}</span>
              </div>
              {themeMode === opt.mode && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#0b141a]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ThemeToggleBtn;
