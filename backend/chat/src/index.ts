import express from "express";
import http from "http";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import chatRouter from "./router/chat.js";
import cors from "cors";
import { initSocket } from "./socket.js";

dotenv.config();

const app = express();
connectDB();

const port = process.env.PORT || 5002;

app.use(express.json());
app.use(cors({
    origin: true,
    credentials: true,
}));

app.use("/api/v1", chatRouter);

const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

server.listen(port, () => {
    console.log(`Chat Service & Socket.IO server running on port ${port}`);
});