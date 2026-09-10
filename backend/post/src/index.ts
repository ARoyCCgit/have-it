import express from "express";
import http from "http";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import connectDB from "./config/db.js";
import { connectRedis, getRedisStatus } from "./config/redis.js";
import { initPostSocket } from "./socket.js";
import { ensureDatabaseConnected } from "./middlewares/dbCheck.js";
import postRouter from "./router/post.js";
import storyRouter from "./router/story.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5003;

// Initialize Database & Redis connections
connectDB();
connectRedis();

// Global Middlewares
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(
    cors({
        origin: true,
        credentials: true,
    })
);

// Health check root endpoint with real-time diagnostics
app.get("/", (req, res) => {
    const readyState = mongoose.connection.readyState;
    const states: { [key: number]: string } = {
        0: "disconnected",
        1: "connected",
        2: "connecting",
        3: "disconnecting",
    };
    res.status(200).json({
        message: "Have-it Posts & Social Hub Microservice is running",
        port,
        version: "1.0.0",
        database: states[readyState] || "unknown",
        mongoUriConfigured: Boolean(process.env.MONGO_URI),
        redisConnected: getRedisStatus(),
    });
});

// Mount Routes with automatic DB connection guard
app.use("/api/v1/posts", ensureDatabaseConnected, postRouter);
app.use("/api/v1/stories", ensureDatabaseConnected, storyRouter);

// Initialize HTTP & Socket.IO server
const server = http.createServer(app);
initPostSocket(server);

server.listen(port, () => {
    console.log(`🚀 Have-it Post Service & Socket.IO server running on port: ${port}`);
});

export default app;
