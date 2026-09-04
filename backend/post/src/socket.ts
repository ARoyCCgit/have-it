import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt, { type JwtPayload } from "jsonwebtoken";

let io: Server | null = null;

// Map to track userId -> Set of socket IDs (for real-time multi-device sync)
const userSocketMap = new Map<string, Set<string>>();

export const getIO = (): Server => {
    if (!io) {
        throw new Error("Socket.IO is not initialized in Post Service!");
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

export const initPostSocket = (httpServer: HttpServer): Server => {
    io = new Server(httpServer, {
        cors: {
            origin: (origin, callback) => {
                // Allow all client origins with credentials
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
                    // Optional token warning
                }
            }
            next();
        } catch (error) {
            next();
        }
    });

    io.on("connection", (socket: Socket) => {
        let userId = socket.data?.user?._id?.toString() || (socket.handshake.query?.userId as string);

        const registerUser = (id: string) => {
            if (!id) return;
            userId = id;
            if (!userSocketMap.has(id)) {
                userSocketMap.set(id, new Set<string>());
            }
            userSocketMap.get(id)!.add(socket.id);
            socket.join(`user:${id}`);
        };

        if (userId) {
            registerUser(userId);
        }

        // Explicit setup handler matching client behavior
        socket.on("setup", (id: string) => {
            if (id) {
                registerUser(id.toString());
            }
        });

        // Room joining for real-time post comment stream
        socket.on("join_post_room", (postId: string) => {
            if (postId) {
                socket.join(`post:${postId}`);
            }
        });

        socket.on("leave_post_room", (postId: string) => {
            if (postId) {
                socket.leave(`post:${postId}`);
            }
        });

        socket.on("disconnect", () => {
            if (userId && userSocketMap.has(userId)) {
                const userSockets = userSocketMap.get(userId)!;
                userSockets.delete(socket.id);
                if (userSockets.size === 0) {
                    userSocketMap.delete(userId);
                }
            }
        });
    });

    return io;
};

export const emitToUser = (userId: string, event: string, data: any) => {
    if (!io) return;
    io.to(`user:${userId}`).emit(event, data);
};

export const emitToPostRoom = (postId: string, event: string, data: any) => {
    if (!io) return;
    io.to(`post:${postId}`).emit(event, data);
};

export const broadcastGlobal = (event: string, data: any) => {
    if (!io) return;
    io.emit(event, data);
};
