import type { Request, Response } from "express";
import { Types } from "mongoose";
import TryCatch from "../config/TryCatch.js";
import { Notification } from "../models/Notification.js";
import type { AuthenticatedRequest } from "../middlewares/isAuth.js";

// 1. Get Activity Notifications Stream
export const getNotifications = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user || !req.user._id) {
        return res.status(401).json({ message: "Unauthorized - User required" });
    }

    const currentUserId = new Types.ObjectId(req.user._id);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ recipient: currentUserId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("sender", "name email avatar about")
        .populate("post", "media caption type")
        .populate("story", "media");

    const total = await Notification.countDocuments({ recipient: currentUserId });
    const unreadCount = await Notification.countDocuments({
        recipient: currentUserId,
        isRead: false,
    });

    res.status(200).json({
        success: true,
        notifications,
        unreadCount,
        hasMore: skip + notifications.length < total,
    });
});

// 2. Mark All or Specific Notifications as Read
export const markNotificationsAsRead = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user || !req.user._id) {
        return res.status(401).json({ message: "Unauthorized - User required" });
    }

    const currentUserId = new Types.ObjectId(req.user._id);
    const { notificationId } = req.body;

    if (notificationId && Types.ObjectId.isValid(notificationId)) {
        await Notification.findOneAndUpdate(
            { _id: new Types.ObjectId(notificationId), recipient: currentUserId },
            { isRead: true }
        );
    } else {
        await Notification.updateMany(
            { recipient: currentUserId, isRead: false },
            { isRead: true }
        );
    }

    res.status(200).json({
        success: true,
        message: "Notifications marked as read",
    });
});

// 3. Get Unread Count
export const getUnreadNotificationsCount = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user || !req.user._id) {
        return res.status(401).json({ message: "Unauthorized - User required" });
    }

    const currentUserId = new Types.ObjectId(req.user._id);
    const unreadCount = await Notification.countDocuments({
        recipient: currentUserId,
        isRead: false,
    });

    res.status(200).json({
        success: true,
        unreadCount,
    });
});
