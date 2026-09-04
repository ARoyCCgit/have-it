"use client"

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import Cookies from "js-cookie";
import axios from "axios";
import { post_service, useAppData } from "./Appcontext";

export interface PostSocketNotificationEvent {
  notification: {
    _id: string;
    recipient: string;
    sender: string;
    type: string;
    post?: string;
    comment?: string;
    story?: string;
    text?: string;
    isRead: boolean;
    createdAt: string;
  };
  sender: {
    _id: string;
    name: string;
    avatar?: { url?: string } | string;
  };
}

export interface PostLikesUpdatedEvent {
  postId: string;
  likesCount: number;
}

export interface PostCommentsCountUpdatedEvent {
  postId: string;
  commentsCount: number;
}

export interface NewCommentEvent {
  postId: string;
  comment: any;
  commentsCount: number;
}

export interface CommentDeletedEvent {
  postId: string;
  commentId: string;
  parentCommentId?: string | null;
  commentsCount: number;
}

export interface CommentLikesUpdatedEvent {
  postId: string;
  commentId: string;
  likesCount: number;
}

export interface FollowerCountUpdatedEvent {
  userId: string;
  action: "follow" | "unfollow";
  followerId: string;
}

interface PostSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  unreadNotifsCount: number;
  setUnreadNotifsCount: React.Dispatch<React.SetStateAction<number>>;
  fetchUnreadCount: () => Promise<void>;
  joinPostRoom: (postId: string) => void;
  leavePostRoom: (postId: string) => void;
}

const PostSocketContext = createContext<PostSocketContextType | undefined>(undefined);

export const PostSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isAuth } = useAppData();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuth) return;
    try {
      const token = Cookies.get("token");
      const { data } = await axios.get(`${post_service}/api/v1/posts/notifications/unread-count`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (data.success && typeof data.unreadCount === "number") {
        setUnreadNotifsCount(data.unreadCount);
      }
    } catch {
      // Silently ignore if offline
    }
  }, [isAuth]);

  useEffect(() => {
    if (isAuth) {
      fetchUnreadCount();
    }
  }, [isAuth, fetchUnreadCount]);

  useEffect(() => {
    if (!isAuth || !user?._id) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const token = Cookies.get("token");
    console.log("📸 [PostSocket] Connecting to Post Service socket at:", post_service);

    const socketInstance = io(post_service, {
      auth: {
        token: token,
      },
      query: {
        userId: user._id.toString(),
      },
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
    });

    socketInstance.on("connect", () => {
      console.log("🟢 [PostSocket] Connected successfully! ID:", socketInstance.id);
      setIsConnected(true);
      if (user?._id) {
        socketInstance.emit("setup", user._id.toString());
      }
    });

    socketInstance.on("connect_error", (err) => {
      console.error("🔴 [PostSocket] Connection error:", err.message);
    });

    // 1. Real-Time Notification Received
    socketInstance.on("new_notification", (payload: PostSocketNotificationEvent) => {
      console.log("🔔 [PostSocket] New notification received:", payload);
      setUnreadNotifsCount((prev) => prev + 1);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("haveit_new_notification", { detail: payload })
        );
      }
    });

    // 2. Real-Time Likes Count Updated
    socketInstance.on("post_likes_updated", (payload: PostLikesUpdatedEvent) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("haveit_post_likes_updated", { detail: payload })
        );
      }
    });

    // 3. Real-Time Comments Count Updated
    socketInstance.on("post_comments_count_updated", (payload: PostCommentsCountUpdatedEvent) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("haveit_post_comments_count_updated", { detail: payload })
        );
      }
    });

    // 4. Real-Time Post Deleted
    socketInstance.on("post_deleted", (payload: { postId: string }) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("haveit_post_deleted", { detail: payload })
        );
      }
    });

    // 5. Real-Time New Comment Added in Post Room
    socketInstance.on("new_comment", (payload: NewCommentEvent) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("haveit_new_comment", { detail: payload })
        );
      }
    });

    // 6. Real-Time Comment Deleted in Post Room
    socketInstance.on("comment_deleted", (payload: CommentDeletedEvent) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("haveit_comment_deleted", { detail: payload })
        );
      }
    });

    // 7. Real-Time Comment Likes Updated
    socketInstance.on("comment_likes_updated", (payload: CommentLikesUpdatedEvent) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("haveit_comment_likes_updated", { detail: payload })
        );
      }
    });

    // 8. Real-Time Follower Count Updated
    socketInstance.on("follower_count_updated", (payload: FollowerCountUpdatedEvent) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("haveit_follower_count_updated", { detail: payload })
        );
      }
    });

    socketInstance.on("disconnect", (reason) => {
      console.log("🟡 [PostSocket] Disconnected:", reason);
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      console.log("🧹 [PostSocket] Cleaning up socket connection...");
      socketInstance.disconnect();
    };
  }, [isAuth, user?._id, fetchUnreadCount]);

  const joinPostRoom = useCallback(
    (postId: string) => {
      if (!socket || !postId) return;
      socket.emit("join_post_room", postId.toString());
    },
    [socket]
  );

  const leavePostRoom = useCallback(
    (postId: string) => {
      if (!socket || !postId) return;
      socket.emit("leave_post_room", postId.toString());
    },
    [socket]
  );

  return (
    <PostSocketContext.Provider
      value={{
        socket,
        isConnected,
        unreadNotifsCount,
        setUnreadNotifsCount,
        fetchUnreadCount,
        joinPostRoom,
        leavePostRoom,
      }}
    >
      {children}
    </PostSocketContext.Provider>
  );
};

export const usePostSocket = (): PostSocketContextType => {
  const context = useContext(PostSocketContext);
  if (!context) {
    throw new Error("usePostSocket must be used within a PostSocketProvider");
  }
  return context;
};

export default PostSocketContext;
