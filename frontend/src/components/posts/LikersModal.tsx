"use client"

import React, { useEffect, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { X, Heart, MessageSquare, Loader2, User as UserIcon } from "lucide-react";
import { post_service, User } from "@/context/Appcontext";
import toast from "react-hot-toast";

interface LikerUser {
  _id: string;
  name: string;
  email: string;
  avatar?: { url?: string } | string;
  about?: string;
  isFollowing?: boolean;
  isSelf?: boolean;
}

interface LikersModalProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  onOpenChatWithUser?: (user: User) => void;
}

export const LikersModal: React.FC<LikersModalProps> = ({
  postId,
  isOpen,
  onClose,
  onOpenChatWithUser,
}) => {
  const [likers, setLikers] = useState<LikerUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !postId) return;

    const fetchLikers = async () => {
      setLoading(true);
      try {
        const token = Cookies.get("token");
        const { data } = await axios.get(`${post_service}/api/v1/posts/${postId}/likers`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (data.success) {
          setLikers(data.likers || []);
        }
      } catch (err: unknown) {
        console.error("Failed to load post likers:", err);
        toast.error("Could not load likers list");
      } finally {
        setLoading(false);
      }
    };

    fetchLikers();
  }, [isOpen, postId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-[#111b21] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-[#202c33] border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
              <Heart className="w-4 h-4 fill-rose-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Likes</h3>
              <p className="text-xs text-gray-400">
                {likers.length} {likers.length === 1 ? "person" : "people"} liked this post
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Likers List Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-gray-800/40">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-[#03cafc]" />
              <span className="text-xs">Loading likers...</span>
            </div>
          ) : likers.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Heart className="w-10 h-10 mx-auto text-gray-600 mb-2 stroke-1" />
              <p className="text-sm font-semibold text-gray-300">No likes yet</p>
              <p className="text-xs text-gray-500 mt-0.5">Be the first to like this post!</p>
            </div>
          ) : (
            likers.map((user) => {
              const avatarUrl =
                typeof user.avatar === "string" ? user.avatar : user.avatar?.url || "";

              return (
                <div
                  key={user._id}
                  className="flex items-center justify-between pt-2 pb-1 px-2 hover:bg-[#202c33]/40 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700/60 overflow-hidden flex items-center justify-center shrink-0">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
                        {user.name}
                        {user.isSelf && (
                          <span className="text-[10px] bg-gray-700/80 text-gray-300 px-1.5 py-0.2 rounded-md font-normal">
                            You
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-gray-400 truncate max-w-[180px]">
                        {user.about || user.email}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  {!user.isSelf && onOpenChatWithUser && (
                    <button
                      onClick={() => onOpenChatWithUser(user as unknown as User)}
                      className="px-3 py-1.5 bg-[#202c33] hover:bg-[#03cafc] hover:text-[#0b141a] text-xs font-semibold text-[#03cafc] border border-[#03cafc]/30 rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                      title="Send Message"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat</span>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default LikersModal;
