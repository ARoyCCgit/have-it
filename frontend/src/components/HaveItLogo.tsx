"use client"

import React from 'react';

interface HaveItLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
  glow?: boolean;
}

export const HaveItLogo: React.FC<HaveItLogoProps> = ({
  size = 48,
  showText = false,
  className = '',
  glow = true,
}) => {
  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Icon Graphic */}
      <div
        className="relative flex items-center justify-center flex-shrink-0"
        style={{ width: size, height: size }}
      >
        {glow && (
          <div
            className="absolute inset-0 rounded-2xl bg-[#03cafc]/30 blur-md animate-pulse"
            style={{ transform: 'scale(1.08)' }}
          />
        )}
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full relative z-10 drop-shadow-[0_4px_12px_rgba(3,202,252,0.45)]"
        >
          <defs>
            {/* Primary Have-it Electric Cyan Gradient */}
            <linearGradient id="haveit-cyan-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#70e1fd" />
              <stop offset="50%" stopColor="#03cafc" />
              <stop offset="100%" stopColor="#0077b6" />
            </linearGradient>

            {/* Bubble Base Gradient */}
            <linearGradient id="haveit-bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#142129" />
              <stop offset="100%" stopColor="#0a1217" />
            </linearGradient>

            {/* Spark Connection Gradient */}
            <linearGradient id="haveit-spark-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#03cafc" />
              <stop offset="50%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#03cafc" />
            </linearGradient>
          </defs>

          {/* Background Outer Shield / Messenger Pod */}
          <rect
            x="4"
            y="4"
            width="92"
            height="92"
            rx="26"
            fill="url(#haveit-bg-grad)"
            stroke="url(#haveit-cyan-grad)"
            strokeWidth="3.5"
          />

          {/* Speech tail wing accent */}
          <path
            d="M 22 84 L 10 94 L 34 88 Z"
            fill="url(#haveit-cyan-grad)"
          />

          {/* Inner Glowing Orbit Arc */}
          <path
            d="M 24 24 C 50 14, 76 18, 84 42"
            stroke="#03cafc"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeOpacity="0.4"
          />

          {/* Left Pillar of 'H' (Sender Node) */}
          <rect
            x="27"
            y="26"
            width="10"
            height="48"
            rx="5"
            fill="url(#haveit-cyan-grad)"
          />
          {/* Top pulse dot on left pillar */}
          <circle cx="32" cy="26" r="3" fill="#ffffff" />

          {/* Right Pillar of 'H' (Receiver Node) */}
          <rect
            x="63"
            y="26"
            width="10"
            height="48"
            rx="5"
            fill="url(#haveit-cyan-grad)"
          />
          {/* Bottom pulse dot on right pillar */}
          <circle cx="68" cy="74" r="3" fill="#ffffff" />

          {/* Dynamic Lightning / Energy Bridge of 'H' */}
          <path
            d="M 37 46 L 55 42 L 45 54 L 63 50"
            stroke="url(#haveit-spark-grad)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Glowing Center Core */}
          <circle cx="50" cy="48" r="4.5" fill="#ffffff" />
          <circle cx="50" cy="48" r="7" fill="#03cafc" fillOpacity="0.3" />
        </svg>
      </div>

      {/* Brand Text */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <span className="text-xl font-extrabold tracking-tight text-white font-sans">
              Have<span className="text-[#03cafc]">-it</span>
            </span>
          </div>
          <span className="text-[10px] text-gray-400 font-medium tracking-wider uppercase -mt-0.5">
            Messenger
          </span>
        </div>
      )}
    </div>
  );
};

export default HaveItLogo;
