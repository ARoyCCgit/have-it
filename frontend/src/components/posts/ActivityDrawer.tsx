"use client"

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import {
  X,
  Heart,
  MessageCircle,
  UserPlus,
  Sparkles,
  Loader2,
  CheckCheck,
  Bell,
  User as UserIcon,
} from "lucide-react";
import { post_service } from "@/context/Appcontext";
import { usePostSocket, PostSocketNotificationEvent } from "@/context/PostSocketContext";
import toast from "react-hot-toast";

interface NotificationItem {
  _id: string;
  sender: {
    _id: string;
    name: string;
    email: string;
    avatar?: { url?: string } | string;
  };
  type: "like_post" | "like_comment" | "comment" | "reply" | "follow" | "mention" | "story_reaction";
  post?: {
    _id: string;
    media: Array<{ url: string; type: string }>;
    caption?: string;
  };
  story?: {
    _id: string;
    media: { url: string; type: string };
  };
  text?: string;
  isRead: boolean;
  createdAt: string;
}

interface ActivityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPost?: (postId: string) => void;
}

const formatNotificationTime = (isoString: string) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return `${Math.floor(diffHours / 24)}d`;
};

export const ActivityDrawer: React.FC<ActivityDrawerProps> = ({
  isOpen,
  onClose,
  onSelectPost,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const { setUnreadNotifsCount } = usePostSocket();

  const fetchNotifications = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const token = Cookies.get("token");
      const { data } = await axios.get(`${post_service}/api/v1/posts/notifications/stream`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (data.success) {
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Live incoming notification listener
  useEffect(() => {
    const handleNewNotification = (e: Event) => {
      const customEvent = e as CustomEvent<PostSocketNotificationEvent>;
      const { notification, sender } = customEvent.detail;
      if (!notification) return;

      const formattedNotif: NotificationItem = {
        _id: notification._id,
        sender: {
          _id: sender._id,
          name: sender.name,
          email: "",
          avatar: sender.avatar,
        },
        type: notification.type as any,
        post: notification.post ? ({ _id: notification.post, media: [] } as any) : undefined,
        story: notification.story ? ({ _id: notification.story, media: { url: "", type: "" } } as any) : undefined,
        text: notification.text,
        isRead: false,
        createdAt: notification.createdAt || new Date().toISOString(),
      };

      setNotifications((prev) => [formattedNotif, ...prev]);
    };

    window.addEventListener("haveit_new_notification", handleNewNotification);
    return () => {
      window.removeEventListener("haveit_new_notification", handleNewNotification);
    };
  }, []);

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      const token = Cookies.get("token");
      await axios.put(
        `${post_service}/api/v1/posts/notifications/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadNotifsCount(0);
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to update notifications");
    }
  };

  if (!isOpen) return null;

  const renderIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "like_post":
      case "like_comment":
        return <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />;
      case "comment":
      case "reply":
        return <MessageCircle className="w-3.5 h-3.5 text-[#03cafc]" />;
      case "follow":
        return <UserPlus className="w-3.5 h-3.5 text-emerald-400" />;
      case "mention":
      case "story_reaction":
        return <Sparkles className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-[#03cafc]" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full sm:max-w-md bg-[#111b21] border border-gray-800 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh] max-h-[700px] animate-in slide-in-from-right sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-[#202c33] border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#03cafc]" />
            <h3 className="text-base font-bold text-white tracking-tight">Activity</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllRead}
              className="p-1.5 text-xs text-gray-400 hover:text-[#03cafc] flex items-center gap-1 transition-colors cursor-pointer"
              title="Mark all as read"
            >
              <CheckCheck className="w-4 h-4" />
              <span className="hidden xs:inline">Mark read</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications Stream */}
        <div className="flex-1 overflow-y-auto p-3 divide-y divide-gray-800/40">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-xs text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin text-[#03cafc]" />
              <span>Loading activity...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-20 text-center text-gray-400 space-y-2">
              <Bell className="w-10 h-10 text-gray-600 mx-auto" />
              <p className="text-xs font-semibold text-white">No activity yet</p>
              <p className="text-[11px] text-gray-400">When people interact with your posts or follow you, you&apos;ll see it here.</p>
            </div>
          ) : (
            notifications.map((notif) => {
              const senderAvatar =
                typeof notif.sender?.avatar === "string"
                  ? notif.sender.avatar
                  : notif.sender?.avatar?.url || "";

              const postThumbnail = notif.post?.media?.[0]?.url || notif.story?.media?.url;

              return (
                <div
                  key={notif._id}
                  onClick={() => {
                    if (notif.post?._id && onSelectPost) {
                      onSelectPost(notif.post._id);
                    }
                  }}
                  className={`py-3 px-2 rounded-xl flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                    notif.isRead ? "hover:bg-[#202c33]/40" : "bg-[#202c33]/70 hover:bg-[#202c33]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden flex items-center justify-center border border-gray-700/60">
                        {senderAvatar ? (
                          <img src={senderAvatar} alt="Sender" className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#111b21] flex items-center justify-center shadow-md">
                        {renderIcon(notif.type)}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs text-gray-200 leading-snug">
                        <span className="font-bold text-white mr-1">{notif.sender?.name}</span>
                        <span>{notif.text}</span>
                      </p>
                      <span className="text-[10px] text-gray-500 mt-0.5 block">
                        {formatNotificationTime(notif.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Post / Story Thumbnail Preview */}
                  {postThumbnail && (
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-black shrink-0 border border-gray-800">
                      <img src={postThumbnail} alt="Thumbnail" className="w-full h-full object-cover" />
                    </div>
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

export default ActivityDrawer;
