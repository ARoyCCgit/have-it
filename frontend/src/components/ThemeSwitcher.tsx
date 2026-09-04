"use client"

import React from "react";
import { Sun, Moon, Laptop } from "lucide-react";
import { useTheme, ThemeMode } from "@/context/ThemeContext";

interface ThemeSwitcherProps {
  className?: string;
  showLabels?: boolean;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  className = "",
  showLabels = true,
}) => {
  const { themeMode, resolvedTheme, setThemeMode } = useTheme();

  const options: Array<{ mode: ThemeMode; label: string; icon: React.ReactNode }> = [
    {
      mode: "light",
      label: "Light",
      icon: <Sun className="w-4 h-4" />,
    },
    {
      mode: "dark",
      label: "Dark",
      icon: <Moon className="w-4 h-4" />,
    },
    {
      mode: "system",
      label: "System",
      icon: <Laptop className="w-4 h-4" />,
    },
  ];

  return (
    <div
      className={`inline-flex items-center p-1 bg-gray-800/80 rounded-2xl border border-gray-700/60 shadow-inner ${className}`}
    >
      {options.map((opt) => {
        const isActive = themeMode === opt.mode;
        return (
          <button
            key={opt.mode}
            type="button"
            onClick={() => setThemeMode(opt.mode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isActive
                ? "bg-[#03cafc] text-[#0b141a] shadow-md shadow-[#03cafc]/30 font-bold scale-[1.02]"
                : "text-gray-400 hover:text-white hover:bg-gray-700/40"
            }`}
            title={`Set theme to ${opt.label} (currently ${resolvedTheme})`}
          >
            {opt.icon}
            {showLabels && <span>{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
};

export default ThemeSwitcher;
