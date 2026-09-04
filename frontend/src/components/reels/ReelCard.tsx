"use client"

import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Volume2,
  VolumeX,
  Play,
  UserPlus,
  UserCheck,
  Disc,
  MoreVertical,
  Trash2,
  User as UserIcon,
  Loader2,
} from "lucide-react";
import { post_service, User } from "@/context/Appcontext";
import toast from "react-hot-toast";
import type { PostData } from "@/components/posts/PostCard";
import CommentsDrawer from "@/components/posts/CommentsDrawer";
import LikersModal from "@/components/posts/LikersModal";

interface ReelCardProps {
  reel: PostData;
  isActive: boolean;
  loggedInUser: User | null;
  onReelDeleted?: (reelId: string) => void;
  onOpenChatWithUser?: (user: User) => void;
}

export const ReelCard: React.FC<ReelCardProps> = ({
  reel,
  isActive,
  loggedInUser,
  onReelDeleted,
  onOpenChatWithUser,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isLiked, setIsLiked] = useState(Boolean(reel.isLikedByMe));
  const [likesCount, setLikesCount] = useState(reel.likesCount || 0);
  const [isSaved, setIsSaved] = useState(Boolean(reel.isSavedByMe));
  const [commentsCount, setCommentsCount] = useState(reel.commentsCount || 0);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [showCommentsDrawer, setShowCommentsDrawer] = useState(false);
  const [showLikersModal, setShowLikersModal] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const isAuthor = loggedInUser?._id === reel.author?._id;
  const authorAvatarUrl =
    typeof reel.author?.avatar === "string"
      ? reel.author.avatar
      : reel.author?.avatar?.url || "";

  const videoMedia =
    reel.media?.find((m) => m.type === "video") || reel.media?.[0];
  const isActuallyVideo =
    videoMedia?.type === "video" ||
    Boolean(videoMedia?.url && /\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(videoMedia.url));
  const videoSrc = videoMedia?.url || "";

  const [videoLoading, setVideoLoading] = useState(isActuallyVideo);
  const [videoError, setVideoError] = useState(false);

  // Autoplay/pause based on isActive
  useEffect(() => {
    if (videoRef.current && isActuallyVideo && !videoError) {
      if (isActive) {
        videoRef.current.currentTime = 0;
        videoRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [isActive, isActuallyVideo, videoError]);

  // Live Post Socket sync (likes, comments count, reel deletion)
  useEffect(() => {
    const handleLikesUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ postId: string; likesCount: number }>;
      if (customEvent.detail?.postId === reel._id && typeof customEvent.detail.likesCount === "number") {
        setLikesCount(customEvent.detail.likesCount);
      }
    };

    const handleCommentsCountUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ postId: string; commentsCount: number }>;
      if (customEvent.detail?.postId === reel._id && typeof customEvent.detail.commentsCount === "number") {
        setCommentsCount(customEvent.detail.commentsCount);
      }
    };

    const handlePostDeleted = (e: Event) => {
      const customEvent = e as CustomEvent<{ postId: string }>;
      if (customEvent.detail?.postId === reel._id && onReelDeleted) {
        onReelDeleted(reel._id);
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
  }, [reel._id, onReelDeleted]);

  // Toggle Play / Pause
  const handleTogglePlay = () => {
    if (!videoRef.current || !isActuallyVideo || videoError) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // Toggle Mute
  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Double tap like
  const lastTapRef = useRef<number>(0);
  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!isLiked) handleToggleLike();
      setShowHeartAnim(true);
      setTimeout(() => setShowHeartAnim(false), 900);
    }
    lastTapRef.current = now;
  };

  // Toggle Like
  const handleToggleLike = async () => {
    const prevLiked = isLiked;
    const prevCount = likesCount;

    setIsLiked(!prevLiked);
    setLikesCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);

    try {
      const token = Cookies.get("token");
      const { data } = await axios.put(
        `${post_service}/api/v1/posts/${reel._id}/like`,
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

  // Toggle Bookmark
  const handleToggleBookmark = async () => {
    const prevSaved = isSaved;
    setIsSaved(!prevSaved);

    try {
      const token = Cookies.get("token");
      const { data } = await axios.put(
        `${post_service}/api/v1/posts/${reel._id}/bookmark`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (data.success) {
        setIsSaved(data.isSaved);
        toast.success(data.isSaved ? "Saved to collection" : "Removed");
      }
    } catch {
      setIsSaved(prevSaved);
      toast.error("Failed to update bookmark");
    }
  };

  // Toggle Follow
  const handleToggleFollow = async () => {
    if (!reel.author?._id || followLoading) return;
    setFollowLoading(true);
    const prev = isFollowing;
    setIsFollowing(!prev);

    try {
      const token = Cookies.get("token");
      const endpoint = prev
        ? `${post_service}/api/v1/posts/user/unfollow/${reel.author._id}`
        : `${post_service}/api/v1/posts/user/follow/${reel.author._id}`;

      const { data } = await axios.post(
        endpoint,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (data.success) {
        toast.success(data.message || (prev ? "Unfollowed" : `Following ${reel.author.name}!`));
      }
    } catch {
      setIsFollowing(prev);
      toast.error("Failed to update follow");
    } finally {
      setFollowLoading(false);
    }
  };

  // Delete Reel
  const handleDelete = async () => {
    if (!confirm("Delete this reel?")) return;
    try {
      const token = Cookies.get("token");
      const { data } = await axios.delete(`${post_service}/api/v1/posts/${reel._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (data.success) {
        toast.success("Reel deleted");
        if (onReelDeleted) onReelDeleted(reel._id);
      }
    } catch {
      toast.error("Failed to delete reel");
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-110px)] max-w-sm mx-auto bg-black rounded-3xl overflow-hidden shadow-2xl snap-start flex items-center justify-center select-none border border-gray-800 my-2">
      {/* Background Media: Video (if video file) or Image */}
      {isActuallyVideo && !videoError ? (
        <>
          <video
            ref={videoRef}
            src={videoSrc}
            poster={videoMedia?.thumbnailUrl}
            preload="metadata"
            loop
            playsInline
            muted={isMuted}
            onWaiting={() => setVideoLoading(true)}
            onPlaying={() => setVideoLoading(false)}
            onLoadedData={() => setVideoLoading(false)}
            onError={() => {
              setVideoLoading(false);
              setVideoError(true);
            }}
            onClick={() => {
              handleDoubleTap();
              handleTogglePlay();
            }}
            className="w-full h-full object-cover cursor-pointer"
          />

          {/* Buffering/Loading Spinner for Video */}
          {videoLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 pointer-events-none z-10">
              <Loader2 className="w-8 h-8 text-[#03cafc] animate-spin" />
              <span className="text-[11px] text-gray-300 font-medium">Loading video...</span>
            </div>
          )}

          {/* Play/Pause Overlay Indicator */}
          {!isPlaying && !videoLoading && (
            <div
              onClick={handleTogglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer pointer-events-auto"
            >
              <div className="p-4 bg-black/60 backdrop-blur-md rounded-full text-white">
                <Play className="w-10 h-10 fill-white" />
              </div>
            </div>
          )}
        </>
      ) : (
        /* Image fallback or Image Reel (9:16 Photo) */
        <div
          onClick={() => {
            handleDoubleTap();
          }}
          className="w-full h-full flex items-center justify-center bg-[#0b141a] cursor-pointer overflow-hidden"
        >
          <img
            src={videoSrc}
            alt={reel.caption || "Reel"}
            className="w-full h-full object-cover select-none"
          />
        </div>
      )}

      {/* Big Double-Tap Animated Heart */}
      {showHeartAnim && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-in zoom-in-50 fade-in duration-200">
          <Heart className="w-28 h-28 fill-rose-500 text-rose-500 drop-shadow-[0_0_35px_rgba(244,63,94,0.8)] animate-bounce" />
        </div>
      )}

      {/* Top Controls: Mute Toggle (Only if video) */}
      {isActuallyVideo && !videoError && (
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={handleToggleMute}
            className="p-2.5 bg-black/50 hover:bg-black/80 backdrop-blur-md text-white rounded-full transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-gray-300" /> : <Volume2 className="w-5 h-5 text-[#03cafc]" />}
          </button>
        </div>
      )}

      {/* Right-Side Action Column */}
      <div className="absolute right-3 bottom-16 z-20 flex flex-col items-center gap-4 text-white">
        {/* Creator Avatar & 1-click Follow button */}
        <div className="relative flex flex-col items-center">
          <div className="w-11 h-11 rounded-full p-[2px] bg-gradient-to-tr from-[#03cafc] to-sky-400 overflow-hidden shadow-lg">
            {authorAvatarUrl ? (
              <img src={authorAvatarUrl} alt={reel.author?.name} className="w-full h-full object-cover rounded-full" />
            ) : (
              <UserIcon className="w-full h-full p-2 bg-[#111b21] text-gray-400 rounded-full" />
            )}
          </div>

          {!isAuthor && (
            <button
              onClick={handleToggleFollow}
              disabled={followLoading}
              className={`absolute -bottom-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold shadow-md cursor-pointer transition-transform active:scale-95 ${
                isFollowing ? "bg-gray-700 text-gray-300" : "bg-[#03cafc] text-[#0b141a]"
              }`}
            >
              {isFollowing ? <UserCheck className="w-2.5 h-2.5" /> : <UserPlus className="w-2.5 h-2.5" />}
            </button>
          )}
        </div>

        {/* Like Button */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={handleToggleLike}
            className="p-2.5 bg-black/40 hover:bg-black/70 backdrop-blur-md rounded-full transition-transform active:scale-90 cursor-pointer"
          >
            <Heart className={`w-6 h-6 ${isLiked ? "fill-rose-500 text-rose-500" : "text-white"}`} />
          </button>
          <span
            onClick={() => setShowLikersModal(true)}
            className="text-[11px] font-bold drop-shadow cursor-pointer hover:underline"
          >
            {likesCount}
          </span>
        </div>

        {/* Comment Button */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => setShowCommentsDrawer(true)}
            className="p-2.5 bg-black/40 hover:bg-black/70 backdrop-blur-md rounded-full transition-transform active:scale-90 cursor-pointer"
          >
            <MessageCircle className="w-6 h-6 text-white" />
          </button>
          <span className="text-[11px] font-bold drop-shadow">{commentsCount}</span>
        </div>

        {/* Bookmark Button */}
        <button
          onClick={handleToggleBookmark}
          className="p-2.5 bg-black/40 hover:bg-black/70 backdrop-blur-md rounded-full transition-transform active:scale-90 cursor-pointer"
        >
          <Bookmark className={`w-6 h-6 ${isSaved ? "fill-amber-400 text-amber-400" : "text-white"}`} />
        </button>

        {/* Share Button */}
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            toast.success("Reel link copied! 📋");
          }}
          className="p-2.5 bg-black/40 hover:bg-black/70 backdrop-blur-md rounded-full transition-transform active:scale-90 cursor-pointer"
        >
          <Share2 className="w-5 h-5 text-white" />
        </button>

        {/* Delete button (Author only) */}
        {isAuthor && (
          <button
            onClick={handleDelete}
            className="p-2 bg-rose-950/60 hover:bg-rose-900 text-rose-400 rounded-full transition-colors cursor-pointer"
            title="Delete Reel"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Bottom Info Overlay */}
      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 space-y-2 pointer-events-none">
        <div className="pointer-events-auto max-w-[80%] space-y-1">
          <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
            <span>{reel.author?.name}</span>
            <span className="text-xs text-gray-400 font-normal">• Have-it Reel</span>
          </h4>

          {/* Caption */}
          {reel.caption && (
            <p
              onClick={() => setShowFullCaption(!showFullCaption)}
              className={`text-xs text-gray-200 leading-relaxed cursor-pointer ${
                showFullCaption ? "" : "line-clamp-2"
              }`}
            >
              {reel.caption}
            </p>
          )}

          {/* Hashtags */}
          {reel.tags && reel.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {reel.tags.map((tag, idx) => (
                <span key={idx} className="text-[#03cafc] text-[11px] font-bold">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Music Track Pill */}
          <div className="flex items-center gap-2 pt-1 text-xs text-gray-300">
            <Disc className="w-3.5 h-3.5 text-[#03cafc] animate-spin" />
            <span className="truncate text-[11px] font-medium">Original Audio • {reel.author?.name}</span>
          </div>
        </div>
      </div>

      {/* Embedded Modals */}
      <LikersModal
        postId={reel._id}
        isOpen={showLikersModal}
        onClose={() => setShowLikersModal(false)}
        onOpenChatWithUser={onOpenChatWithUser}
      />

      <CommentsDrawer
        postId={reel._id}
        isOpen={showCommentsDrawer}
        onClose={() => setShowCommentsDrawer(false)}
        loggedInUser={loggedInUser}
        onCommentCountChange={(count) => setCommentsCount(count)}
      />
    </div>
  );
};

export default ReelCard;
