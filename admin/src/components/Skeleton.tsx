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
      className={`skeleton animate-pulse rounded-xl bg-slate-800/70 border border-slate-700/30 ${className}`}
    />
  );
}

// 1. Metric KPI Card Skeleton (Dashboard)
export function MetricCardSkeleton() {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-8 w-8 rounded-xl" />
      </div>
      <div className="flex items-baseline gap-2 pt-1">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-3.5 w-12" />
      </div>
      <Skeleton className="h-2.5 w-36" />
    </div>
  );
}

// 2. Service Health Node Skeleton (Dashboard)
export function ServiceCardSkeleton() {
  return (
    <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-9 h-9 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-2.5 w-16" />
        </div>
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  );
}

// 3. Table Rows Skeleton (Users, API Keys, Broadcasts)
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-slate-800/60 w-full">
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Skeleton className="w-9 h-9 rounded-full shrink-0" />
            <div className="space-y-1.5 flex-1 max-w-xs">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-2.5 w-44" />
            </div>
          </div>
          {cols >= 3 && <Skeleton className="h-4 w-20 hidden sm:block" />}
          {cols >= 4 && <Skeleton className="h-5 w-16 rounded-full hidden md:block" />}
          {cols >= 5 && <Skeleton className="h-7 w-20 rounded-xl shrink-0" />}
        </div>
      ))}
    </div>
  );
}

// 4. Moderation Card Skeleton (Moderation Queue)
export function ModerationCardSkeleton() {
  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl overflow-hidden p-4 space-y-3">
      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
        <Skeleton className="w-8 h-8 rounded-full shrink-0" />
        <div className="space-y-1 flex-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2 w-16" />
        </div>
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <Skeleton className="aspect-square w-full rounded-xl" />
      <div className="space-y-1.5 pt-1">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-2.5 w-1/2" />
      </div>
      <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
        <Skeleton className="h-8 flex-1 rounded-xl" />
        <Skeleton className="h-8 flex-1 rounded-xl" />
      </div>
    </div>
  );
}

// 5. Settings Form Skeleton (Settings Page)
export function SettingsSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Maintenance card skeleton */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-80" />
          </div>
          <Skeleton className="h-7 w-12 rounded-full" />
        </div>
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>

      {/* Feature toggles skeleton */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <Skeleton className="h-4 w-40 mb-4" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-slate-800/60 last:border-0">
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-2.5 w-64" />
            </div>
            <Skeleton className="h-7 w-12 rounded-full" />
          </div>
        ))}
      </div>

      {/* Quotas skeleton */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <Skeleton className="h-4 w-40 mb-2" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Skeleton;
