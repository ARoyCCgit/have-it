import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { Messages } from "./models/Messages.js";

let io: Server | null = null;

// Map to track user -> Set of socket IDs (to support multiple tabs/devices)
const userSocketMap = new Map<string, Set<string>>();

export const getIO = (): Server => {
  if (!io) {
    throw new Error("Socket.io is not initialized!");
  }
  return io;
};

export const getReceiverSocketIds = (userId: string): string[] => {
  const sockets = userSocketMap.get(userId.toString());
  return sockets ? Array.from(sockets) : [];
};

export const isUserOnline = (userId: string): boolean => {
  const sockets = userSocketMap.get(userId.toString());
  return !!sockets && sockets.size > 0;
};

export const initSocket = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow all local & client origins with credentials
        callback(null, true);
      },
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Socket Authentication Middleware
  io.use((socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(" ")[1] ||
        (socket.handshake.query?.token as string);

      if (token && process.env.JWT_TOKEN) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_TOKEN) as JwtPayload;
          if (decoded && decoded.user) {
            socket.data.user = decoded.user;
          }
        } catch (err) {
          console.log("Socket token verification optional warning:", err);
        }
      }
      next();
    } catch (error) {
      next(new Error("Socket authentication error"));
    }
  });

  io.on("connection", (socket: Socket) => {
    let currentUserId: string | null = socket.data?.user?._id?.toString() || null;
    console.log(`🔌 New socket connection established: ${socket.id}`);

    // If user was authenticated via JWT handshake, auto-register them
    if (currentUserId) {
      registerUser(socket, currentUserId);
    }

    function registerUser(sock: Socket, uid: string) {
      currentUserId = uid.toString();
      sock.join(`user:${currentUserId}`);

      if (!userSocketMap.has(currentUserId)) {
        userSocketMap.set(currentUserId, new Set());
      }
      userSocketMap.get(currentUserId)!.add(sock.id);

      // Collect all active online user IDs
      const onlineUserIds = Array.from(userSocketMap.keys()).filter(
        (id) => (userSocketMap.get(id)?.size ?? 0) > 0
      );

      // Broadcast to all connected clients
      io?.emit("get_online_users", onlineUserIds);
      io?.emit("user_status_change", {
        userId: currentUserId,
        status: "online",
      });

      // Send to this socket directly
      sock.emit("get_online_users", onlineUserIds);
      sock.emit("connected");
      console.log(`✅ User ${currentUserId} registered on socket ${sock.id}. Online users count: ${onlineUserIds.length}`);
    }

    // Handle explicit setup / registration from client
    socket.on("setup", (userId: string) => {
      if (!userId) return;
      registerUser(socket, userId);
    });

    // Join specific Chat Room
    socket.on("join_chat", (chatId: string) => {
      if (!chatId) return;
      const room = chatId.toString();
      socket.join(room);
      console.log(`🚪 Socket ${socket.id} (User: ${currentUserId}) joined room: ${room}`);
    });

    // Leave Chat Room
    socket.on("leave_chat", (chatId: string) => {
      if (!chatId) return;
      const room = chatId.toString();
      socket.leave(room);
      console.log(`🚪 Socket ${socket.id} left room: ${room}`);
    });

    // Typing Indicators
    socket.on("typing", ({ chatId, userId }: { chatId: string; userId: string }) => {
      if (!chatId) return;
      socket.to(chatId.toString()).emit("typing", { chatId, userId });
    });

    socket.on("stop_typing", ({ chatId, userId }: { chatId: string; userId: string }) => {
      if (!chatId) return;
      socket.to(chatId.toString()).emit("stop_typing", { chatId, userId });
    });

    // Real-Time Message Seen / Read Receipt
    socket.on("mark_as_seen", async ({ chatId, userId }: { chatId: string; userId: string }) => {
      if (!chatId || !userId) return;

      try {
        await Messages.updateMany(
          {
            chatId,
            sender: { $ne: userId },
            seen: false,
          },
          {
            seen: true,
            seenAt: new Date(),
          }
        );

        const seenAt = new Date();
        socket.to(chatId.toString()).emit("messages_seen_update", {
          chatId,
          seenBy: userId,
          seenAt,
        });
      } catch (error) {
        console.error("Error marking messages as seen in socket:", error);
      }
    });

    // WebRTC Real-Time Audio & Video Call Signaling Gateway
    socket.on("call_user", ({
      userToCall,
      from,
      name,
      avatar,
      isVideo,
      signalData,
    }: {
      userToCall: string;
      from: string;
      name: string;
      avatar?: string;
      isVideo: boolean;
      signalData: any;
    }) => {
      if (!userToCall) return;
      const senderId = from || currentUserId || socket.data?.user?._id?.toString();
      console.log(`📞 Call initiated from ${senderId} (${name}) to user ${userToCall}. Video: ${isVideo}`);
      io?.to(`user:${userToCall.toString()}`).emit("call_incoming", {
        from: senderId,
        name,
        avatar,
        isVideo,
        signalData,
        fromSocketId: socket.id,
      });
    });

    socket.on("call_accepted", ({ to, signal, from }: { to: string; signal: any; from?: string }) => {
      if (!to) return;
      const senderId = from || currentUserId || socket.data?.user?._id?.toString();
      console.log(`✅ Call accepted by user ${senderId} for user ${to}`);
      io?.to(`user:${to.toString()}`).emit("call_accepted", {
        signal,
        from: senderId,
      });
    });

    socket.on("call_rejected", ({ to, reason, from }: { to: string; reason?: string; from?: string }) => {
      if (!to) return;
      const senderId = from || currentUserId || socket.data?.user?._id?.toString();
      console.log(`🚫 Call rejected by user ${senderId} to user ${to}`);
      io?.to(`user:${to.toString()}`).emit("call_rejected", {
        from: senderId,
        reason: reason || "Call declined",
      });
    });

    socket.on("ice_candidate", ({ to, candidate, from }: { to: string; candidate: any; from?: string }) => {
      if (!to || !candidate) return;
      const senderId = from || currentUserId || socket.data?.user?._id?.toString();
      io?.to(`user:${to.toString()}`).emit("ice_candidate", {
        candidate,
        from: senderId,
      });
    });

    socket.on("end_call", ({ to, from }: { to: string; from?: string }) => {
      if (!to) return;
      const senderId = from || currentUserId || socket.data?.user?._id?.toString();
      console.log(`📴 Call ended by user ${senderId} with user ${to}`);
      io?.to(`user:${to.toString()}`).emit("call_ended", {
        from: senderId,
      });
    });

    // Disconnect Handler
    socket.on("disconnect", (reason) => {
      if (currentUserId && userSocketMap.has(currentUserId)) {
        const userSockets = userSocketMap.get(currentUserId)!;
        userSockets.delete(socket.id);

        if (userSockets.size === 0) {
          userSocketMap.delete(currentUserId);
          const onlineUserIds = Array.from(userSocketMap.keys());
          io?.emit("get_online_users", onlineUserIds);
          io?.emit("user_status_change", {
            userId: currentUserId,
            status: "offline",
            lastSeen: new Date(),
          });
        }
      }
      console.log(`❌ Socket disconnected: ${socket.id} (Reason: ${reason})`);
    });
  });

  return io;
};
