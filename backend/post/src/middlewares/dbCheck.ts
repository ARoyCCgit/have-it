import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";

const isDbConnected = (): boolean => {
    return (mongoose.connection.readyState as number) === 1;
};

/**
 * Ensures MongoDB is connected before running Mongoose queries.
 * Prevents "buffering timed out after 10000ms" crashes by awaiting connection or gracefully handling cold starts.
 */
export const ensureDatabaseConnected = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    if (isDbConnected()) {
        return next();
    }

    console.warn(`⚠️ Post Service: Request to ${req.method} ${req.originalUrl || req.path} received while MongoDB readyState is ${mongoose.connection.readyState}. Attempting connection...`);
    connectDB();

    // Wait up to 3.5 seconds for connection during Render spin-up
    let waited = 0;
    while (!isDbConnected() && waited < 3500) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        waited += 250;
    }

    if (isDbConnected()) {
        return next();
    }

    res.status(503).json({
        message: "Database service is warming up or temporarily unreachable. Please retry in a few seconds.",
        databaseStatus: mongoose.connection.readyState === 2 ? "connecting" : "disconnected",
        mongoUriConfigured: Boolean(process.env.MONGO_URI),
    });
};
