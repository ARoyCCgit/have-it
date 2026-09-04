import type { Request, Response } from "express";
import { Types } from "mongoose";
import TryCatch from "../config/TryCatch.js";
import { Follow } from "../models/Follow.js";
import { User } from "../models/User.js";
import { Notification } from "../models/Notification.js";
import type { AuthenticatedRequest } from "../middlewares/isAuth.js";
import { emitToUser } from "../socket.js";

// 1. Follow User
export const followUser = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user || !req.user._id) {
        return res.status(401).json({ message: "Unauthorized - User required" });
    }

    const { targetUserId } = req.params;
    const currentUserId = new Types.ObjectId(req.user._id);

    if (!Types.ObjectId.isValid(targetUserId as string)) {
        return res.status(400).json({ message: "Invalid target user ID format" });
    }

    if (currentUserId.toString() === targetUserId) {
        return res.status(400).json({ message: "You cannot follow yourself" });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
    }

    const existingFollow = await Follow.findOne({
        follower: currentUserId,
        following: new Types.ObjectId(targetUserId as string),
    });

    if (existingFollow) {
        return res.status(200).json({
            success: true,
            isFollowing: true,
            message: "Already following this user",
        });
    }

    await Follow.create({
        follower: currentUserId,
        following: new Types.ObjectId(targetUserId as string),
        status: "accepted",
    });

    // Create Notification
    const notif = await Notification.create({
        recipient: targetUser._id,
        sender: currentUserId,
        type: "follow",
        text: `${req.user.name || "Someone"} started following you.`,
    });

    // Live Socket dispatch to target user
    emitToUser(targetUserId as string, "new_notification", {
        notification: notif,
        sender: {
            _id: req.user._id,
            name: req.user.name,
            avatar: req.user.avatar,
        },
    });

    emitToUser(targetUserId as string, "follower_count_updated", {
        userId: targetUserId,
        action: "follow",
        followerId: req.user._id,
    });

    res.status(201).json({
        success: true,
        isFollowing: true,
        message: `You are now following ${targetUser.name}! 🎉`,
    });
});

// 2. Unfollow User
export const unfollowUser = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user || !req.user._id) {
        return res.status(401).json({ message: "Unauthorized - User required" });
    }

    const { targetUserId } = req.params;
    const currentUserId = new Types.ObjectId(req.user._id);

    if (!Types.ObjectId.isValid(targetUserId as string)) {
        return res.status(400).json({ message: "Invalid target user ID format" });
    }

    await Follow.findOneAndDelete({
        follower: currentUserId,
        following: new Types.ObjectId(targetUserId as string),
    });

    emitToUser(targetUserId as string, "follower_count_updated", {
        userId: targetUserId,
        action: "unfollow",
        followerId: req.user._id,
    });

    res.status(200).json({
        success: true,
        isFollowing: false,
        message: "Unfollowed successfully",
    });
});

// 3. Get User Followers (With follow-back status relative to current user)
export const getUserFollowers = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.params;
    const currentUserId = req.user?._id ? new Types.ObjectId(req.user._id) : null;

    if (!Types.ObjectId.isValid(userId as string)) {
        return res.status(400).json({ message: "Invalid user ID format" });
    }

    const followDocs = await Follow.find({
        following: new Types.ObjectId(userId as string),
        status: "accepted",
    }).populate("follower", "name email avatar about");

    // Check which of these followers the current user is following
    let myFollowingSet = new Set<string>();
    if (currentUserId) {
        const myFollows = await Follow.find({
            follower: currentUserId,
            status: "accepted",
        }).select("following");
        myFollowingSet = new Set(myFollows.map((f) => f.following.toString()));
    }

    const followers = followDocs
        .filter((f) => f.follower)
        .map((f: any) => ({
            _id: f.follower._id,
            name: f.follower.name,
            email: f.follower.email,
            avatar: f.follower.avatar,
            about: f.follower.about,
            isFollowing: myFollowingSet.has(f.follower._id.toString()),
            isSelf: currentUserId ? f.follower._id.toString() === currentUserId.toString() : false,
        }));

    res.status(200).json({
        success: true,
        followers,
        totalFollowers: followers.length,
    });
});

// 4. Get User Following
export const getUserFollowing = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.params;
    const currentUserId = req.user?._id ? new Types.ObjectId(req.user._id) : null;

    if (!Types.ObjectId.isValid(userId as string)) {
        return res.status(400).json({ message: "Invalid user ID format" });
    }

    const followDocs = await Follow.find({
        follower: new Types.ObjectId(userId as string),
        status: "accepted",
    }).populate("following", "name email avatar about");

    let myFollowingSet = new Set<string>();
    if (currentUserId) {
        const myFollows = await Follow.find({
            follower: currentUserId,
            status: "accepted",
        }).select("following");
        myFollowingSet = new Set(myFollows.map((f) => f.following.toString()));
    }

    const following = followDocs
        .filter((f) => f.following)
        .map((f: any) => ({
            _id: f.following._id,
            name: f.following.name,
            email: f.following.email,
            avatar: f.following.avatar,
            about: f.following.about,
            isFollowing: myFollowingSet.has(f.following._id.toString()),
            isSelf: currentUserId ? f.following._id.toString() === currentUserId.toString() : false,
        }));

    res.status(200).json({
        success: true,
        following,
        totalFollowing: following.length,
    });
});

// 5. Get Suggested Users to Follow
export const getSuggestedUsers = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user || !req.user._id) {
        return res.status(401).json({ message: "Unauthorized - User required" });
    }

    const currentUserId = new Types.ObjectId(req.user._id);

    // Get current following IDs
    const myFollows = await Follow.find({
        follower: currentUserId,
        status: "accepted",
    }).select("following");
    const excludedIds = [currentUserId, ...myFollows.map((f) => f.following)];

    // Find active users not already followed
    const suggestions = await User.find({
        _id: { $nin: excludedIds },
    })
        .limit(10)
        .select("name email avatar about");

    res.status(200).json({
        success: true,
        suggestions,
    });
});
