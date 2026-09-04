"use client"

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import axios from "axios";
import { Film, Plus, Loader2, RefreshCw } from "lucide-react";
import { post_service, useAppData } from "@/context/Appcontext";
import HaveItLogo from "@/components/HaveItLogo";
import HaveItNavTabs from "@/components/HaveItNavTabs";
import ReelCard from "@/components/reels/ReelCard";
import CreatePostModal from "@/components/posts/CreatePostModal";
import type { PostData } from "@/components/posts/PostCard";
import { ReelSkeleton } from "@/components/Skeleton";
import Link from "next/link";

export default function ReelsPage() {
  const { isAuth, loading: authLoading, user: loggedInUser } = useAppData();
  const router = useRouter();

  const [reels, setReels] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auth check
  useEffect(() => {
    if (!isAuth && !authLoading) {
      router.push("/login");
    }
  }, [isAuth, authLoading, router]);

  // Fetch Reels
  const fetchReels = useCallback(async () => {
    setLoading(true);
    try {
      const token = Cookies.get("token");
      const { data } = await axios.get(`${post_service}/api/v1/posts/reels?limit=30`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (data.success) {
        setReels(data.reels || []);
      }
    } catch (err) {
      console.error("Reels fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuth) {
      fetchReels();
    }
  }, [isAuth, fetchReels]);

  // Handle scroll detection for active snap item
  const handleScroll = () => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const itemHeight = container.clientHeight;
    const currentScroll = container.scrollTop;
    const newIndex = Math.round(currentScroll / itemHeight);
    if (newIndex !== activeIndex && newIndex >= 0 && newIndex < reels.length) {
      setActiveIndex(newIndex);
    }
  };

  // Keyboard navigation (Up/Down arrow keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const itemHeight = container.clientHeight;

      if (e.key === "ArrowDown" && activeIndex < reels.length - 1) {
        container.scrollTo({ top: (activeIndex + 1) * itemHeight, behavior: "smooth" });
      } else if (e.key === "ArrowUp" && activeIndex > 0) {
        container.scrollTo({ top: (activeIndex - 1) * itemHeight, behavior: "smooth" });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, reels.length]);

  return (
    <div className="h-screen w-screen bg-[#0b141a] text-white flex flex-col antialiased overflow-hidden select-none">
      {/* Top Header */}
      <header className="bg-[#202c33]/90 backdrop-blur-md border-b border-gray-800 px-4 py-2.5 flex items-center justify-between shadow-md z-30 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/posts" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <HaveItLogo size={30} glow={false} />
            <span className="text-base font-bold text-white tracking-tight hidden xs:inline">
              Have<span className="text-[#03cafc]">-it</span> Reels
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3 py-1.5 bg-[#03cafc] hover:bg-[#029ecc] text-[#0b141a] text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-[#03cafc]/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create Reel</span>
          </button>
        </div>
      </header>

      {/* Main Nav Tabs */}
      <div className="shadow-sm max-w-2xl mx-auto w-full shrink-0">
        <HaveItNavTabs />
      </div>

      {/* Vertical Snap-Scrolling Reels Viewport */}
      <main
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 w-full overflow-y-scroll snap-y snap-mandatory scrollbar-none flex flex-col items-center py-2"
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#03cafc]" />
            <p className="text-xs">Loading Reels stream...</p>
          </div>
        ) : reels.length === 0 ? (
          <div className="bg-[#111b21] border border-gray-800 rounded-3xl p-10 text-center shadow-2xl my-auto max-w-sm mx-4">
            <Film className="w-14 h-14 text-gray-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No Video Reels Yet</h3>
            <p className="text-xs text-gray-400 mb-6">
              Be the first creator to share an exciting 9:16 short video reel with the Have-it community!
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full py-2.5 bg-[#03cafc] hover:bg-[#029ecc] text-[#0b141a] text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              Upload Your First Reel
            </button>
          </div>
        ) : (
          reels.map((reel, idx) => (
            <div key={reel._id} className="w-full h-full snap-start flex items-center justify-center shrink-0">
              <ReelCard
                reel={reel}
                isActive={activeIndex === idx}
                loggedInUser={loggedInUser}
                onReelDeleted={(id) => setReels((prev) => prev.filter((r) => r._id !== id))}
                onOpenChatWithUser={() => router.push("/chat")}
              />
            </div>
          ))
        )}
      </main>

      {/* Create Reel Modal */}
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onPostCreated={() => {
          setIsCreateModalOpen(false);
          fetchReels();
        }}
      />
    </div>
  );
}
