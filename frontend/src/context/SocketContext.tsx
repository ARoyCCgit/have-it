"use client"

import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import Cookies from "js-cookie";
import { chat_service, useAppData } from "./Appcontext";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: string[];
  isOnline: (userId?: string) => boolean;
  typingMap: { [chatId: string]: string[] };
  emitTyping: (chatId: string) => void;
  emitStopTyping: (chatId: string) => void;
  markMessagesAsSeen: (chatId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { user, isAuth } = useAppData();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingMap, setTypingMap] = useState<{ [chatId: string]: string[] }>({});
  const typingTimeoutRef = useRef<{ [chatId: string]: NodeJS.Timeout }>({});

  useEffect(() => {
    if (!isAuth || !user?._id) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
        setOnlineUsers([]);
      }
      return;
    }

    const token = Cookies.get("token");
    console.log("🔌 Initializing socket connection for user:", user._id);

    const socketInstance = io(chat_service, {
      auth: {
        token: token,
      },
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
    });

    socketInstance.on("connect", () => {
      console.log("🟢 Socket connected successfully! ID:", socketInstance.id);
      setIsConnected(true);
      if (user?._id) {
        socketInstance.emit("setup", user._id.toString());
      }
    });

    socketInstance.on("connect_error", (err) => {
      console.error("🔴 Socket connect_error:", err.message);
    });

    socketInstance.on("get_online_users", (users: string[]) => {
      console.log("👥 Active online users list:", users);
      setOnlineUsers(users ? users.map((u) => u.toString()) : []);
    });

    socketInstance.on("user_status_change", ({ userId, status }: { userId: string; status: string }) => {
      console.log("⚡ User status change:", userId, "->", status);
      const uid = userId?.toString();
      setOnlineUsers((prev) => {
        if (status === "online") {
          return prev.includes(uid) ? prev : [...prev, uid];
        } else {
          return prev.filter((id) => id !== uid);
        }
      });
    });

    // Handle incoming typing indicators
    socketInstance.on("typing", ({ chatId, userId }: { chatId: string; userId: string }) => {
      const cId = chatId?.toString();
      const uId = userId?.toString();
      if (!cId || !uId) return;

      setTypingMap((prev) => {
        const currentList = prev[cId] || [];
        if (!currentList.includes(uId)) {
          return { ...prev, [cId]: [...currentList, uId] };
        }
        return prev;
      });
    });

    socketInstance.on("stop_typing", ({ chatId, userId }: { chatId: string; userId: string }) => {
      const cId = chatId?.toString();
      const uId = userId?.toString();
      if (!cId || !uId) return;

      setTypingMap((prev) => {
        const currentList = prev[cId] || [];
        return { ...prev, [cId]: currentList.filter((id) => id !== uId) };
      });
    });

    socketInstance.on("disconnect", (reason) => {
      console.log("🟡 Socket disconnected:", reason);
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      console.log("🧹 Cleaning up socket connection...");
      socketInstance.disconnect();
    };
  }, [isAuth, user?._id]);

  const isOnline = (userId?: string): boolean => {
    if (!userId) return false;
    const targetId = userId.toString();
    return onlineUsers.some((id) => id?.toString() === targetId);
  };

  const emitTyping = (chatId: string) => {
    if (!socket || !user?._id || !chatId) return;

    socket.emit("typing", { chatId: chatId.toString(), userId: user._id.toString() });

    // Auto clear typing state after 3 seconds of inactivity
    if (typingTimeoutRef.current[chatId]) {
      clearTimeout(typingTimeoutRef.current[chatId]);
    }

    typingTimeoutRef.current[chatId] = setTimeout(() => {
      emitStopTyping(chatId);
    }, 3000);
  };

  const emitStopTyping = (chatId: string) => {
    if (!socket || !user?._id || !chatId) return;
    if (typingTimeoutRef.current[chatId]) {
      clearTimeout(typingTimeoutRef.current[chatId]);
      delete typingTimeoutRef.current[chatId];
    }
    socket.emit("stop_typing", { chatId: chatId.toString(), userId: user._id.toString() });
  };

  const markMessagesAsSeen = (chatId: string) => {
    if (!socket || !user?._id || !chatId) return;
    socket.emit("mark_as_seen", { chatId: chatId.toString(), userId: user._id.toString() });
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onlineUsers,
        isOnline,
        typingMap,
        emitTyping,
        emitStopTyping,
        markMessagesAsSeen,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
