"use client"

import React from "react";

export function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`skeleton animate-pulse rounded-xl bg-gray-800/80 border border-gray-700/40 ${className}`}
    />
  );
}

// 1. Chat List Conversation Rows Skeleton (ChatSidebar)
export function ChatListSkeleton({ count = 7 }: { count?: number }) {
  return (
    <div className="space-y-1.5 p-1 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-2.5 rounded-xl border border-transparent flex items-center gap-3"
        >
          <Skeleton className="w-12 h-12 rounded-full shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-2.5 w-10" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-2.5 w-40" />
              {i % 3 === 0 && <Skeleton className="h-4 w-4 rounded-full" />}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// 2. Chat Message Stream Skeleton (ChatMessages)
export function MessageStreamSkeleton() {
  return (
    <div className="space-y-4 p-4 w-full h-full flex flex-col justify-end">
      {/* Date badge placeholder */}
      <div className="flex justify-center mb-2">
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>

      {/* Message 1: Incoming */}
      <div className="flex items-end gap-2 justify-start max-w-[75%]">
        <Skeleton className="h-10 w-44 rounded-2xl rounded-bl-sm" />
      </div>

      {/* Message 2: Incoming longer */}
      <div className="flex items-end gap-2 justify-start max-w-[75%]">
        <div className="space-y-1.5">
          <Skeleton className="h-14 w-64 rounded-2xl rounded-bl-sm" />
        </div>
      </div>

      {/* Message 3: Outgoing */}
      <div className="flex items-end gap-2 justify-end self-end max-w-[75%]">
        <Skeleton className="h-10 w-48 rounded-2xl rounded-br-sm bg-[#03cafc]/20 border-[#03cafc]/30" />
      </div>

      {/* Message 4: Outgoing with media */}
      <div className="flex items-end gap-2 justify-end self-end max-w-[75%]">
        <div className="space-y-1">
          <Skeleton className="h-36 w-56 rounded-2xl rounded-br-sm bg-[#03cafc]/20 border-[#03cafc]/30" />
        </div>
      </div>

      {/* Message 5: Incoming reply */}
      <div className="flex items-end gap-2 justify-start max-w-[75%]">
        <Skeleton className="h-12 w-52 rounded-2xl rounded-bl-sm" />
      </div>
    </div>
  );
}

// 3. Post Card Skeleton (Posts Feed)
export function PostCardSkeleton() {
  return (
    <div className="bg-[#111b21] border border-gray-800 rounded-2xl p-4 shadow-lg space-y-3.5 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full shrink-0" />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        </div>
        <Skeleton className="w-6 h-6 rounded-md" />
      </div>

      {/* Post Media Content */}
      <Skeleton className="w-full aspect-[4/3] rounded-xl" />

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-4">
          <Skeleton className="w-6 h-6 rounded-full" />
          <Skeleton className="w-6 h-6 rounded-full" />
          <Skeleton className="w-6 h-6 rounded-full" />
        </div>
        <Skeleton className="w-6 h-6 rounded-full" />
      </div>

      {/* Captions & Likes */}
      <div className="space-y-1.5 pt-1">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-2.5 w-1/3" />
      </div>
    </div>
  );
}

// 4. Explore Grid Skeleton (Explore Page & Profile Grid)
export function ExploreGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-1 sm:gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="aspect-square w-full rounded-lg sm:rounded-xl" />
      ))}
    </div>
  );
}

// 5. Profile Page Skeleton (Profile Page & [userId] Page)
export function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-6 space-y-6">
      {/* Profile Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <Skeleton className="w-24 h-24 sm:w-28 sm:h-28 rounded-full shrink-0" />
        <div className="flex-1 text-center sm:text-left space-y-3 w-full">
          <div className="space-y-1.5 flex flex-col items-center sm:items-start">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-3.5 w-full max-w-sm" />
          <div className="flex items-center justify-center sm:justify-start gap-6 pt-1">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </div>

      {/* Profile Tabs */}
      <div className="flex justify-center border-b border-gray-800 gap-8 pt-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>

      {/* Media Grid */}
      <ExploreGridSkeleton count={6} />
    </div>
  );
}

// 6. Reel Skeleton (Reels Page)
export function ReelSkeleton() {
  return (
    <div className="relative w-full max-w-sm h-[78vh] sm:h-[82vh] rounded-3xl bg-[#111b21] border border-gray-800 overflow-hidden shadow-2xl flex flex-col justify-between p-4 my-auto">
      {/* Top Header Placeholder */}
      <div className="flex items-center justify-between z-10">
        <Skeleton className="h-4 w-24 rounded-full" />
        <Skeleton className="h-7 w-7 rounded-full" />
      </div>

      {/* Main Shimmer Area */}
      <div className="absolute inset-0 skeleton" />

      {/* Right-Side Action Pill Column */}
      <div className="absolute right-3 bottom-16 flex flex-col items-center gap-4 z-10">
        <Skeleton className="w-10 h-10 rounded-full" />
        <Skeleton className="w-10 h-10 rounded-full" />
        <Skeleton className="w-10 h-10 rounded-full" />
        <Skeleton className="w-10 h-10 rounded-full" />
      </div>

      {/* Bottom Creator Information */}
      <div className="z-10 space-y-2 max-w-[70%]">
        <div className="flex items-center gap-2">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="h-3.5 w-24" />
        </div>
        <Skeleton className="h-3 w-44" />
        <Skeleton className="h-2.5 w-32" />
      </div>
    </div>
  );
}

export default Skeleton;
