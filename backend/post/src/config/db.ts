import mongoose from "mongoose";

let isConnecting = false;

export const connectDB = async (): Promise<void> => {
    const url = process.env.MONGO_URI;

    if (!url) {
        console.error("❌ Post Service: MongoDB connection URL (MONGO_URI) not found in environment variables");
        return;
    }

    if (mongoose.connection.readyState === 1) {
        return; // Already connected
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
        console.log("✅ Post Service: MongoDB connected successfully to database: Chatapp");
    } catch (error) {
        console.error("❌ Post Service: Database connection error:", error);
        // Automatically retry after 5 seconds
        setTimeout(() => {
            isConnecting = false;
            connectDB();
        }, 5000);
    } finally {
        isConnecting = false;
    }
};

// Reconnection Event Handlers
mongoose.connection.on("connected", () => {
    console.log("🟢 Post Service: Mongoose connection active");
});

mongoose.connection.on("error", (err) => {
    console.error("🔴 Post Service: Mongoose connection error:", err);
});

mongoose.connection.on("disconnected", () => {
    console.warn("🟡 Post Service: MongoDB disconnected. Re-establishing connection in 5 seconds...");
    setTimeout(connectDB, 5000);
});

export default connectDB;
