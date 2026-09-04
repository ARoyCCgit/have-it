"use client"

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { X, Search, MessageSquare, Loader2, User as UserIcon, UserCheck, UserPlus } from "lucide-react";
import { post_service, User } from "@/context/Appcontext";
import toast from "react-hot-toast";

interface FollowUser {
  _id: string;
  name: string;
  email: string;
  avatar?: { url?: string } | string;
  about?: string;
  isFollowing?: boolean;
  isSelf?: boolean;
}

interface FollowListModalProps {
  userId: string;
  userName: string;
  type: "followers" | "following";
  isOpen: boolean;
  onClose: () => void;
  onOpenChatWithUser?: (user: User) => void;
}

export const FollowListModal: React.FC<FollowListModalProps> = ({
  userId,
  userName,
  type,
  isOpen,
  onClose,
  onOpenChatWithUser,
}) => {
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const fetchUsers = useCallback(async () => {
    if (!isOpen || !userId) return;
    setLoading(true);
    try {
      const token = Cookies.get("token");
      const endpoint =
        type === "followers"
          ? `${post_service}/api/v1/posts/user/${userId}/followers`
          : `${post_service}/api/v1/posts/user/${userId}/following`;

      const { data } = await axios.get(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (data.success) {
        setUsers(type === "followers" ? data.followers || [] : data.following || []);
      }
    } catch (err) {
      console.error("Failed to load follow list:", err);
    } finally {
      setLoading(false);
    }
  }, [isOpen, userId, type]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Toggle follow/unfollow
  const handleToggleFollow = async (targetUser: FollowUser) => {
    const isCurrentlyFollowing = targetUser.isFollowing;
    setActionLoading((prev) => ({ ...prev, [targetUser._id]: true }));

    // Optimistic UI update
    setUsers((prev) =>
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
        toast.success(data.message || (isCurrentlyFollowing ? "Unfollowed" : "Following"));
      }
    } catch {
      // Revert on error
      setUsers((prev) =>
        prev.map((u) =>
          u._id === targetUser._id ? { ...u, isFollowing: isCurrentlyFollowing } : u
        )
      );
      toast.error("Failed to update follow status");
    } finally {
      setActionLoading((prev) => ({ ...prev, [targetUser._id]: false }));
    }
  };

  if (!isOpen) return null;

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-[#111b21] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-[#202c33] border-b border-gray-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white capitalize">
              {type === "followers" ? "Followers" : "Following"}
            </h3>
            <p className="text-[11px] text-gray-400">{userName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-gray-800/80 bg-[#111b21]">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-gray-400 absolute left-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full bg-[#202c33] border border-gray-800 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#03cafc] transition-colors"
            />
          </div>
        </div>

        {/* Users Stream */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-gray-800/40">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin text-[#03cafc]" />
              <span>Loading {type}...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">
              {searchQuery ? "No matching users found" : `No ${type} yet`}
            </div>
          ) : (
            filteredUsers.map((user) => {
              const avatarUrl =
                typeof user.avatar === "string" ? user.avatar : user.avatar?.url || "";

              return (
                <div key={user._id} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700/60 overflow-hidden flex items-center justify-center shrink-0">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate hover:text-[#03cafc] cursor-pointer">
                        {user.name}
                      </h4>
                      <p className="text-[11px] text-gray-400 truncate max-w-[150px]">
                        {user.about || user.email}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {!user.isSelf && (
                      <button
                        onClick={() => handleToggleFollow(user)}
                        disabled={actionLoading[user._id]}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                          user.isFollowing
                            ? "bg-gray-800 text-gray-300 hover:bg-rose-500/20 hover:text-rose-400 border border-gray-700"
                            : "bg-[#03cafc] hover:bg-[#029ecc] text-[#0b141a] shadow-sm shadow-[#03cafc]/20"
                        }`}
                      >
                        {user.isFollowing ? (
                          <>
                            <UserCheck className="w-3 h-3" />
                            <span>Following</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3 h-3" />
                            <span>Follow</span>
                          </>
                        )}
                      </button>
                    )}

                    {!user.isSelf && onOpenChatWithUser && (
                      <button
                        onClick={() => onOpenChatWithUser(user as unknown as User)}
                        className="p-1.5 bg-[#202c33] hover:bg-[#03cafc] hover:text-[#0b141a] text-[#03cafc] rounded-xl border border-[#03cafc]/30 transition-colors cursor-pointer"
                        title="Chat"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default FollowListModal;
