import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import { createClient } from "redis";
import userRoutes from "./routes/user.js";
import { connectRabbitMQ } from "./config/rabbitmq.js";
import cors from "cors"

dotenv.config();
const app = express();

connectDB();

connectRabbitMQ();

export const redisClient = createClient({
    url: process.env.REDIS_URL as string,
});

redisClient
    .connect()
    .then(()=>console.log("radis connected"))
    .catch(console.error);

app.use(express.json());
app.use(cors());

app.use("/api/v1",userRoutes);

const port = process.env.PORT;

app.listen(port, ()=>{
    console.log(`Server running at port: ${port}`);    
});