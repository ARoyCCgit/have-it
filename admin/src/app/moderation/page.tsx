"use client"

import React, { useState, useEffect, useCallback } from "react";
import AdminGuard from "@/components/AdminGuard";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import {
  ShieldAlert,
  Trash2,
  Eye,
  Flag,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Film,
  Image as ImageIcon,
  MessageSquare,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { ModerationCardSkeleton } from "@/components/Skeleton";

interface ModerationPost {
  _id: string;
  type: "image" | "carousel" | "video" | "reel";
  media: Array<{
    url: string;
    public_id: string;
    type: "image" | "video";
  }>;
  caption: string;
  isReported?: boolean;
  reportCount?: number;
  reports?: Array<{
    reporter?: string;
    reason: string;
    reportedAt: string;
  }>;
  author?: {
    _id: string;
    name: string;
    email: string;
    avatar?: { url?: string } | string;
    isVerified?: boolean;
    isBanned?: boolean;
  };
  createdAt: string;
}

export default function ContentModerationPage() {
  const [posts, setPosts] = useState<ModerationPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "reported">("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchModerationQueue = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/moderation", {
        params: { filter },
      });
      if (data.success) {
        setPosts(data.posts);
      }
    } catch (err) {
      console.error("Failed to load moderation queue:", err);
      toast.error("Failed to load moderation queue");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchModerationQueue();
  }, [fetchModerationQueue]);

  // 1-Click Atomic Takedown
  const handleTakedown = async (postId: string) => {
    if (!window.confirm("Confirm atomic takedown? This will immediately purge the post, comments, and media from the platform.")) {
      return;
    }

    setActionLoadingId(postId);
    try {
      const { data } = await axios.delete(`/api/moderation/${postId}`);
      if (data.success) {
        setPosts((prev) => prev.filter((p) => p._id !== postId));
        toast.success("Post and media successfully purged from platform.");
      }
    } catch (err) {
      console.error("Failed to execute post takedown:", err);
      toast.error("Failed to delete post");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Dismiss Reports / Mark Safe
  const handleDismissReport = async (postId: string) => {
    setActionLoadingId(postId);
    try {
      const { data } = await axios.put(`/api/moderation/${postId}`);
      if (data.success) {
        setPosts((prev) =>
          prev.map((p) =>
            p._id === postId ? { ...p, isReported: false, reportCount: 0, reports: [] } : p
          )
        );
        toast.success("Report dismissed. Post marked safe.");
      }
    } catch (err) {
      console.error("Failed to dismiss report:", err);
      toast.error("Failed to dismiss report");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <AdminGuard>
      <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden select-none">
        <AdminSidebar />
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <AdminHeader
            title="Content Moderation & Safety Queue"
            description="Inspect reported posts, reels, and comments with 1-click atomic takedown and media purge."
          />

          <main className="flex-1 overflow-y-auto p-6 space-y-6 custom-scroll">
            {/* Top Filter Bar */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    filter === "all"
                      ? "bg-[#03cafc] text-slate-950 font-bold shadow-md shadow-[#03cafc]/20"
                      : "bg-slate-800 text-slate-300 hover:text-white"
                  }`}
                >
                  All Platform Posts ({posts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("reported")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    filter === "reported"
                      ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                      : "bg-slate-800 text-slate-300 hover:text-white"
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Flagged & Reported</span>
                </button>
              </div>

              <button
                type="button"
                onClick={fetchModerationQueue}
                disabled={loading}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                title="Refresh Queue"
              >
                <RefreshCw className={`w-4 h-4 text-[#03cafc] ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {/* Moderation Grid */}
            {loading && posts.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <ModerationCardSkeleton />
                <ModerationCardSkeleton />
                <ModerationCardSkeleton />
                <ModerationCardSkeleton />
                <ModerationCardSkeleton />
                <ModerationCardSkeleton />
              </div>
            ) : posts.length === 0 ? (
              <div className="p-16 rounded-3xl bg-slate-900/80 border border-slate-800 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-white">Zero Moderation Violations</h3>
                <p className="text-slate-500 max-w-sm mx-auto mt-1">
                  All community posts comply with Have-it trust & safety guidelines.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map((post) => {
                  const firstMedia = post.media?.[0];
                  const isVideo = firstMedia?.type === "video" || post.type === "reel";
                  const avatarUrl =
                    typeof post.author?.avatar === "string"
                      ? post.author.avatar
                      : post.author?.avatar?.url || "";

                  return (
                    <div
                      key={post._id}
                      className="rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl overflow-hidden flex flex-col justify-between hover:border-slate-700 transition-all group"
                    >
                      {/* Card Header: Author Info */}
                      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-white overflow-hidden border border-slate-700 shrink-0">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt="Author" className="w-full h-full object-cover" />
                            ) : (
                              post.author?.name?.slice(0, 1).toUpperCase() || "A"
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-white block truncate">
                              {post.author?.name || "Unknown Author"}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block truncate">
                              {post.author?.email}
                            </span>
                          </div>
                        </div>

                        {post.isReported && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-950/40 text-rose-400 border border-rose-500/30 text-[10px] font-extrabold uppercase flex items-center gap-1">
                            <Flag className="w-3 h-3" />
                            <span>{post.reportCount || 1} Reports</span>
                          </span>
                        )}
                      </div>

                      {/* Media Preview Box */}
                      <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden">
                        {firstMedia?.url ? (
                          isVideo ? (
                            <video
                              src={firstMedia.url}
                              controls
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <img
                              src={firstMedia.url}
                              alt="Post media"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          )
                        ) : (
                          <div className="text-slate-600 flex items-center gap-1.5 text-xs">
                            <ImageIcon className="w-5 h-5" />
                            <span>Text-only post</span>
                          </div>
                        )}

                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider">
                          {post.type}
                        </span>
                      </div>

                      {/* Caption & Post Details */}
                      <div className="p-4 space-y-2 flex-1">
                        <p className="text-xs text-slate-200 line-clamp-3 leading-relaxed">
                          {post.caption || <span className="italic text-slate-500">No caption provided</span>}
                        </p>

                        <div className="text-[10px] text-slate-500 font-mono pt-1">
                          Created: {new Date(post.createdAt).toLocaleDateString()} at {new Date(post.createdAt).toLocaleTimeString()}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="p-3 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between gap-2">
                        {post.isReported ? (
                          <button
                            type="button"
                            onClick={() => handleDismissReport(post._id)}
                            disabled={actionLoadingId === post._id}
                            className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Dismiss Report</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-500 px-2 font-medium">
                            Status: Safe & Active
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleTakedown(post._id)}
                          disabled={actionLoadingId === post._id}
                          className="py-2 px-3 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          title="Purge and Takedown Post"
                        >
                          {actionLoadingId === post._id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Takedown</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}
