"use client"

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import axios from "axios";
import toast from "react-hot-toast";
import {
  post_service,
  useAppData,
  User,
} from "@/context/Appcontext";
import {
  Plus,
  Sparkles,
  LayoutGrid,
  Search,
  MessageSquare,
  Loader2,
  Image as ImageIcon,
  User as UserIcon,
  RefreshCw,
  Bell,
  Heart,
} from "lucide-react";
import HaveItLogo from "@/components/HaveItLogo";
import HaveItNavTabs from "@/components/HaveItNavTabs";
import PostCard, { PostData } from "@/components/posts/PostCard";
import CreatePostModal from "@/components/posts/CreatePostModal";
import { PostCardSkeleton } from "@/components/Skeleton";
import StoriesBar from "@/components/posts/StoriesBar";
import SuggestedUsersBar from "@/components/posts/SuggestedUsersBar";
import ActivityDrawer from "@/components/posts/ActivityDrawer";
import ThemeToggleBtn from "@/components/ThemeToggleBtn";
import { usePostSocket } from "@/context/PostSocketContext";
import Link from "next/link";

export default function PostsFeedPage() {
  const { isAuth, loading: authLoading, user: loggedInUser } = useAppData();
  const { unreadNotifsCount, setUnreadNotifsCount } = usePostSocket();
  const router = useRouter();

  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Authentication check
  useEffect(() => {
    if (!isAuth && !authLoading) {
      router.push("/login");
    }
  }, [isAuth, authLoading, router]);

  // Fetch Feed Posts
  const fetchFeedPosts = useCallback(async (pageNum = 1, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (pageNum === 1) setLoading(true);

    try {
      const token = Cookies.get("token");
      const { data } = await axios.get(`${post_service}/api/v1/posts/feed?page=${pageNum}&limit=10`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (data.success) {
        if (pageNum === 1) {
          setPosts(data.posts || []);
        } else {
          setPosts((prev) => [...prev, ...(data.posts || [])]);
        }
        setHasMore(data.hasMore || false);
        setPage(pageNum);
      }
    } catch (err: any) {
      console.error("Failed to load feed posts:", err);
      // Non-fatal fallback for initial empty database
      if (pageNum === 1) setPosts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAuth) {
      fetchFeedPosts(1);
    }
  }, [isAuth, fetchFeedPosts]);

  // Live post deletion listener
  useEffect(() => {
    const handleRemotePostDeleted = (e: Event) => {
      const customEvent = e as CustomEvent<{ postId: string }>;
      if (customEvent.detail?.postId) {
        setPosts((prev) => prev.filter((p) => p._id !== customEvent.detail.postId));
      }
    };

    window.addEventListener("haveit_post_deleted", handleRemotePostDeleted);
    return () => {
      window.removeEventListener("haveit_post_deleted", handleRemotePostDeleted);
    };
  }, []);

  const handlePostCreated = (newPost: PostData) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p._id !== postId));
  };

  const userAvatarUrl =
    typeof loggedInUser?.avatar === "string"
      ? loggedInUser.avatar
      : loggedInUser?.avatar?.url || "";

  return (
    <div className="min-h-screen bg-[#0b141a] text-white flex flex-col antialiased">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-[#202c33]/90 backdrop-blur-md border-b border-gray-800 px-4 py-2.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <Link href="/posts" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <HaveItLogo size={32} glow={false} />
            <span className="text-base font-bold text-white tracking-tight hidden xs:inline">
              Have<span className="text-[#03cafc]">-it</span>
            </span>
          </Link>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <ThemeToggleBtn />

          {/* Activity Notifications Bell */}
          <button
            onClick={() => {
              setIsActivityOpen(true);
              setUnreadNotifsCount(0);
            }}
            className="relative p-2 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-xl transition-colors cursor-pointer"
            title="Activity"
          >
            <Heart className="w-5 h-5" />
            {unreadNotifsCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-[#202c33]" />
            )}
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3.5 py-1.5 bg-[#03cafc] hover:bg-[#029ecc] text-[#0b141a] text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-[#03cafc]/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span className="hidden sm:inline">Create Post</span>
          </button>

          <Link
            href="/profile"
            className="w-8 h-8 rounded-full bg-gray-800 border border-[#03cafc]/40 overflow-hidden flex items-center justify-center hover:opacity-85 transition-opacity"
            title="Profile"
          >
            {userAvatarUrl ? (
              <img src={userAvatarUrl} alt="Me" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-4 h-4 text-gray-300" />
            )}
          </Link>
        </div>
      </header>

      {/* Main Navigation Tabs (WhatsApp-Style Dual Hub: Chats vs Posts) */}
      <div className="sticky top-[53px] z-20 shadow-sm max-w-2xl mx-auto w-full">
        <HaveItNavTabs />
      </div>

      {/* Main Feed Container */}
      <main className="flex-1 max-w-xl mx-auto w-full px-3 sm:px-4 py-4">
        {/* 24h Stories Bar */}
        <StoriesBar loggedInUser={loggedInUser} />

        {/* Facebook-style Suggested People to Follow Carousel */}
        <SuggestedUsersBar
          onFollowChanged={() => fetchFeedPosts(1)}
          onOpenChatWithUser={() => router.push('/chat')}
        />

        {/* Quick Post Creation Composer Card */}
        <div
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-[#111b21] border border-gray-800 hover:border-gray-700 rounded-2xl p-3.5 mb-6 shadow-lg flex items-center gap-3 cursor-pointer transition-all hover:bg-[#111b21]/80 group"
        >
          <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700/60 overflow-hidden flex items-center justify-center shrink-0">
            {userAvatarUrl ? (
              <img src={userAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-5 h-5 text-gray-400" />
            )}
          </div>
          <div className="flex-1 bg-[#202c33] rounded-xl px-4 py-2.5 text-xs text-gray-400 group-hover:text-gray-300 transition-colors flex items-center justify-between">
            <span>What&apos;s on your mind? 📸 Share a photo or reel...</span>
            <ImageIcon className="w-4 h-4 text-[#03cafc] shrink-0" />
          </div>
        </div>

        {/* Posts Stream */}
        {loading ? (
          <div className="space-y-4">
            <PostCardSkeleton />
            <PostCardSkeleton />
            <PostCardSkeleton />
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-[#111b21] border border-gray-800 rounded-2xl p-10 text-center shadow-lg my-6">
            <div className="w-16 h-16 rounded-2xl bg-[#202c33] flex items-center justify-center text-[#03cafc] mx-auto mb-4 shadow-inner">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Welcome to Have-it Posts!</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto mb-5 leading-relaxed">
              No posts in your feed yet. Be the first to share a multi-image carousel or video reel with your community!
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-2.5 bg-[#03cafc] hover:bg-[#029ecc] text-[#0b141a] font-bold text-xs rounded-xl shadow-md shadow-[#03cafc]/20 transition-all active:scale-95 cursor-pointer inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Share Your First Post</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                loggedInUser={loggedInUser}
                onPostDeleted={handlePostDeleted}
                onOpenChatWithUser={(u) => router.push(`/chat`)}
              />
            ))}

            {/* Load More Button */}
            {hasMore && (
              <div className="text-center pt-2 pb-8">
                <button
                  onClick={() => fetchFeedPosts(page + 1)}
                  className="px-4 py-2 bg-[#202c33] hover:bg-gray-700/60 border border-gray-700 text-xs font-semibold text-gray-300 rounded-xl transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#03cafc]" />
                  <span>Load More Posts</span>
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Create Post Studio Modal */}
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onPostCreated={handlePostCreated}
      />

      {/* Activity Notifications Center */}
      <ActivityDrawer
        isOpen={isActivityOpen}
        onClose={() => setIsActivityOpen(false)}
      />
    </div>
  );
}
