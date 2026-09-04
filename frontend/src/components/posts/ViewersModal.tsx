"use client"

import React, { useEffect, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { X, Eye, Clock, MessageSquare, Loader2, User as UserIcon } from "lucide-react";
import { post_service, User } from "@/context/Appcontext";
import toast from "react-hot-toast";

interface ViewerItem {
  _id: string;
  name: string;
  email: string;
  avatar?: { url?: string } | string;
  about?: string;
  viewedAt: string;
  isFollowing?: boolean;
}

interface ViewersModalProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  onOpenChatWithUser?: (user: User) => void;
}

const formatViewerTime = (isoString: string) => {
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

export const ViewersModal: React.FC<ViewersModalProps> = ({
  postId,
  isOpen,
  onClose,
  onOpenChatWithUser,
}) => {
  const [viewers, setViewers] = useState<ViewerItem[]>([]);
  const [totalViews, setTotalViews] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !postId) return;

    const fetchViewers = async () => {
      setLoading(true);
      try {
        const token = Cookies.get("token");
        const { data } = await axios.get(`${post_service}/api/v1/posts/${postId}/viewers`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (data.success) {
          setViewers(data.viewers || []);
          setTotalViews(data.viewsCount || 0);
        }
      } catch (err: unknown) {
        console.error("Failed to load post viewers:", err);
        toast.error("Only the creator of this post can inspect viewers");
        onClose();
      } finally {
        setLoading(false);
      }
    };

    fetchViewers();
  }, [isOpen, postId, onClose]);

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
            <div className="w-8 h-8 rounded-full bg-[#03cafc]/10 flex items-center justify-center text-[#03cafc]">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Post Viewers</h3>
              <p className="text-xs text-gray-400">
                {totalViews} {totalViews === 1 ? "view" : "views"} recorded
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

        {/* Viewers List Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-gray-800/40">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-[#03cafc]" />
              <span className="text-xs">Loading viewers audit...</span>
            </div>
          ) : viewers.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Eye className="w-10 h-10 mx-auto text-gray-600 mb-2 stroke-1" />
              <p className="text-sm font-semibold text-gray-300">No viewers yet</p>
              <p className="text-xs text-gray-500 mt-0.5">Views from users will appear here live</p>
            </div>
          ) : (
            viewers.map((viewer) => {
              const avatarUrl =
                typeof viewer.avatar === "string" ? viewer.avatar : viewer.avatar?.url || "";

              return (
                <div
                  key={viewer._id + viewer.viewedAt}
                  className="flex items-center justify-between pt-2 pb-1 px-2 hover:bg-[#202c33]/40 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700/60 overflow-hidden flex items-center justify-center shrink-0">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={viewer.name} className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-white truncate">
                        {viewer.name}
                      </h4>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-[#03cafc]" />
                        <span>{formatViewerTime(viewer.viewedAt)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  {onOpenChatWithUser && (
                    <button
                      onClick={() => onOpenChatWithUser(viewer as unknown as User)}
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

export default ViewersModal;
