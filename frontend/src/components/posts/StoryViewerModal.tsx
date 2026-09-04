"use client"

import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Send,
  Trash2,
  Clock,
  User as UserIcon,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { post_service, User } from "@/context/Appcontext";
import toast from "react-hot-toast";

export interface StoryItem {
  _id: string;
  author: {
    _id: string;
    name: string;
    email: string;
    avatar?: { url?: string } | string;
  };
  media: {
    url: string;
    public_id: string;
    type: "image" | "video";
    thumbnailUrl?: string;
    duration?: number;
  };
  caption?: string;
  viewsCount: number;
  viewers?: Array<{
    user: string | { _id: string; name: string; avatar?: any };
    viewedAt: string;
    reactionEmoji?: string;
  }>;
  createdAt: string;
  expiresAt: string;
}

export interface UserStoryGroup {
  author: {
    _id: string;
    name: string;
    email: string;
    avatar?: { url?: string } | string;
  };
  stories: StoryItem[];
  hasUnseen?: boolean;
  isSelf?: boolean;
}

interface StoryViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  userGroups: UserStoryGroup[];
  initialUserIndex?: number;
  loggedInUser: User | null;
  onStoryDeleted?: () => void;
}

const QUICK_EMOJIS = ["🔥", "❤️", "😂", "😮", "😢", "👏"];

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  isOpen,
  onClose,
  userGroups,
  initialUserIndex = 0,
  loggedInUser,
  onStoryDeleted,
}) => {
  const [currentUserIndex, setCurrentUserIndex] = useState(initialUserIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [showViewersDrawer, setShowViewersDrawer] = useState(false);
  const [viewersList, setViewersList] = useState<any[]>([]);
  const [loadingViewers, setLoadingViewers] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentUserGroup = userGroups[currentUserIndex];
  const currentStory = currentUserGroup?.stories[currentStoryIndex];
  const isSelf = loggedInUser?._id === currentUserGroup?.author?._id;

  const authorAvatarUrl =
    typeof currentUserGroup?.author?.avatar === "string"
      ? currentUserGroup.author.avatar
      : currentUserGroup?.author?.avatar?.url || "";

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentUserIndex(initialUserIndex);
      setCurrentStoryIndex(0);
      setProgress(0);
      setShowViewersDrawer(false);
    }
  }, [isOpen, initialUserIndex]);

  // Mark story viewed
  const markViewed = useCallback(async (storyId: string) => {
    try {
      const token = Cookies.get("token");
      await axios.put(
        `${post_service}/api/v1/stories/${storyId}/view`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch {
      // Silently ignore
    }
  }, []);

  useEffect(() => {
    if (isOpen && currentStory && !isSelf) {
      markViewed(currentStory._id);
    }
  }, [isOpen, currentStory, isSelf, markViewed]);

  // Next Story / User navigation
  const handleNext = useCallback(() => {
    if (!currentUserGroup) return;
    if (currentStoryIndex < currentUserGroup.stories.length - 1) {
      setCurrentStoryIndex((prev) => prev + 1);
      setProgress(0);
    } else if (currentUserIndex < userGroups.length - 1) {
      setCurrentUserIndex((prev) => prev + 1);
      setCurrentStoryIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentUserGroup, currentStoryIndex, currentUserIndex, userGroups.length, onClose]);

  // Previous Story / User navigation
  const handlePrev = useCallback(() => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex((prev) => prev - 1);
      setProgress(0);
    } else if (currentUserIndex > 0) {
      setCurrentUserIndex((prev) => prev - 1);
      const prevGroup = userGroups[currentUserIndex - 1];
      setCurrentStoryIndex(prevGroup ? prevGroup.stories.length - 1 : 0);
      setProgress(0);
    }
  }, [currentStoryIndex, currentUserIndex, userGroups]);

  // Progress Bar timer
  useEffect(() => {
    if (!isOpen || isPaused || showViewersDrawer || !currentStory) return;

    const durationSeconds = currentStory.media.duration || 5;
    const intervalMs = 50;
    const increment = (intervalMs / (durationSeconds * 1000)) * 100;

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressIntervalRef.current!);
          handleNext();
          return 0;
        }
        return prev + increment;
      });
    }, intervalMs);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isOpen, isPaused, showViewersDrawer, currentStory, handleNext]);

  // Send Direct Message Reply / Reaction
  const handleSendReactionOrReply = async (emoji?: string) => {
    if (!currentStory) return;
    if (!emoji && !replyText.trim()) return;

    setSendingReply(true);
    try {
      const token = Cookies.get("token");
      const { data } = await axios.post(
        `${post_service}/api/v1/stories/${currentStory._id}/interact`,
        {
          reactionEmoji: emoji,
          text: replyText.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (data.success) {
        toast.success(
          emoji
            ? `Reacted ${emoji} (Sent to Have-it Chat! 💬)`
            : "Reply sent to Have-it Chat! 💬"
        );
        setReplyText("");
      }
    } catch (err: unknown) {
      console.error("Failed to send story reaction:", err);
      toast.error("Could not send reply");
    } finally {
      setSendingReply(false);
    }
  };

  // Fetch story viewers (Creator only)
  const handleOpenViewers = async () => {
    if (!currentStory || !isSelf) return;
    setShowViewersDrawer(true);
    setLoadingViewers(true);
    try {
      const token = Cookies.get("token");
      const { data } = await axios.get(`${post_service}/api/v1/stories/${currentStory._id}/viewers`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (data.success) {
        setViewersList(data.viewers || []);
      }
    } catch (err) {
      console.error("Viewers error:", err);
    } finally {
      setLoadingViewers(false);
    }
  };

  // Delete own story
  const handleDeleteStory = async () => {
    if (!currentStory || !confirm("Delete this story?")) return;
    try {
      const token = Cookies.get("token");
      const { data } = await axios.delete(`${post_service}/api/v1/stories/${currentStory._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (data.success) {
        toast.success("Story deleted");
        if (onStoryDeleted) onStoryDeleted();
        onClose();
      }
    } catch {
      toast.error("Failed to delete story");
    }
  };

  if (!isOpen || !currentStory) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl select-none animate-in fade-in duration-200">
      {/* Top Close & Author Header */}
      <div className="absolute top-4 inset-x-4 max-w-lg mx-auto z-30 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#111b21] p-[2px] border border-[#03cafc] overflow-hidden flex items-center justify-center">
            {authorAvatarUrl ? (
              <img src={authorAvatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" />
            ) : (
              <UserIcon className="w-4 h-4 text-gray-300" />
            )}
          </div>
          <div>
            <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              {currentUserGroup.author.name}
              {isSelf && (
                <span className="text-[10px] bg-gray-700/80 text-gray-300 px-1.5 py-0.2 rounded-md font-normal">
                  You
                </span>
              )}
            </h4>
            <p className="text-[11px] text-gray-300">24h Story</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSelf && (
            <button
              onClick={handleDeleteStory}
              className="p-2 bg-black/50 hover:bg-rose-600/80 text-white rounded-full transition-colors cursor-pointer"
              title="Delete Story"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onClose}
            className="p-2 bg-black/50 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Progress Bars Strip */}
      <div className="absolute top-2 inset-x-4 max-w-lg mx-auto z-30 flex items-center gap-1.5">
        {currentUserGroup.stories.map((s, idx) => {
          let fill = 0;
          if (idx < currentStoryIndex) fill = 100;
          else if (idx === currentStoryIndex) fill = progress;

          return (
            <div key={s._id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-75 ease-linear"
                style={{ width: `${fill}%` }}
              />
            </div>
          );
        })}
      </div>

      {/* Main Media Player Container */}
      <div
        className="relative w-full max-w-md h-full max-h-[85vh] sm:rounded-2xl overflow-hidden bg-black flex items-center justify-center shadow-2xl border border-gray-800"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Left & Right Tap Touch Zones */}
        <div
          onClick={handlePrev}
          className="absolute left-0 inset-y-0 w-1/3 z-20 cursor-pointer"
          title="Previous"
        />
        <div
          onClick={handleNext}
          className="absolute right-0 inset-y-0 w-1/3 z-20 cursor-pointer"
          title="Next"
        />

        {/* Media Item */}
        {currentStory.media.type === "video" ? (
          <video
            ref={videoRef}
            src={currentStory.media.url}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
            onEnded={handleNext}
          />
        ) : (
          <img
            src={currentStory.media.url}
            alt="Story"
            className="w-full h-full object-cover"
          />
        )}

        {/* Story Caption Overlay */}
        {currentStory.caption && (
          <div className="absolute bottom-24 inset-x-4 z-20 bg-black/60 backdrop-blur-md rounded-xl p-3 text-center text-sm font-medium text-white shadow-lg border border-white/10">
            {currentStory.caption}
          </div>
        )}

        {/* Desktop Left/Right Navigation Arrows */}
        {currentUserIndex > 0 || currentStoryIndex > 0 ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="hidden md:flex absolute -left-14 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer z-30"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        ) : null}

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className="hidden md:flex absolute -right-14 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer z-30"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Bottom Actions Bar (Direct Chat Bridge / Viewers Trigger) */}
      <div className="absolute bottom-4 inset-x-4 max-w-md mx-auto z-30 flex flex-col gap-2 pointer-events-auto">
        {isSelf ? (
          /* Creator Viewers Drawer Trigger */
          <button
            onClick={handleOpenViewers}
            className="w-full py-2.5 px-4 bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-between text-white text-xs font-semibold shadow-lg transition-all active:scale-98 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#03cafc]" />
              <span>{currentStory.viewsCount} {currentStory.viewsCount === 1 ? "view" : "views"}</span>
            </div>
            <div className="flex items-center gap-1 text-[#03cafc]">
              <span>Inspect Viewers</span>
              <ChevronUp className="w-4 h-4" />
            </div>
          </button>
        ) : (
          /* Direct Chat Reaction & Reply Box */
          <div className="space-y-2">
            {/* Quick Emoji Reaction Strip */}
            <div className="flex items-center justify-between px-2">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSendReactionOrReply(emoji)}
                  disabled={sendingReply}
                  className="text-2xl hover:scale-130 active:scale-95 transition-transform cursor-pointer drop-shadow-md"
                  title={`React ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Direct Message Input */}
            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/20 rounded-full px-3.5 py-1.5 shadow-xl">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendReactionOrReply();
                  }
                }}
                placeholder={`Reply to ${currentUserGroup.author.name}... 💬`}
                className="flex-1 bg-transparent text-xs text-white placeholder-gray-400 focus:outline-none"
              />
              <button
                onClick={() => handleSendReactionOrReply()}
                disabled={sendingReply || !replyText.trim()}
                className={`p-1.5 rounded-full transition-all cursor-pointer ${
                  replyText.trim()
                    ? "bg-[#03cafc] text-[#0b141a] shadow-md shadow-[#03cafc]/30 active:scale-95"
                    : "text-gray-500 cursor-not-allowed opacity-50"
                }`}
              >
                {sendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Creator Viewers Bottom Drawer */}
      {showViewersDrawer && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 bg-[#111b21] border-t border-gray-800 rounded-t-3xl max-w-md mx-auto max-h-[60vh] flex flex-col shadow-2xl p-4 animate-in slide-in-from-bottom duration-200 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-3 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#03cafc]" />
              <h4 className="text-sm font-bold text-white">Story Viewers ({viewersList.length})</h4>
            </div>
            <button
              onClick={() => setShowViewersDrawer(false)}
              className="p-1 text-gray-400 hover:text-white rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-2 divide-y divide-gray-800/40">
            {loadingViewers ? (
              <div className="py-8 flex items-center justify-center gap-2 text-xs text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin text-[#03cafc]" />
                <span>Loading viewers...</span>
              </div>
            ) : viewersList.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">No viewers yet</div>
            ) : (
              viewersList.map((viewer, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gray-800 overflow-hidden flex items-center justify-center shrink-0">
                      {viewer.avatar?.url || typeof viewer.avatar === "string" ? (
                        <img
                          src={typeof viewer.avatar === "string" ? viewer.avatar : viewer.avatar?.url}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UserIcon className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{viewer.name}</p>
                      <p className="text-[10px] text-gray-400">Viewed story</p>
                    </div>
                  </div>
                  {viewer.reactionEmoji && (
                    <span className="text-lg drop-shadow">{viewer.reactionEmoji}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryViewerModal;
