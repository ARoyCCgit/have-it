import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redisClient = createClient({
    url: redisUrl,
    socket: {
        reconnectStrategy: (retries) => {
            // Stop retrying during local development if Redis is not present
            if (retries >= 1) {
                return false;
            }
            return 200;
        },
    },
});

let isRedisConnected = false;
let hasLoggedOfflineNotice = false;

redisClient.on("connect", () => {
    isRedisConnected = true;
    console.log("⚡ Post Service: Redis connected successfully (Caching enabled)");
});

redisClient.on("error", () => {
    isRedisConnected = false;
    if (!hasLoggedOfflineNotice) {
        console.log("ℹ️  Post Service: Redis offline — operating smoothly in MongoDB Direct Mode");
        hasLoggedOfflineNotice = true;
    }
});

export const connectRedis = async () => {
    try {
        await redisClient.connect();
    } catch {
        // Silently caught — Redis fallback active
    }
};

export const getRedisStatus = () => isRedisConnected;
