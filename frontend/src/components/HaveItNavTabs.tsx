"use client"

import React from "react";
import Link from "next/link";
import { MessageSquare, LayoutGrid, Film, Compass } from "lucide-react";
import { usePathname } from "next/navigation";
import { usePostSocket } from "@/context/PostSocketContext";

interface HaveItNavTabsProps {
  unreadChatsCount?: number;
}

export const HaveItNavTabs: React.FC<HaveItNavTabsProps> = ({ unreadChatsCount = 0 }) => {
  const pathname = usePathname();
  const { unreadNotifsCount } = usePostSocket();
  const isChatActive = pathname?.startsWith("/chat");
  const isPostsActive = pathname === "/posts";
  const isReelsActive = pathname?.startsWith("/reels");
  const isExploreActive = pathname?.startsWith("/explore");

  return (
    <div className="bg-[#111b21] border-b border-gray-800/80 px-2 pt-2 flex items-center justify-between">
      {/* Chats Tab */}
      <Link
        href="/chat"
        prefetch={true}
        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs sm:text-sm font-semibold transition-all relative cursor-pointer ${
          isChatActive
            ? "text-[#03cafc]"
            : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/30 rounded-t-lg"
        }`}
      >
        <MessageSquare className={`w-4 h-4 ${isChatActive ? "text-[#03cafc]" : "text-gray-400"}`} />
        <span>Chats</span>
        {unreadChatsCount > 0 && (
          <span className="ml-1 px-1.5 py-0.2 bg-[#03cafc] text-[#0b141a] text-[10px] font-bold rounded-full">
            {unreadChatsCount}
          </span>
        )}
        {/* Active Underline Indicator */}
        {isChatActive && (
          <div className="absolute bottom-0 inset-x-2 h-[3px] bg-[#03cafc] rounded-t-full shadow-sm shadow-[#03cafc]/40 animate-in fade-in" />
        )}
      </Link>

      {/* Feed Tab */}
      <Link
        href="/posts"
        prefetch={true}
        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs sm:text-sm font-semibold transition-all relative cursor-pointer ${
          isPostsActive
            ? "text-[#03cafc]"
            : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/30 rounded-t-lg"
        }`}
      >
        <LayoutGrid className={`w-4 h-4 ${isPostsActive ? "text-[#03cafc]" : "text-gray-400"}`} />
        <span>Feed</span>
        {unreadNotifsCount > 0 && (
          <span className="ml-1 px-1.5 py-0.2 bg-rose-500 text-white text-[10px] font-bold rounded-full animate-pulse">
            {unreadNotifsCount}
          </span>
        )}
        {/* Active Underline Indicator */}
        {isPostsActive && (
          <div className="absolute bottom-0 inset-x-2 h-[3px] bg-[#03cafc] rounded-t-full shadow-sm shadow-[#03cafc]/40 animate-in fade-in" />
        )}
      </Link>

      {/* Reels Tab */}
      <Link
        href="/reels"
        prefetch={true}
        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs sm:text-sm font-semibold transition-all relative cursor-pointer ${
          isReelsActive
            ? "text-[#03cafc]"
            : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/30 rounded-t-lg"
        }`}
      >
        <Film className={`w-4 h-4 ${isReelsActive ? "text-[#03cafc]" : "text-gray-400"}`} />
        <span>Reels</span>
        {/* Active Underline Indicator */}
        {isReelsActive && (
          <div className="absolute bottom-0 inset-x-2 h-[3px] bg-[#03cafc] rounded-t-full shadow-sm shadow-[#03cafc]/40 animate-in fade-in" />
        )}
      </Link>

      {/* Explore Tab */}
      <Link
        href="/explore"
        prefetch={true}
        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs sm:text-sm font-semibold transition-all relative cursor-pointer ${
          isExploreActive
            ? "text-[#03cafc]"
            : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/30 rounded-t-lg"
        }`}
      >
        <Compass className={`w-4 h-4 ${isExploreActive ? "text-[#03cafc]" : "text-gray-400"}`} />
        <span>Explore</span>
        {/* Active Underline Indicator */}
        {isExploreActive && (
          <div className="absolute bottom-0 inset-x-2 h-[3px] bg-[#03cafc] rounded-t-full shadow-sm shadow-[#03cafc]/40 animate-in fade-in" />
        )}
      </Link>
    </div>
  );
};

export default HaveItNavTabs;
