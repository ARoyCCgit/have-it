"use client"

import React, { useState, useRef } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { post_service, User } from "@/context/Appcontext";
import toast from "react-hot-toast";
import LikersModal from "./LikersModal";
import ViewersModal from "./ViewersModal";
import CommentsDrawer from "./CommentsDrawer";
import { copyToClipboard } from "@/utils/clipboard";

export interface PostMedia {
  url: string;
  public_id: string;
  type: "image" | "video";
  aspectRatio?: "1:1" | "4:5" | "16:9" | "9:16";
  thumbnailUrl?: string;
}

export interface PostData {
  _id: string;
  author: {
    _id: string;
    name: string;
    email: string;
    avatar?: { url?: string } | string;
    about?: string;
  };
  type: "image" | "carousel" | "video" | "reel";
  media: PostMedia[];
  caption: string;
  tags: string[];
  location?: string;
  likes: string[];
  likesCount: number;
  viewsCount: number;
  commentsCount: number;
  isLikedByMe?: boolean;
  isSavedByMe?: boolean;
  isViewedByMe?: boolean;
  createdAt: string;
}

interface PostCardProps {
  post: PostData;
  loggedInUser: User | null;
  onPostDeleted?: (postId: string) => void;
  onOpenChatWithUser?: (user: User) => void;
}

const formatPostTime = (isoString: string) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

export const PostCard: React.FC<PostCardProps> = ({
  post,
  loggedInUser,
  onPostDeleted,
  onOpenChatWithUser,
}) => {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(Boolean(post.isLikedByMe));
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [isSaved, setIsSaved] = useState(Boolean(post.isSavedByMe));
  const [viewsCount, setViewsCount] = useState(post.viewsCount || 0);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [showLikersModal, setShowLikersModal] = useState(false);
  const [showViewersModal, setShowViewersModal] = useState(false);
  const [showCommentsDrawer, setShowCommentsDrawer] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const lastTapRef = useRef<number>(0);

  const isAuthor = loggedInUser?._id === post.author?._id;

  const authorAvatarUrl =
    typeof post.author?.avatar === "string"
      ? post.author.avatar
      : post.author?.avatar?.url || "";

  // Automatically record view when post is seen in feed
  React.useEffect(() => {
    const recordView = async () => {
      try {
        const token = Cookies.get("token");
        const { data } = await axios.post(
          `${post_service}/api/v1/posts/${post._id}/view`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (data.success && data.viewsCount !== undefined) {
          setViewsCount(data.viewsCount);
        }
      } catch {
        // Ignore view errors silently
      }
    };
    recordView();
  }, [post._id]);

  // Live Post Socket sync (likes, comments count, post deletion)
  React.useEffect(() => {
    const handleLikesUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ postId: string; likesCount: number }>;
      if (customEvent.detail?.postId === post._id && typeof customEvent.detail.likesCount === "number") {
        setLikesCount(customEvent.detail.likesCount);
      }
    };

    const handleCommentsCountUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ postId: string; commentsCount: number }>;
      if (customEvent.detail?.postId === post._id && typeof customEvent.detail.commentsCount === "number") {
        setCommentsCount(customEvent.detail.commentsCount);
      }
    };

    const handlePostDeleted = (e: Event) => {
      const customEvent = e as CustomEvent<{ postId: string }>;
      if (customEvent.detail?.postId === post._id && onPostDeleted) {
        onPostDeleted(post._id);
      }
    };

    window.addEventListener("haveit_post_likes_updated", handleLikesUpdated);
    window.addEventListener("haveit_post_comments_count_updated", handleCommentsCountUpdated);
    window.addEventListener("haveit_post_deleted", handlePostDeleted);

    return () => {
      window.removeEventListener("haveit_post_likes_updated", handleLikesUpdated);
      window.removeEventListener("haveit_post_comments_count_updated", handleCommentsCountUpdated);
      window.removeEventListener("haveit_post_deleted", handlePostDeleted);
    };
  }, [post._id, onPostDeleted]);

  // 1. Toggle Like API
  const handleToggleLike = async () => {
    const prevLiked = isLiked;
    const prevCount = likesCount;

    // Optimistic UI update
    setIsLiked(!prevLiked);
    setLikesCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);

    try {
      const token = Cookies.get("token");
      const { data } = await axios.put(
        `${post_service}/api/v1/posts/${post._id}/like`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (data.success) {
        setIsLiked(data.isLiked);
        setLikesCount(data.likesCount);
      }
    } catch (err: unknown) {
      console.error("Like error:", err);
      setIsLiked(prevLiked);
      setLikesCount(prevCount);
      toast.error("Failed to update like");
    }
  };

  // 2. Double Tap to Like (Instagram Style)
  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (!isLiked) {
        handleToggleLike();
      }
      setShowHeartAnimation(true);
      setTimeout(() => setShowHeartAnimation(false), 900);
    }
    lastTapRef.current = now;
  };

  // 3. Toggle Bookmark
  const handleToggleBookmark = async () => {
    const prevSaved = isSaved;
    setIsSaved(!prevSaved);

    try {
      const token = Cookies.get("token");
      const { data } = await axios.put(
        `${post_service}/api/v1/posts/${post._id}/bookmark`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (data.success) {
        setIsSaved(data.isSaved);
        toast.success(data.message || (data.isSaved ? "Saved to collection" : "Removed from collection"));
      }
    } catch (err: unknown) {
      console.error("Bookmark error:", err);
      setIsSaved(prevSaved);
      toast.error("Failed to bookmark post");
    }
  };

  // 4. Delete Post
  const handleDeletePost = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    setDeleting(true);
    try {
      const token = Cookies.get("token");
      const { data } = await axios.delete(`${post_service}/api/v1/posts/${post._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (data.success) {
        toast.success("Post deleted successfully");
        if (onPostDeleted) onPostDeleted(post._id);
      }
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : "Failed to delete post";
      toast.error(msg || "Failed to delete post");
    } finally {
      setDeleting(false);
    }
  };

  // Carousel navigation
  const nextMedia = () => {
    if (currentMediaIndex < post.media.length - 1) {
      setCurrentMediaIndex((prev) => prev + 1);
    }
  };

  const prevMedia = () => {
    if (currentMediaIndex > 0) {
      setCurrentMediaIndex((prev) => prev - 1);
    }
  };

  const activeMedia = post.media[currentMediaIndex] || post.media[0];

  return (
    <article className="bg-[#111b21] border border-gray-800 rounded-2xl shadow-xl overflow-hidden mb-6 transition-all">
      {/* 1. Post Header */}
      <div className="px-4 py-3 bg-[#111b21] flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-[#03cafc] to-cyan-300 shadow-sm shrink-0">
            <div className="w-full h-full rounded-full bg-[#111b21] p-[2px] overflow-hidden flex items-center justify-center">
              {authorAvatarUrl ? (
                <img src={authorAvatarUrl} alt={post.author.name} className="w-full h-full object-cover rounded-full" />
              ) : (
                <UserIcon className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight truncate hover:text-[#03cafc] cursor-pointer transition-colors">
                {post.author.name}
              </h3>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-gray-400">{formatPostTime(post.createdAt)}</span>
              {!isAuthor && (
                <>
                  <span className="text-xs text-gray-500">•</span>
                  <button
                    onClick={async () => {
                      try {
                        const token = Cookies.get("token");
                        const { data } = await axios.post(
                          `${post_service}/api/v1/posts/user/follow/${post.author._id}`,
                          {},
                          { headers: { Authorization: `Bearer ${token}` } }
                        );
                        toast.success(data.message || `Following ${post.author.name}!`);
                      } catch {
                        toast.error("Could not update follow status");
                      }
                    }}
                    className="text-xs font-bold text-[#03cafc] hover:underline cursor-pointer"
                  >
                    Follow
                  </button>
                </>
              )}
            </div>
            {post.location && (
              <p className="text-[11px] text-gray-400 truncate">{post.location}</p>
            )}
          </div>
        </div>

        {/* Options Menu */}
        <div className="relative">
          <button
            onClick={() => setShowOptionsMenu((prev) => !prev)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800/60 rounded-full transition-colors cursor-pointer"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showOptionsMenu && (
            <div className="absolute right-0 top-8 z-30 w-44 bg-[#202c33] border border-gray-700/70 rounded-xl shadow-xl py-1 animate-in fade-in zoom-in-95">
              {isAuthor ? (
                <button
                  onClick={handleDeletePost}
                  disabled={deleting}
                  className="w-full px-3.5 py-2 text-left text-xs font-semibold text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Post</span>
                </button>
              ) : (
                onOpenChatWithUser && (
                  <button
                    onClick={() => {
                      setShowOptionsMenu(false);
                      onOpenChatWithUser(post.author as unknown as User);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-semibold text-white hover:bg-gray-700/60 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-[#03cafc]" />
                    <span>Send Message</span>
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. Media Area (With Double-Tap Support) */}
      <div
        className="relative w-full bg-black flex items-center justify-center select-none overflow-hidden"
        onClick={handleDoubleTap}
      >
        {activeMedia?.type === "video" ? (
          <video
            src={activeMedia.url}
            controls
            playsInline
            className="w-full max-h-[580px] object-contain"
          />
        ) : (
          <img
            src={activeMedia?.url}
            alt="Post content"
            className="w-full max-h-[580px] object-contain"
            loading="lazy"
          />
        )}

        {/* Double-Tap Pop Heart Animation */}
        {showHeartAnimation && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <Heart className="w-24 h-24 text-rose-500 fill-rose-500 drop-shadow-2xl animate-ping opacity-90 duration-300" />
          </div>
        )}

        {/* Carousel Navigation Arrows */}
        {post.media.length > 1 && (
          <>
            {currentMediaIndex > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevMedia();
                }}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-sm transition-all cursor-pointer z-10 shadow-lg"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {currentMediaIndex < post.media.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextMedia();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-sm transition-all cursor-pointer z-10 shadow-lg"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {/* Carousel Dot Indicators */}
            <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-1.5 z-10 pointer-events-none">
              {post.media.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 rounded-full transition-all ${
                    currentMediaIndex === idx ? "w-5 bg-[#03cafc]" : "w-1.5 bg-white/50"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* 3. Action Bar & Metrics */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            {/* Like Button */}
            <button
              onClick={handleToggleLike}
              className="group flex items-center gap-1.5 transition-transform active:scale-125 cursor-pointer"
              title={isLiked ? "Unlike" : "Like"}
            >
              <Heart
                className={`w-6 h-6 transition-colors ${
                  isLiked
                    ? "fill-rose-500 text-rose-500 drop-shadow-md"
                    : "text-gray-300 group-hover:text-rose-400"
                }`}
              />
            </button>

            {/* Comments Icon */}
            <button
              onClick={() => setShowCommentsDrawer(true)}
              className="text-gray-300 hover:text-[#03cafc] transition-colors cursor-pointer"
              title="Comments"
            >
              <MessageCircle className="w-6 h-6" />
            </button>

            {/* Share */}
            <button
              onClick={async () => {
                const ok = await copyToClipboard(window.location.href);
                if (ok) {
                  toast.success("Post link copied to clipboard! 📋");
                } else {
                  toast.error("Failed to copy link");
                }
              }}
              className="text-gray-300 hover:text-[#03cafc] transition-colors cursor-pointer"
              title="Share"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Viewers Counter / Trigger (Creator Transparency) */}
            <button
              onClick={() => {
                if (isAuthor) {
                  setShowViewersModal(true);
                } else {
                  toast("Total views recorded on this post", { icon: "👁️" });
                }
              }}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
              title={isAuthor ? "Inspect Viewers List" : "Views"}
            >
              <Eye className="w-4 h-4 text-[#03cafc]" />
              <span className="font-semibold">{viewsCount}</span>
            </button>

            {/* Bookmark Button */}
            <button
              onClick={handleToggleBookmark}
              className="text-gray-300 hover:text-amber-400 transition-transform active:scale-125 cursor-pointer"
              title={isSaved ? "Saved" : "Save Post"}
            >
              <Bookmark
                className={`w-6 h-6 transition-colors ${
                  isSaved ? "fill-amber-400 text-amber-400" : "text-gray-300"
                }`}
              />
            </button>
          </div>
        </div>

        {/* 4. Likers Modal Trigger (Clickable Like Counter) */}
        <div className="mb-2">
          <button
            onClick={() => setShowLikersModal(true)}
            className="text-xs font-bold text-white hover:underline cursor-pointer tracking-tight"
          >
            {likesCount} {likesCount === 1 ? "like" : "likes"}
          </button>
        </div>

        {/* 5. Caption & Hashtags */}
        {post.caption && (
          <div className="text-xs text-gray-200 leading-relaxed mb-2">
            <span className="font-bold text-white mr-1.5">{post.author.name}</span>
            <span>{post.caption}</span>
          </div>
        )}

        {/* Hashtags Strip */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {post.tags.map((tag, idx) => (
              <span
                key={idx}
                className="text-[11px] font-semibold text-[#03cafc] hover:underline cursor-pointer"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* View All Comments Trigger */}
        {commentsCount > 0 ? (
          <button
            onClick={() => setShowCommentsDrawer(true)}
            className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer block mt-1"
          >
            View all {commentsCount} {commentsCount === 1 ? "comment" : "comments"}
          </button>
        ) : (
          <button
            onClick={() => setShowCommentsDrawer(true)}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors cursor-pointer block mt-1"
          >
            Add a comment...
          </button>
        )}
      </div>

      {/* Modals */}
      <LikersModal
        postId={post._id}
        isOpen={showLikersModal}
        onClose={() => setShowLikersModal(false)}
        onOpenChatWithUser={onOpenChatWithUser}
      />

      <ViewersModal
        postId={post._id}
        isOpen={showViewersModal}
        onClose={() => setShowViewersModal(false)}
        onOpenChatWithUser={onOpenChatWithUser}
      />

      <CommentsDrawer
        postId={post._id}
        isOpen={showCommentsDrawer}
        onClose={() => setShowCommentsDrawer(false)}
        loggedInUser={loggedInUser}
        onCommentCountChange={(newCount) => setCommentsCount(newCount)}
      />
    </article>
  );
};

export default PostCard;
