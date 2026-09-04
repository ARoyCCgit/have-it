"use client"

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { UserPlus, UserCheck, X, Sparkles, MessageSquare, User as UserIcon, Loader2 } from "lucide-react";
import { post_service, User } from "@/context/Appcontext";
import toast from "react-hot-toast";

interface SuggestedUser {
  _id: string;
  name: string;
  email: string;
  avatar?: { url?: string } | string;
  about?: string;
  isFollowing?: boolean;
}

interface SuggestedUsersBarProps {
  onFollowChanged?: () => void;
  onOpenChatWithUser?: (user: User) => void;
}

export const SuggestedUsersBar: React.FC<SuggestedUsersBarProps> = ({
  onFollowChanged,
  onOpenChatWithUser,
}) => {
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const fetchSuggestions = useCallback(async () => {
    try {
      const token = Cookies.get("token");
      const { data } = await axios.get(`${post_service}/api/v1/posts/user/suggestions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (data.success) {
        setSuggestions(data.suggestions || []);
      }
    } catch {
      // Silently ignore if none
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  // Handle follow / unfollow toggle
  const handleFollowToggle = async (targetUser: SuggestedUser) => {
    const isCurrentlyFollowing = targetUser.isFollowing;
    setActionLoading((prev) => ({ ...prev, [targetUser._id]: true }));

    // Optimistic UI update
    setSuggestions((prev) =>
      prev.map((u) =>
        u._id === targetUser._id ? { ...u, isFollowing: !isCurrentlyFollowing } : u
      )
    );

    try {
      const token = Cookies.get("token");
      const endpoint = isCurrentlyFollowing
        ? `${post_service}/api/v1/posts/user/unfollow/${targetUser._id}`
        : `${post_service}/api/v1/posts/user/follow/${targetUser._id}`;

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
        toast.success(data.message || (isCurrentlyFollowing ? "Unfollowed" : `Following ${targetUser.name}! 🎉`));
        if (onFollowChanged) onFollowChanged();
      }
    } catch {
      // Revert on error
      setSuggestions((prev) =>
        prev.map((u) =>
          u._id === targetUser._id ? { ...u, isFollowing: isCurrentlyFollowing } : u
        )
      );
      toast.error("Failed to update follow status");
    } finally {
      setActionLoading((prev) => ({ ...prev, [targetUser._id]: false }));
    }
  };

  const handleDismiss = (userId: string) => {
    setDismissedIds((prev) => new Set(prev).add(userId));
  };

  const activeSuggestions = suggestions.filter((u) => !dismissedIds.has(u._id));

  if (loading || activeSuggestions.length === 0) return null;

  return (
    <div className="bg-[#111b21] border border-gray-800 rounded-2xl p-4 mb-6 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#03cafc]" />
          <h3 className="text-xs font-bold text-white tracking-tight uppercase">Suggested for you</h3>
        </div>
        <span className="text-[11px] text-gray-400">People you may know</span>
      </div>

      {/* Horizontal Carousel of Suggestion Cards (Facebook/Instagram Style) */}
      <div className="flex items-stretch gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-800 select-none">
        {activeSuggestions.map((user) => {
          const avatarUrl =
            typeof user.avatar === "string" ? user.avatar : user.avatar?.url || "";

          return (
            <div
              key={user._id}
              className="relative w-36 bg-[#202c33] border border-gray-700/60 rounded-2xl p-3 flex flex-col items-center text-center shrink-0 shadow-md group hover:border-gray-600 transition-all"
            >
              {/* Dismiss X button */}
              <button
                onClick={() => handleDismiss(user._id)}
                className="absolute top-2 right-2 p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3 h-3" />
              </button>

              {/* Avatar */}
              <div className="w-14 h-14 rounded-full bg-gray-800 border-2 border-[#03cafc]/40 overflow-hidden flex items-center justify-center mb-2 shadow-inner">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-6 h-6 text-gray-400" />
                )}
              </div>

              {/* Name & Bio */}
              <h4 className="text-xs font-bold text-white truncate w-full mb-0.5" title={user.name}>
                {user.name}
              </h4>
              <p className="text-[10px] text-gray-400 line-clamp-1 w-full mb-3">
                {user.about || "Have-it Member"}
              </p>

              {/* Follow Button */}
              <div className="w-full mt-auto space-y-1.5">
                <button
                  onClick={() => handleFollowToggle(user)}
                  disabled={actionLoading[user._id]}
                  className={`w-full py-1.5 px-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1 active:scale-95 ${
                    user.isFollowing
                      ? "bg-gray-700 text-gray-300 hover:bg-rose-500/20 hover:text-rose-400 border border-gray-600"
                      : "bg-[#03cafc] hover:bg-[#029ecc] text-[#0b141a] shadow-[#03cafc]/20"
                  }`}
                >
                  {user.isFollowing ? (
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

                {onOpenChatWithUser && (
                  <button
                    onClick={() => onOpenChatWithUser(user as unknown as User)}
                    className="w-full py-1 px-2 bg-transparent hover:bg-gray-700/50 text-[11px] font-semibold text-[#03cafc] rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>Chat</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SuggestedUsersBar;
