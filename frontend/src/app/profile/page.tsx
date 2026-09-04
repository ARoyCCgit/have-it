"use client"

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import axios from "axios";
import {
  ArrowLeft,
  Camera,
  Grid,
  Bookmark,
  Film,
  User as UserIcon,
  Edit3,
  Loader2,
  LogOut,
  Sparkles,
  Settings,
  X,
  Check,
  RefreshCw,
} from "lucide-react";
import { post_service, useAppData, User } from "@/context/Appcontext";
import toast from "react-hot-toast";
import PostGridItem from "@/components/posts/PostGridItem";
import SinglePostModal from "@/components/posts/SinglePostModal";
import FollowListModal from "@/components/posts/FollowListModal";
import type { PostData } from "@/components/posts/PostCard";
import HaveItNavTabs from "@/components/HaveItNavTabs";
import { ThemeToggleBtn } from "@/components/ThemeToggleBtn";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

export default function ProfilePage() {
  const router = useRouter();
  const { user: loggedInUser, isAuth, loading: authLoading, updateUserProfile, updateUserAvatar, logoutUser } = useAppData();

  const [activeTab, setActiveTab] = useState<"posts" | "saved" | "reels">("posts");
  const [posts, setPosts] = useState<PostData[]>([]);
  const [savedPosts, setSavedPosts] = useState<PostData[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [selectedPost, setSelectedPost] = useState<PostData | null>(null);

  // Follow Modal State
  const [followModalType, setFollowModalType] = useState<"followers" | "following" | null>(null);

  // Edit Profile Drawer / Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState(loggedInUser?.name || "");
  const [editAbout, setEditAbout] = useState(loggedInUser?.about || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuth && !authLoading) {
      router.push("/login");
    }
  }, [isAuth, authLoading, router]);

  useEffect(() => {
    if (loggedInUser) {
      setEditName(loggedInUser.name || "");
      setEditAbout(loggedInUser.about || "");
    }
  }, [loggedInUser]);

  // Fetch Follow Counts
  const fetchFollowStats = useCallback(async () => {
    if (!loggedInUser?._id) return;
    try {
      const token = Cookies.get("token");
      const [followersRes, followingRes] = await Promise.all([
        axios.get(`${post_service}/api/v1/posts/user/${loggedInUser._id}/followers`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${post_service}/api/v1/posts/user/${loggedInUser._id}/following`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (followersRes.data.success) {
        setFollowersCount(followersRes.data.totalFollowers || 0);
      }
      if (followingRes.data.success) {
        setFollowingCount(followingRes.data.totalFollowing || 0);
      }
    } catch {
      // Silently ignore
    }
  }, [loggedInUser]);

  // Live follower count update listener
  useEffect(() => {
    const handleFollowerUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ userId: string; action: "follow" | "unfollow" }>;
      if (customEvent.detail?.userId === loggedInUser?._id) {
        setFollowersCount((prev) =>
          customEvent.detail.action === "follow" ? prev + 1 : Math.max(0, prev - 1)
        );
      }
    };

    window.addEventListener("haveit_follower_count_updated", handleFollowerUpdated);
    return () => {
      window.removeEventListener("haveit_follower_count_updated", handleFollowerUpdated);
    };
  }, [loggedInUser?._id]);

  // Fetch User Posts & Saved Posts
  const fetchUserGrid = useCallback(async () => {
    if (!loggedInUser?._id) return;
    setLoadingPosts(true);
    try {
      const token = Cookies.get("token");
      const [postsRes, savedRes] = await Promise.all([
        axios.get(`${post_service}/api/v1/posts/user/${loggedInUser._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${post_service}/api/v1/posts/saved`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (postsRes.data.success) {
        setPosts(postsRes.data.posts || []);
      }
      if (savedRes.data.success) {
        setSavedPosts(savedRes.data.posts || []);
      }
    } catch (err) {
      console.error("Profile posts load error:", err);
    } finally {
      setLoadingPosts(false);
    }
  }, [loggedInUser]);

  useEffect(() => {
    if (loggedInUser?._id) {
      fetchFollowStats();
      fetchUserGrid();
    }
  }, [loggedInUser, fetchFollowStats, fetchUserGrid]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    await updateUserAvatar(file);
    setUploadingAvatar(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    setSavingProfile(true);
    const success = await updateUserProfile(editName.trim(), editAbout.trim());
    setSavingProfile(false);
    if (success) {
      setIsEditModalOpen(false);
      toast.success("Profile updated! ✨");
    }
  };

  const avatarUrl =
    typeof loggedInUser?.avatar === "string"
      ? loggedInUser.avatar
      : loggedInUser?.avatar?.url || "";

  const reelsPosts = posts.filter(
    (p) => p.type === "reel" || p.type === "video" || p.media?.[0]?.type === "video"
  );

  const displayedGrid =
    activeTab === "posts" ? posts : activeTab === "saved" ? savedPosts : reelsPosts;

  return (
    <div className="min-h-screen bg-[#0b141a] text-white flex flex-col antialiased select-none">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-[#202c33]/90 backdrop-blur-md border-b border-gray-800 px-4 py-2.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/posts")}
            className="p-1.5 hover:bg-gray-700/60 rounded-full text-gray-300 hover:text-white transition-colors cursor-pointer"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-base font-bold text-white tracking-tight truncate max-w-[200px]">
            {loggedInUser?.name || "Profile"}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggleBtn />

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="px-3 py-1.5 bg-[#202c33] hover:bg-gray-700 text-xs font-semibold text-gray-200 border border-gray-700 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#03cafc]" />
            <span>Edit Profile</span>
          </button>

          <button
            onClick={() => {
              logoutUser();
              router.push("/login");
            }}
            className="p-2 hover:bg-rose-950/40 text-gray-400 hover:text-rose-400 rounded-xl transition-colors cursor-pointer"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Navigation Tabs */}
      <div className="sticky top-[53px] z-20 shadow-sm max-w-2xl mx-auto w-full">
        <HaveItNavTabs />
      </div>

      {/* Main Profile Body */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-3 sm:px-6 py-5">
        {/* Profile Header Card */}
        <div className="bg-[#111b21] border border-gray-800 rounded-3xl p-5 sm:p-8 shadow-xl mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8">
            {/* Avatar with Edit Overlay */}
            <div className="relative group shrink-0">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full p-[3px] bg-gradient-to-tr from-[#03cafc] via-cyan-400 to-sky-300 shadow-xl shadow-[#03cafc]/10">
                <div className="w-full h-full rounded-full bg-[#111b21] p-[2px] overflow-hidden flex items-center justify-center">
                  {uploadingAvatar ? (
                    <Loader2 className="w-8 h-8 text-[#03cafc] animate-spin" />
                  ) : avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <UserIcon className="w-12 h-12 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Hover upload button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity cursor-pointer disabled:opacity-0"
                title="Change Avatar"
              >
                <Camera className="w-6 h-6 text-[#03cafc] mb-0.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Change</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            {/* Profile Meta & Social Statistics */}
            <div className="flex-1 text-center sm:text-left space-y-3 min-w-0">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{loggedInUser?.name}</h1>
                <p className="text-xs text-gray-400 mt-0.5">{loggedInUser?.email}</p>
              </div>

              {/* Bio */}
              <p className="text-xs sm:text-sm text-gray-200 leading-relaxed max-w-md">
                {loggedInUser?.about || "Hey there! I am using Have-it."}
              </p>

              {/* Social Metrics Bar */}
              <div className="flex items-center justify-center sm:justify-start gap-6 sm:gap-8 pt-2">
                <div className="text-center sm:text-left">
                  <span className="text-base font-bold text-white block">{posts.length}</span>
                  <span className="text-xs text-gray-400">posts</span>
                </div>

                <button
                  onClick={() => setFollowModalType("followers")}
                  className="text-center sm:text-left hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <span className="text-base font-bold text-white block">{followersCount}</span>
                  <span className="text-xs text-gray-400">followers</span>
                </button>

                <button
                  onClick={() => setFollowModalType("following")}
                  className="text-center sm:text-left hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <span className="text-base font-bold text-white block">{followingCount}</span>
                  <span className="text-xs text-gray-400">following</span>
                </button>
              </div>

              {/* Theme & Appearance Switcher */}
              <div className="pt-4 mt-4 border-t border-gray-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-gray-200 block">Theme & Appearance</span>
                  <span className="text-[11px] text-gray-400">Choose light, dark, or sync with your system</span>
                </div>
                <ThemeSwitcher />
              </div>
            </div>
          </div>
        </div>

        {/* 3 Grid Navigation Tabs */}
        <div className="flex items-center justify-center border-b border-gray-800 mb-4 select-none">
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex items-center gap-2 py-3 px-6 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === "posts"
                ? "border-[#03cafc] text-[#03cafc]"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>POSTS ({posts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("saved")}
            className={`flex items-center gap-2 py-3 px-6 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === "saved"
                ? "border-[#03cafc] text-[#03cafc]"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>SAVED ({savedPosts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("reels")}
            className={`flex items-center gap-2 py-3 px-6 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === "reels"
                ? "border-[#03cafc] text-[#03cafc]"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            <Film className="w-4 h-4" />
            <span>REELS ({reelsPosts.length})</span>
          </button>
        </div>

        {/* 3-Column Posts Grid Stream */}
        {loadingPosts ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#03cafc]" />
            <p className="text-xs">Loading collection...</p>
          </div>
        ) : displayedGrid.length === 0 ? (
          <div className="bg-[#111b21] border border-gray-800 rounded-3xl p-12 text-center shadow-lg my-4 max-w-md mx-auto">
            {activeTab === "posts" ? (
              <Grid className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            ) : activeTab === "saved" ? (
              <Bookmark className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            ) : (
              <Film className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            )}
            <h3 className="text-base font-bold text-white mb-1">
              {activeTab === "posts"
                ? "No Posts Yet"
                : activeTab === "saved"
                ? "No Saved Posts"
                : "No Video Reels"}
            </h3>
            <p className="text-xs text-gray-400 mb-5">
              {activeTab === "posts"
                ? "When you share photos or multi-image carousels, they will appear on your profile."
                : activeTab === "saved"
                ? "Save posts to easily revisit your favorite community photos and videos."
                : "Share your first short video reel with the community."}
            </p>
            {activeTab === "posts" && (
              <button
                onClick={() => router.push("/posts")}
                className="px-5 py-2.5 bg-[#03cafc] hover:bg-[#029ecc] text-[#0b141a] font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Create Your First Post
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 sm:gap-3 pb-12">
            {displayedGrid.map((post) => (
              <PostGridItem
                key={post._id}
                post={post}
                onClick={(p) => setSelectedPost(p)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Single Post Inspector Modal */}
      {selectedPost && (
        <SinglePostModal
          post={selectedPost}
          isOpen={Boolean(selectedPost)}
          onClose={() => {
            setSelectedPost(null);
            fetchUserGrid();
          }}
          loggedInUser={loggedInUser}
          onPostDeleted={() => fetchUserGrid()}
          onOpenChatWithUser={() => router.push("/chat")}
        />
      )}

      {/* Followers / Following Modal */}
      {followModalType && loggedInUser && (
        <FollowListModal
          userId={loggedInUser._id}
          userName={loggedInUser.name}
          type={followModalType}
          isOpen={Boolean(followModalType)}
          onClose={() => {
            setFollowModalType(null);
            fetchFollowStats();
          }}
          onOpenChatWithUser={() => router.push("/chat")}
        />
      )}

      {/* Edit Profile Dialog Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="w-full max-w-md bg-[#111b21] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden p-5 space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <h3 className="text-base font-bold text-white">Edit Profile</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-gray-400 hover:text-white rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Display Name</label>
                <input
                  type="text"
                  maxLength={30}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#202c33] border border-gray-700 focus:border-[#03cafc] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">About / Bio</label>
                <textarea
                  rows={3}
                  maxLength={150}
                  value={editAbout}
                  onChange={(e) => setEditAbout(e.target.value)}
                  placeholder="Tell the Have-it community about yourself..."
                  className="w-full bg-[#202c33] border border-gray-700 focus:border-[#03cafc] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">Theme Preference</label>
                <div className="flex justify-center sm:justify-start">
                  <ThemeSwitcher />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-800">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingProfile}
                onClick={handleSaveProfile}
                className="px-5 py-2 bg-[#03cafc] hover:bg-[#029ecc] text-[#0b141a] font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
