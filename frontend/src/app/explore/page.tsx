"use client"

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import axios from "axios";
import {
  Search,
  Compass,
  Sparkles,
  Loader2,
  Film,
  Flame,
  Camera,
  Layers,
  RefreshCw,
} from "lucide-react";
import { post_service, useAppData } from "@/context/Appcontext";
import HaveItLogo from "@/components/HaveItLogo";
import HaveItNavTabs from "@/components/HaveItNavTabs";
import PostGridItem from "@/components/posts/PostGridItem";
import SinglePostModal from "@/components/posts/SinglePostModal";
import type { PostData } from "@/components/posts/PostCard";
import { ExploreGridSkeleton } from "@/components/Skeleton";
import Link from "next/link";

const DISCOVERY_TAGS = [
  { id: "all", label: "🔥 All", tag: "" },
  { id: "trending", label: "⚡ Trending", tag: "trending" },
  { id: "tech", label: "💻 Tech", tag: "tech" },
  { id: "photography", label: "📸 Photography", tag: "photography" },
  { id: "reels", label: "🎬 Reels", tag: "reels" },
  { id: "nature", label: "🌿 Nature", tag: "nature" },
  { id: "art", label: "🎨 Art", tag: "art" },
  { id: "travel", label: "✈️ Travel", tag: "travel" },
];

export default function ExplorePage() {
  const { isAuth, loading: authLoading, user: loggedInUser } = useAppData();
  const router = useRouter();

  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PostData | null>(null);

  const userAvatarUrl =
    typeof loggedInUser?.avatar === "string"
      ? loggedInUser.avatar
      : loggedInUser?.avatar?.url || "";

  // Auth check
  useEffect(() => {
    if (!isAuth && !authLoading) {
      router.push("/login");
    }
  }, [isAuth, authLoading, router]);

  // Fetch explore posts
  const fetchExplorePosts = useCallback(
    async (pageNum = 1, query = searchQuery, tagId = selectedTag) => {
      if (pageNum === 1) setLoading(true);
      try {
        const token = Cookies.get("token");
        const selectedTagObj = DISCOVERY_TAGS.find((t) => t.id === tagId);
        const tagParam = selectedTagObj?.tag ? `&tag=${selectedTagObj.tag}` : "";
        const searchParam = query.trim() ? `&search=${encodeURIComponent(query.trim())}` : "";

        const { data } = await axios.get(
          `${post_service}/api/v1/posts/explore?page=${pageNum}&limit=18${tagParam}${searchParam}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (data.success) {
          if (pageNum === 1) {
            setPosts(data.posts || []);
          } else {
            setPosts((prev) => [...prev, ...(data.posts || [])]);
          }
          setHasMore(data.hasMore || false);
          setPage(pageNum);
        }
      } catch (err) {
        console.error("Explore fetch error:", err);
        if (pageNum === 1) setPosts([]);
      } finally {
        setLoading(false);
      }
    },
    [searchQuery, selectedTag]
  );

  useEffect(() => {
    if (isAuth) {
      fetchExplorePosts(1);
    }
  }, [isAuth, fetchExplorePosts]);

  const handleTagClick = (tagId: string) => {
    setSelectedTag(tagId);
    setSearchQuery("");
    fetchExplorePosts(1, "", tagId);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchExplorePosts(1, searchQuery, selectedTag);
  };

  return (
    <div className="min-h-screen bg-[#0b141a] text-white flex flex-col antialiased">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#202c33]/90 backdrop-blur-md border-b border-gray-800 px-4 py-2.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <Link href="/posts" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <HaveItLogo size={32} glow={false} />
            <span className="text-base font-bold text-white tracking-tight hidden xs:inline">
              Have<span className="text-[#03cafc]">-it</span> Explore
            </span>
          </Link>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-sm mx-4">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-gray-400 absolute left-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search posts, tags, places..."
              className="w-full bg-[#111b21] border border-gray-800 focus:border-[#03cafc] rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
            />
          </div>
        </form>

        <Link
          href="/profile"
          className="w-8 h-8 rounded-full bg-gray-800 border border-[#03cafc]/40 overflow-hidden flex items-center justify-center hover:opacity-85 transition-opacity shrink-0"
        >
          {userAvatarUrl ? (
            <img
              src={userAvatarUrl}
              alt="Me"
              className="w-full h-full object-cover"
            />
          ) : (
            <Compass className="w-4 h-4 text-[#03cafc]" />
          )}
        </Link>
      </header>

      {/* Main Nav Tabs */}
      <div className="sticky top-[53px] z-20 shadow-sm max-w-2xl mx-auto w-full">
        <HaveItNavTabs />
      </div>

      {/* Discovery Tag Chips */}
      <div className="max-w-4xl mx-auto w-full px-3 sm:px-4 pt-3 pb-1">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none select-none">
          {DISCOVERY_TAGS.map((t) => (
            <button
              key={t.id}
              onClick={() => handleTagClick(t.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedTag === t.id
                  ? "bg-[#03cafc] text-[#0b141a] shadow-md shadow-[#03cafc]/20"
                  : "bg-[#111b21] border border-gray-800 text-gray-300 hover:text-white hover:border-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3-Column Explore Grid Container */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-3 sm:px-4 py-3">
        {loading ? (
          <ExploreGridSkeleton count={9} />
        ) : posts.length === 0 ? (
          <div className="bg-[#111b21] border border-gray-800 rounded-2xl p-12 text-center shadow-lg my-6 max-w-md mx-auto">
            <Compass className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No posts found</h3>
            <p className="text-xs text-gray-400 mb-4">
              Try searching with another keyword or tag to explore new photos and video reels!
            </p>
            <button
              onClick={() => handleTagClick("all")}
              className="px-4 py-2 bg-[#03cafc] text-[#0b141a] text-xs font-bold rounded-xl cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 3-Column Responsive Grid */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
              {posts.map((post) => (
                <PostGridItem
                  key={post._id}
                  post={post}
                  onClick={(p) => setSelectedPost(p)}
                />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="text-center pt-3 pb-8">
                <button
                  onClick={() => fetchExplorePosts(page + 1)}
                  className="px-4 py-2 bg-[#202c33] hover:bg-gray-700/60 border border-gray-700 text-xs font-semibold text-gray-300 rounded-xl transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#03cafc]" />
                  <span>Load More</span>
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Single Post Inspector Modal */}
      {selectedPost && (
        <SinglePostModal
          post={selectedPost}
          isOpen={Boolean(selectedPost)}
          onClose={() => setSelectedPost(null)}
          loggedInUser={loggedInUser}
          onPostDeleted={(deletedId) => {
            setPosts((prev) => prev.filter((p) => p._id !== deletedId));
          }}
          onOpenChatWithUser={() => router.push("/chat")}
        />
      )}
    </div>
  );
}
