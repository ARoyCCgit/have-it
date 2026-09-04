import mongoose from "mongoose";

const connectDB = async () => {
    const url = process.env.MONGO_URI;

    if (!url) {
        throw new Error("MongoDB connection URL (MONGO_URI) not found in environment variables");
    }

    try {
        await mongoose.connect(url, {
            dbName: "Chatapp",
        });
        console.log("Post Service: MongoDB connected successfully");
    } catch (error) {
        console.error("Post Service: Database connection error:", error);
    }
};

export default connectDB;
