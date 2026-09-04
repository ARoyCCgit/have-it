import type { Request, Response } from "express";
import { Types } from "mongoose";
import axios from "axios";
import TryCatch from "../config/TryCatch.js";
import cloudinary from "../config/cloudinary.js";
import { Story, type IStoryMedia } from "../models/Story.js";
import { Follow } from "../models/Follow.js";
import { Notification } from "../models/Notification.js";
import type { AuthenticatedRequest } from "../middlewares/isAuth.js";
import { emitToUser } from "../socket.js";

// Helper: Get Chat Service URL
const getChatServiceUrl = () => {
    const raw = (process.env.CHAT_SERVICE || "http://localhost:5002").trim();
    return raw.replace(/\/+$/, "");
};

// 1. Create New 24-Hour Ephemeral Story
export const createStory = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user || !req.user._id) {
        return res.status(401).json({ message: "Unauthorized - User required" });
    }

    const { caption, duration } = req.body;
    const file = req.file as Express.Multer.File | undefined;

    if (!file && !req.body.mediaUrl) {
        return res.status(400).json({ message: "Please upload an image or video for your story" });
    }

    const isVideo =
        file?.mimetype.startsWith("video/") ||
        file?.mimetype.includes("mp4") ||
        file?.mimetype.includes("webm");

    let thumbnailUrl: string | undefined = undefined;
    if (isVideo && file?.path) {
        thumbnailUrl = file.path.replace(/\.[^/.]+$/, ".jpg");
    }

    const media: IStoryMedia = {
        url: file ? file.path : req.body.mediaUrl,
        public_id: file ? file.filename || file.path : req.body.public_id || "story_media",
        type: isVideo ? "video" : "image",
        thumbnailUrl,
        duration: duration ? parseInt(duration) : isVideo ? 15 : 5,
    };

    // Calculate exact 24-hour expiration time
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const story = await Story.create({
        author: new Types.ObjectId(req.user._id),
        media,
        caption: caption ? String(caption).trim() : "",
        viewers: [],
        viewsCount: 0,
        expiresAt,
    });

    const populatedStory = await Story.findById(story._id).populate("author", "name email avatar about");

    res.status(201).json({
        success: true,
        message: "Story published for 24 hours! 🌟",
        story: populatedStory,
    });
});

// 2. Get Stories Feed (Grouped by followed users + self with seen/unseen indicators)
export const getStoriesFeed = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user || !req.user._id) {
        return res.status(401).json({ message: "Unauthorized - User required" });
    }

    const currentUserId = new Types.ObjectId(req.user._id);

    // 1. Get list of users followed by current user
    const follows = await Follow.find({
        follower: currentUserId,
        status: "accepted",
    }).select("following");

    const followingIds = follows.map((f) => f.following);
    const allTargetUserIds = [currentUserId, ...followingIds];

    // 2. Query active stories: followed users first, fallback to all active stories if no follows
    const now = new Date();
    const queryFilter =
        followingIds.length > 0
            ? { author: { $in: allTargetUserIds }, expiresAt: { $gt: now } }
            : { expiresAt: { $gt: now } };

    const activeStories = await Story.find(queryFilter)
        .sort({ createdAt: 1 })
        .populate("author", "name email avatar about");

    // 3. Group stories by user author
    const userStoriesMap = new Map<string, {
        author: any;
        stories: any[];
        hasUnseen: boolean;
        isSelf: boolean;
        latestStoryTime: Date;
    }>();

    for (const story of activeStories) {
        const authorObj = (story.author as any);
        if (!authorObj) continue;

        const authorIdStr = authorObj._id.toString();
        const isSelf = authorIdStr === currentUserId.toString();
        const hasViewedThis = story.viewers.some((v) => v.user.toString() === currentUserId.toString());

        if (!userStoriesMap.has(authorIdStr)) {
            userStoriesMap.set(authorIdStr, {
                author: authorObj,
                stories: [],
                hasUnseen: false,
                isSelf,
                latestStoryTime: story.createdAt,
            });
        }

        const userGroup = userStoriesMap.get(authorIdStr)!;
        userGroup.stories.push(story);
        if (!hasViewedThis && !isSelf) {
            userGroup.hasUnseen = true;
        }
        if (new Date(story.createdAt) > new Date(userGroup.latestStoryTime)) {
            userGroup.latestStoryTime = story.createdAt;
        }
    }

    // 4. Separate my stories from other users
    const myGroup = userStoriesMap.get(currentUserId.toString()) || null;
    userStoriesMap.delete(currentUserId.toString());

    // 5. Sort other users: unseen stories first, then chronologically by latest story
    const otherUsers = Array.from(userStoriesMap.values()).sort((a, b) => {
        if (a.hasUnseen && !b.hasUnseen) return -1;
        if (!a.hasUnseen && b.hasUnseen) return 1;
        return new Date(b.latestStoryTime).getTime() - new Date(a.latestStoryTime).getTime();
    });

    const feed = myGroup ? [myGroup, ...otherUsers] : otherUsers;

    res.status(200).json({
        success: true,
        storiesFeed: feed,
        myStories: myGroup ? myGroup.stories : [],
        totalUsersWithStories: feed.length,
    });
});

// 3. Get Single Story
export const getStoryById = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const { storyId } = req.params;

    if (!Types.ObjectId.isValid(storyId as string)) {
        return res.status(400).json({ message: "Invalid story ID format" });
    }

    const story = await Story.findById(storyId).populate("author", "name email avatar about");

    if (!story || story.expiresAt < new Date()) {
        return res.status(404).json({ message: "Story not found or has expired" });
    }

    res.status(200).json({
        success: true,
        story,
    });
});

// 4. Delete Story
export const deleteStory = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user || !req.user._id) {
        return res.status(401).json({ message: "Unauthorized - User required" });
    }

    const { storyId } = req.params;
    if (!Types.ObjectId.isValid(storyId as string)) {
        return res.status(400).json({ message: "Invalid story ID format" });
    }

    const story = await Story.findById(storyId);
    if (!story) {
        return res.status(404).json({ message: "Story not found" });
    }

    if (story.author.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "You are only permitted to delete your own stories" });
    }

    if (story.media.public_id) {
        try {
            await cloudinary.uploader.destroy(story.media.public_id, {
                resource_type: story.media.type === "video" ? "video" : "image",
            });
        } catch (err) {
            console.warn("Cloudinary story asset cleanup warning:", err);
        }
    }

    await Story.findByIdAndDelete(story._id);

    res.status(200).json({
        success: true,
        message: "Story deleted successfully",
    });
});

// 5. Mark Story as Viewed (Deduplicated with timestamp)
export const markStoryViewed = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user || !req.user._id) {
        return res.status(401).json({ message: "Unauthorized - User required" });
    }

    const { storyId } = req.params;
    const currentUserId = new Types.ObjectId(req.user._id);

    if (!Types.ObjectId.isValid(storyId as string)) {
        return res.status(400).json({ message: "Invalid story ID format" });
    }

    const story = await Story.findById(storyId);
    if (!story || story.expiresAt < new Date()) {
        return res.status(404).json({ message: "Story not found or has expired" });
    }

    const alreadyViewed = story.viewers.some((v) => v.user.toString() === currentUserId.toString());

    if (!alreadyViewed) {
        story.viewers.push({
            user: currentUserId,
            viewedAt: new Date(),
        });
        story.viewsCount += 1;
        await story.save();
    }

    res.status(200).json({
        success: true,
        viewsCount: story.viewsCount,
    });
});

// 6. Get Story Viewers (Creator transparency inspector)
export const getStoryViewers = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user || !req.user._id) {
        return res.status(401).json({ message: "Unauthorized - User required" });
    }

    const { storyId } = req.params;
    const currentUserId = new Types.ObjectId(req.user._id);

    if (!Types.ObjectId.isValid(storyId as string)) {
        return res.status(400).json({ message: "Invalid story ID format" });
    }

    const story = await Story.findById(storyId).populate("viewers.user", "name email avatar about");
    if (!story) {
        return res.status(404).json({ message: "Story not found" });
    }

    if (story.author.toString() !== currentUserId.toString()) {
        return res.status(403).json({ message: "Only the creator of this story can inspect viewers" });
    }

    const follows = await Follow.find({
        follower: currentUserId,
        status: "accepted",
    }).select("following");
    const followingSet = new Set(follows.map((f) => f.following.toString()));

    const viewers = story.viewers
        .filter((v) => v.user)
        .map((v: any) => ({
            _id: v.user._id,
            name: v.user.name,
            email: v.user.email,
            avatar: v.user.avatar,
            about: v.user.about,
            viewedAt: v.viewedAt,
            reactionEmoji: v.reactionEmoji,
            isFollowing: followingSet.has(v.user._id.toString()),
        }))
        .reverse();

    res.status(200).json({
        success: true,
        viewers,
        viewsCount: story.viewsCount,
    });
});

// 7. Story Reaction & Reply -> Direct Chat Bridge
export const interactWithStory = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user || !req.user._id) {
        return res.status(401).json({ message: "Unauthorized - User required" });
    }

    const { storyId } = req.params;
    const { reactionEmoji, text } = req.body;
    const currentUserId = new Types.ObjectId(req.user._id);

    if (!Types.ObjectId.isValid(storyId as string)) {
        return res.status(400).json({ message: "Invalid story ID format" });
    }

    const story = await Story.findById(storyId).populate("author", "name email avatar");
    if (!story || story.expiresAt < new Date()) {
        return res.status(404).json({ message: "Story not found or has expired" });
    }

    // 1. Record reaction in story viewers array
    const viewerEntry = story.viewers.find((v) => v.user.toString() === currentUserId.toString());
    if (viewerEntry) {
        if (reactionEmoji) viewerEntry.reactionEmoji = reactionEmoji;
    } else {
        story.viewers.push({
            user: currentUserId,
            viewedAt: new Date(),
            reactionEmoji: reactionEmoji || undefined,
        });
        story.viewsCount += 1;
    }
    await story.save();

    // 2. Inter-Service Bridge: Forward rich story reply message card to Chat Service (Port 5002)
    const authorIdStr = story.author._id.toString();
    const token = req.headers.authorization?.split(" ")[1];

    if (authorIdStr !== currentUserId.toString()) {
        try {
            const chatServiceUrl = getChatServiceUrl();
            await axios.post(
                `${chatServiceUrl}/api/v1/chat/story-reply`,
                {
                    recipientId: authorIdStr,
                    storyId: story._id.toString(),
                    mediaUrl: story.media.url,
                    mediaType: story.media.type,
                    thumbnailUrl: story.media.thumbnailUrl,
                    authorName: (story.author as any).name || "User",
                    reactionEmoji,
                    text,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            // Create notification for story reaction
            const notif = await Notification.create({
                recipient: story.author,
                sender: currentUserId,
                type: "story_reaction",
                story: story._id,
                text: reactionEmoji
                    ? `${req.user.name || "Someone"} reacted ${reactionEmoji} to your story.`
                    : `${req.user.name || "Someone"} replied to your story: "${text}".`,
            });

            // Live socket push to story creator
            emitToUser(authorIdStr, "new_notification", {
                notification: notif,
                sender: {
                    _id: req.user._id,
                    name: req.user.name,
                    avatar: req.user.avatar,
                },
            });
        } catch (err: any) {
            console.error("Chat Service story routing bridge error:", err.message);
        }
    }

    res.status(200).json({
        success: true,
        message: "Story reaction routed directly into Have-it Chat! 💬",
    });
});
