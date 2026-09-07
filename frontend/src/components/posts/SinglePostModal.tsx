"use client"

import React, { useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import {
  X,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { post_service, User } from "@/context/Appcontext";
import toast from "react-hot-toast";
import type { PostData } from "./PostCard";
import CommentsDrawer from "./CommentsDrawer";
import LikersModal from "./LikersModal";
import ViewersModal from "./ViewersModal";
import { copyToClipboard } from "@/utils/clipboard";

interface SinglePostModalProps {
  post: PostData | null;
  isOpen: boolean;
  onClose: () => void;
  loggedInUser: User | null;
  onPostDeleted?: (postId: string) => void;
  onOpenChatWithUser?: (user: User) => void;
}

export const SinglePostModal: React.FC<SinglePostModalProps> = ({
  post,
  isOpen,
  onClose,
  loggedInUser,
  onPostDeleted,
  onOpenChatWithUser,
}) => {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(Boolean(post?.isLikedByMe));
  const [likesCount, setLikesCount] = useState(post?.likesCount || 0);
  const [isSaved, setIsSaved] = useState(Boolean(post?.isSavedByMe));
  const [commentsCount, setCommentsCount] = useState(post?.commentsCount || 0);
  const [showCommentsDrawer, setShowCommentsDrawer] = useState(false);
  const [showLikersModal, setShowLikersModal] = useState(false);
  const [showViewersModal, setShowViewersModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Sync state when post changes
  React.useEffect(() => {
    if (post) {
      setIsLiked(Boolean(post.isLikedByMe));
      setLikesCount(post.likesCount || 0);
      setIsSaved(Boolean(post.isSavedByMe));
      setCommentsCount(post.commentsCount || 0);
      setCurrentMediaIndex(0);
    }
  }, [post]);

  // Live Post Socket sync (likes, comments count, post deletion)
  React.useEffect(() => {
    if (!post?._id || !isOpen) return;

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
      if (customEvent.detail?.postId === post._id) {
        if (onPostDeleted) onPostDeleted(post._id);
        onClose();
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
  }, [post?._id, isOpen, onPostDeleted, onClose]);

  if (!isOpen || !post) return null;

  const isAuthor = loggedInUser?._id === post.author?._id;
  const authorAvatarUrl =
    typeof post.author?.avatar === "string"
      ? post.author.avatar
      : post.author?.avatar?.url || "";

  // 1. Toggle Like
  const handleToggleLike = async () => {
    const prevLiked = isLiked;
    const prevCount = likesCount;

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
    } catch {
      setIsLiked(prevLiked);
      setLikesCount(prevCount);
      toast.error("Failed to update like");
    }
  };

  // 2. Toggle Bookmark
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
        toast.success(data.message || (data.isSaved ? "Saved to collection" : "Removed"));
      }
    } catch {
      setIsSaved(prevSaved);
      toast.error("Failed to update bookmark");
    }
  };

  // 3. Delete Post
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
        toast.success("Post deleted");
        if (onPostDeleted) onPostDeleted(post._id);
        onClose();
      }
    } catch {
      toast.error("Failed to delete post");
    } finally {
      setDeleting(false);
    }
  };

  const activeMedia = post.media[currentMediaIndex] || post.media[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl bg-[#111b21] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-30 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Side: Media Area */}
        <div className="relative w-full md:w-[58%] bg-black flex items-center justify-center select-none min-h-[300px] md:min-h-[500px]">
          {activeMedia?.type === "video" ? (
            <video
              src={activeMedia.url}
              controls
              playsInline
              className="w-full h-full max-h-[580px] object-contain"
            />
          ) : (
            <img
              src={activeMedia?.url}
              alt="Post media"
              className="w-full h-full max-h-[580px] object-contain"
            />
          )}

          {/* Carousel Arrows */}
          {post.media.length > 1 && (
            <>
              {currentMediaIndex > 0 && (
                <button
                  onClick={() => setCurrentMediaIndex((prev) => prev - 1)}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 p-2 bg-black/60 text-white rounded-full hover:bg-black/90 transition-colors z-10 cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              {currentMediaIndex < post.media.length - 1 && (
                <button
                  onClick={() => setCurrentMediaIndex((prev) => prev + 1)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 bg-black/60 text-white rounded-full hover:bg-black/90 transition-colors z-10 cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}

              {/* Dots */}
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

        {/* Right Side: Author, Details, Actions & Comments */}
        <div className="w-full md:w-[42%] flex flex-col justify-between bg-[#111b21] border-t md:border-t-0 md:border-l border-gray-800 p-4">
          {/* Header */}
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-gray-800 border border-[#03cafc]/40 overflow-hidden flex items-center justify-center shrink-0">
                  {authorAvatarUrl ? (
                    <img src={authorAvatarUrl} alt={post.author.name} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white truncate">{post.author.name}</h4>
                  {post.location && (
                    <p className="text-[10px] text-gray-400 truncate">{post.location}</p>
                  )}
                </div>
              </div>

              {isAuthor && (
                <button
                  onClick={handleDeletePost}
                  disabled={deleting}
                  className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Caption & Tags */}
            <div className="py-3 max-h-48 overflow-y-auto space-y-2 text-xs text-gray-200">
              {post.caption && <p className="leading-relaxed whitespace-pre-wrap">{post.caption}</p>}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {post.tags.map((tag, idx) => (
                    <span key={idx} className="text-[#03cafc] font-semibold">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-gray-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={handleToggleLike} className="cursor-pointer text-gray-300 hover:text-rose-500">
                  <Heart className={`w-6 h-6 ${isLiked ? "fill-rose-500 text-rose-500" : ""}`} />
                </button>
                <button
                  onClick={() => setShowCommentsDrawer(true)}
                  className="cursor-pointer text-gray-300 hover:text-[#03cafc]"
                >
                  <MessageCircle className="w-6 h-6" />
                </button>
                <button
                  onClick={async () => {
                    const ok = await copyToClipboard(window.location.href);
                    if (ok) {
                      toast.success("Link copied! 📋");
                    } else {
                      toast.error("Failed to copy link");
                    }
                  }}
                  className="cursor-pointer text-gray-300 hover:text-[#03cafc]"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (isAuthor) setShowViewersModal(true);
                  }}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-white"
                >
                  <Eye className="w-4 h-4 text-[#03cafc]" />
                  <span>{post.viewsCount || 0}</span>
                </button>
                <button onClick={handleToggleBookmark} className="cursor-pointer text-gray-300 hover:text-amber-400">
                  <Bookmark className={`w-6 h-6 ${isSaved ? "fill-amber-400 text-amber-400" : ""}`} />
                </button>
              </div>
            </div>

            {/* Likers Trigger */}
            <button
              onClick={() => setShowLikersModal(true)}
              className="text-xs font-bold text-white hover:underline cursor-pointer"
            >
              {likesCount} {likesCount === 1 ? "like" : "likes"}
            </button>

            {/* Comments Trigger */}
            <button
              onClick={() => setShowCommentsDrawer(true)}
              className="text-xs text-[#03cafc] font-semibold hover:underline block cursor-pointer"
            >
              View all {commentsCount} comments & replies
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Modals */}
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
        onCommentCountChange={(count) => setCommentsCount(count)}
      />
    </div>
  );
};

export default SinglePostModal;
