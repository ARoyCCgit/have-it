import mongoose from "mongoose";

let isConnecting = false;

const connectDB = async (): Promise<void> => {
    const url = process.env.MONGO_URI;

    if (!url) {
        console.error("❌ Chat Service: MONGO_URI not found in environment variables");
        return;
    }

    if (mongoose.connection.readyState === 1) {
        return;
    }

    if (isConnecting) {
        return;
    }

    isConnecting = true;

    try {
        await mongoose.connect(url, {
            dbName: "Chatapp",
            serverSelectionTimeoutMS: 15000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10,
            minPoolSize: 1,
            retryWrites: true,
        });
        console.log("✅ Chat Service: MongoDB connected successfully to database: Chatapp");
    } catch (error) {
        console.error("❌ Chat Service: Database connection error:", error);
        setTimeout(() => {
            isConnecting = false;
            connectDB();
        }, 5000);
    } finally {
        isConnecting = false;
    }
};

mongoose.connection.on("connected", () => {
    console.log("🟢 Chat Service: Mongoose connection active");
});

mongoose.connection.on("error", (err) => {
    console.error("🔴 Chat Service: Mongoose connection error:", err);
});

mongoose.connection.on("disconnected", () => {
    console.warn("🟡 Chat Service: MongoDB disconnected. Re-establishing connection in 5 seconds...");
    setTimeout(connectDB, 5000);
});

export default connectDB;