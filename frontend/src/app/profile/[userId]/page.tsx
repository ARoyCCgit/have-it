"use client"

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import axios from "axios";
import {
  ArrowLeft,
  Grid,
  Film,
  User as UserIcon,
  MessageSquare,
  UserPlus,
  UserCheck,
  Loader2,
  Lock,
} from "lucide-react";
import { post_service, useAppData, User } from "@/context/Appcontext";
import toast from "react-hot-toast";
import PostGridItem from "@/components/posts/PostGridItem";
import SinglePostModal from "@/components/posts/SinglePostModal";
import FollowListModal from "@/components/posts/FollowListModal";
import type { PostData } from "@/components/posts/PostCard";
import HaveItNavTabs from "@/components/HaveItNavTabs";

interface UserProfileData {
  _id: string;
  name: string;
  email: string;
  about?: string;
  avatar?: { url?: string } | string;
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.userId as string;

  const { user: loggedInUser, isAuth, loading: authLoading } = useAppData();

  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PostData | null>(null);
  const [followModalType, setFollowModalType] = useState<"followers" | "following" | null>(null);

  // If viewing self, redirect to /profile
  useEffect(() => {
    if (loggedInUser?._id && userId === loggedInUser._id) {
      router.replace("/profile");
    }
  }, [loggedInUser, userId, router]);

  // Fetch target user info & posts
  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const token = Cookies.get("token");
      const [postsRes, followersRes, followingRes] = await Promise.all([
        axios.get(`${post_service}/api/v1/posts/user/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${post_service}/api/v1/posts/user/${userId}/followers`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${post_service}/api/v1/posts/user/${userId}/following`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (postsRes.data.success) {
        setPosts(postsRes.data.posts || []);
        if (postsRes.data.posts?.[0]?.author) {
          setUserProfile(postsRes.data.posts[0].author);
        }
      }

      if (followersRes.data.success) {
        setFollowersCount(followersRes.data.totalFollowers || 0);
        const myId = loggedInUser?._id;
        const amFollowing = followersRes.data.followers?.some(
          (f: any) => f._id === myId
        );
        setIsFollowing(Boolean(amFollowing));
      }

      if (followingRes.data.success) {
        setFollowingCount(followingRes.data.totalFollowing || 0);
      }
    } catch (err) {
      console.error("User profile load error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, loggedInUser]);

  useEffect(() => {
    if (userId) {
      fetchProfile();
    }
  }, [userId, fetchProfile]);

  // Live follower count update listener
  useEffect(() => {
    const handleFollowerUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ userId: string; action: "follow" | "unfollow" }>;
      if (customEvent.detail?.userId === userId) {
        setFollowersCount((prev) =>
          customEvent.detail.action === "follow" ? prev + 1 : Math.max(0, prev - 1)
        );
      }
    };

    window.addEventListener("haveit_follower_count_updated", handleFollowerUpdated);
    return () => {
      window.removeEventListener("haveit_follower_count_updated", handleFollowerUpdated);
    };
  }, [userId]);

  // Toggle Follow
  const handleToggleFollow = async () => {
    if (!userId || followLoading) return;
    setFollowLoading(true);
    const prevFollowing = isFollowing;
    setIsFollowing(!prevFollowing);
    setFollowersCount((prev) => (prevFollowing ? Math.max(0, prev - 1) : prev + 1));

    try {
      const token = Cookies.get("token");
      const endpoint = prevFollowing
        ? `${post_service}/api/v1/posts/user/unfollow/${userId}`
        : `${post_service}/api/v1/posts/user/follow/${userId}`;

      const { data } = await axios.post(endpoint, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        toast.success(data.message || (prevFollowing ? "Unfollowed" : "Following"));
      }
    } catch {
      setIsFollowing(prevFollowing);
      setFollowersCount((prev) => (prevFollowing ? prev + 1 : Math.max(0, prev - 1)));
      toast.error("Failed to update follow");
    } finally {
      setFollowLoading(false);
    }
  };

  const avatarUrl =
    typeof userProfile?.avatar === "string"
      ? userProfile.avatar
      : userProfile?.avatar?.url || "";

  return (
    <div className="min-h-screen bg-[#0b141a] text-white flex flex-col antialiased select-none">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-[#202c33]/90 backdrop-blur-md border-b border-gray-800 px-4 py-2.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 hover:bg-gray-700/60 rounded-full text-gray-300 hover:text-white transition-colors cursor-pointer"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-base font-bold text-white tracking-tight truncate max-w-[200px]">
            {userProfile?.name || "User Profile"}
          </h2>
        </div>
      </header>

      {/* Main Nav Tabs */}
      <div className="sticky top-[53px] z-20 shadow-sm max-w-2xl mx-auto w-full">
        <HaveItNavTabs />
      </div>

      {/* Main Profile Body */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-3 sm:px-6 py-5">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#03cafc]" />
            <p className="text-xs">Loading profile...</p>
          </div>
        ) : (
          <>
            {/* Header Profile Card */}
            <div className="bg-[#111b21] border border-gray-800 rounded-3xl p-5 sm:p-8 shadow-xl mb-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8">
                {/* Avatar */}
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full p-[3px] bg-gradient-to-tr from-[#03cafc] via-cyan-400 to-sky-300 shadow-xl shadow-[#03cafc]/10 shrink-0">
                  <div className="w-full h-full rounded-full bg-[#111b21] p-[2px] overflow-hidden flex items-center justify-center">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <UserIcon className="w-12 h-12 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Info & Metrics */}
                <div className="flex-1 text-center sm:text-left space-y-3 min-w-0">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                      {userProfile?.name || "Member"}
                    </h1>
                    <p className="text-xs text-gray-400 mt-0.5">{userProfile?.email}</p>
                  </div>

                  <p className="text-xs sm:text-sm text-gray-200 leading-relaxed max-w-md">
                    {userProfile?.about || "Hey there! I am using Have-it."}
                  </p>

                  {/* Social Metrics */}
                  <div className="flex items-center justify-center sm:justify-start gap-6 sm:gap-8 pt-1">
                    <div>
                      <span className="text-base font-bold text-white block">{posts.length}</span>
                      <span className="text-xs text-gray-400">posts</span>
                    </div>

                    <button
                      onClick={() => setFollowModalType("followers")}
                      className="hover:opacity-80 transition-opacity cursor-pointer text-center sm:text-left"
                    >
                      <span className="text-base font-bold text-white block">{followersCount}</span>
                      <span className="text-xs text-gray-400">followers</span>
                    </button>

                    <button
                      onClick={() => setFollowModalType("following")}
                      className="hover:opacity-80 transition-opacity cursor-pointer text-center sm:text-left"
                    >
                      <span className="text-base font-bold text-white block">{followingCount}</span>
                      <span className="text-xs text-gray-400">following</span>
                    </button>
                  </div>

                  {/* Action Buttons: Follow & Message */}
                  <div className="flex items-center justify-center sm:justify-start gap-3 pt-2">
                    <button
                      onClick={handleToggleFollow}
                      disabled={followLoading}
                      className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                        isFollowing
                          ? "bg-gray-800 text-gray-300 hover:bg-rose-500/20 hover:text-rose-400 border border-gray-700"
                          : "bg-[#03cafc] hover:bg-[#029ecc] text-[#0b141a] shadow-[#03cafc]/20"
                      }`}
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Following</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Follow</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => router.push("/chat")}
                      className="px-5 py-2 bg-[#202c33] hover:bg-gray-700/60 border border-gray-700 text-xs font-bold text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-[#03cafc]" />
                      <span>Message</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Posts Grid */}
            <div className="flex items-center justify-center border-b border-gray-800 mb-4">
              <div className="flex items-center gap-2 py-3 px-6 text-xs font-bold text-[#03cafc] border-b-2 border-[#03cafc]">
                <Grid className="w-4 h-4" />
                <span>POSTS ({posts.length})</span>
              </div>
            </div>

            {posts.length === 0 ? (
              <div className="bg-[#111b21] border border-gray-800 rounded-3xl p-12 text-center shadow-lg my-4 max-w-md mx-auto">
                <Grid className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white mb-1">No Posts Yet</h3>
                <p className="text-xs text-gray-400">
                  This user hasn&apos;t shared any photos or video reels yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5 sm:gap-3 pb-12">
                {posts.map((post) => (
                  <PostGridItem
                    key={post._id}
                    post={post}
                    onClick={(p) => setSelectedPost(p)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Single Post Inspector Modal */}
      {selectedPost && (
        <SinglePostModal
          post={selectedPost}
          isOpen={Boolean(selectedPost)}
          onClose={() => setSelectedPost(null)}
          loggedInUser={loggedInUser}
          onOpenChatWithUser={() => router.push("/chat")}
        />
      )}

      {/* Followers / Following Modal */}
      {followModalType && (
        <FollowListModal
          userId={userId}
          userName={userProfile?.name || "User"}
          type={followModalType}
          isOpen={Boolean(followModalType)}
          onClose={() => {
            setFollowModalType(null);
            fetchProfile();
          }}
          onOpenChatWithUser={() => router.push("/chat")}
        />
      )}
    </div>
  );
}
