import express from "express";
import http from "http";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import { connectRedis } from "./config/redis.js";
import { initPostSocket } from "./socket.js";
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

// Health check root endpoint
app.get("/", (req, res) => {
    res.status(200).json({
        message: "Have-it Posts & Social Hub Microservice is running",
        port,
        version: "1.0.0",
    });
});

// Mount Routes
app.use("/api/v1/posts", postRouter);
app.use("/api/v1/stories", storyRouter);

// Initialize HTTP & Socket.IO server
const server = http.createServer(app);
initPostSocket(server);

server.listen(port, () => {
    console.log(`🚀 Have-it Post Service & Socket.IO server running on port: ${port}`);
});

export default app;
