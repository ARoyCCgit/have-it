import type { Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import TryCatch from "../config/TryCatch.js";
import cloudinary from "../config/cloudinary.js";
import { getRedisStatus } from "../config/redis.js";
import { Post, type IMediaItem } from "../models/Post.js";
import { User } from "../models/User.js";
import { Follow } from "../models/Follow.js";
import { Bookmark } from "../models/Bookmark.js";
import { Notification } from "../models/Notification.js";
import { Comment } from "../models/Comment.js";
import type { AuthenticatedRequest } from "../middlewares/isAuth.js";
import { emitToUser, emitToPostRoom, broadcastGlobal } from "../socket.js";

// 1. Health Check
export const getHealth = TryCatch(async (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        service: "Have-it Post & Social Hub Microservice",
        port: process.env.PORT || 5003,
        status: "healthy",
        redisConnected: getRedisStatus(),
        timestamp: new Date().toISOString(),
    });
});

// 2. Create New Post (Single image, Carousel, Video, or Reel)
export const createPost = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user || !req.user._id) {
        return res.status(401).json({ message: "Unauthorized - User required" });
    }

    const { caption, location, aspectRatio, isCommentsDisabled, type: requestedType } = req.body;
    const files = req.files as Express.Multer.File[] | undefined;

    let mediaItems: IMediaItem[] = [];

    if (files && files.length > 0) {
        mediaItems = files.map((file) => {
            const isVideo =
                file.mimetype.startsWith("video/") ||
                file.mimetype.includes("mp4") ||
                file.mimetype.includes("webm");

            let thumbnailUrl: string | undefined = undefined;
            if (isVideo && file.path) {
                // Cloudinary video thumbnail generator (replaces extension with .jpg)
                thumbnailUrl = file.path.replace(/\.[^/.]+$/, ".jpg");
            }

            return {
                url: file.path,
                public_id: file.filename || file.path,
                type: isVideo ? ("video" as const) : ("image" as const),
                aspectRatio: aspectRatio || "1:1",
                thumbnailUrl,
            };
        });
    } else if (req.body.media && Array.isArray(req.body.media)) {
        mediaItems = req.body.media;
    }

    if (mediaItems.length === 0) {
        return res.status(400).json({
            message: "Please upload at least 1 image or video to create a post",
        });
    }

    // Auto-extract hashtags from caption
    const parsedCaption = caption ? String(caption).trim() : "";
    const extractedTags: string[] = [];
    const hashtagRegex = /#([a-zA-Z0-9_\u0080-\uFFFF]+)/g;
    let match;
    while ((match = hashtagRegex.exec(parsedCaption)) !== null) {
        if (match[1]) {
            extractedTags.push(match[1].toLowerCase());
        }
    }

    // Merge with any custom tags sent in body
    let bodyTags: string[] = [];
    if (req.body.tags) {
        if (Array.isArray(req.body.tags)) {
            bodyTags = req.body.tags.map((t: string) => t.replace(/^#/, "").toLowerCase().trim());
        } else if (typeof req.body.tags === "string") {
            bodyTags = req.body.tags
                .split(",")
                .map((t: string) => t.replace(/^#/, "").toLowerCase().trim())
                .filter(Boolean);
        }
    }
    const allTags = Array.from(new Set([...extractedTags, ...bodyTags]));

    // Determine Post Type
    const hasAnyVideo = mediaItems.some((m) => m.type === "video");
    let postType: "image" | "carousel" | "video" | "reel" = "image";
    if (requestedType === "reel") {
        postType = hasAnyVideo ? "reel" : (mediaItems.length > 1 ? "carousel" : "image");
    } else if (requestedType && ["image", "carousel", "video"].includes(requestedType)) {
        postType = requestedType;
    } else if (mediaItems.length > 1) {
        postType = "carousel";
    } else if (mediaItems[0]?.type === "video") {
        postType = aspectRatio === "9:16" ? "reel" : "video";
    }

    const post = await Post.create({
        author: new Types.ObjectId(req.user._id),
        type: postType,
        media: mediaItems,
        caption: parsedCaption,
        tags: allTags,
        location: location ? String(location).trim() : "",
        likes: [],
        likesCount: 0,
        views: [],
        viewsCount: 0,
        commentsCount: 0,
        isCommentsDisabled: isCommentsDisabled === "true" || isCommentsDisabled === true,
        isArchived: false,
    });

    const populatedPost = await Post.findById(post._id).populate("author", "name email avatar about");

    res.status(201).json({
        success: true,
        message: "Post created successfully",
        post: populatedPost,
    });
});

// 3. Get Main Feed Posts (Followed accounts + trending/recent fallback)
export const getFeedPosts = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user || !req.user._id) {
        return res.status(401).json({ message: "Unauthorized - User required" });
    }

    const currentUserId = new Types.ObjectId(req.user._id);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    // Get all accounts followed by the current user
    const follows = await Follow.find({
        follower: currentUserId,
        status: "accepted",
    }).select("following");

    const followingIds = follows.map((f) => f.following);
    // Include user's own posts in their feed
    const authorIds = [...followingIds, currentUserId];

    let posts = await Post.find({
        author: { $in: authorIds },
        isArchived: false,
    })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("author", "name email avatar about");

    // Supplement with popular/recent public posts if feed is sparse
    if (posts.length < limit && page === 1) {
        const existingIds = posts.map((p) => p._id);
        const remainingLimit = limit - posts.length;

        const publicPosts = await Post.find({
            _id: { $nin: existingIds },
            isArchived: false,
        })
            .sort({ likesCount: -1, createdAt: -1 })
            .limit(remainingLimit)
            .populate("author", "name email avatar about");

        posts = [...posts, ...publicPosts];
    }

    const postIds = posts.map((p) => p._id);

    // Batch query user's bookmarks to calculate isSavedByMe efficiently
    const userBookmarks = await Bookmark.find({
        user: currentUserId,
        post: { $in: postIds },
    }).select("post");
    const bookmarkedSet = new Set(userBookmarks.map((b) => b.post.toString()));

    const formattedPosts = posts.map((post) => {
        const postObj = post.toObject();
        return {
            ...postObj,
            isLikedByMe: post.likes.some((id) => id.toString() === currentUserId.toString()),
            isSavedByMe: bookmarkedSet.has(post._id.toString()),
            isViewedByMe: post.views.some((v) => v.user.toString() === currentUserId.toString()),
        };
    });

    const totalPosts = await Post.countDocuments({
        author: { $in: authorIds },
        isArchived: false,
    });

    res.status(200).json({
        success: true,
        posts: formattedPosts,
        page,
        totalPosts,
        hasMore: posts.length === limit,
    });
});

// 4. Get Explore Grid Posts (Trending / Search / Hashtag discovery)
export const getExplorePosts = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit as string) || 18));
    const skip = (page - 1) * limit;
    const tag = req.query.tag as string | undefined;
    const search = req.query.search as string | undefined;

    const filter: any = { isArchived: false };

    if (tag) {
        filter.tags = tag.toLowerCase().replace(/^#/, "");
    } else if (search && search.trim()) {
        const term = search.trim();
        filter.$or = [
            { caption: { $regex: term, $options: "i" } },
            { tags: { $regex: term.toLowerCase().replace(/^#/, ""), $options: "i" } },
            { location: { $regex: term, $options: "i" } },
        ];
    }

    const posts = await Post.find(filter)
        .sort({ likesCount: -1, viewsCount: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("author", "name email avatar about");

    const currentUserId = req.user?._id ? new Types.ObjectId(req.user._id) : null;
    let bookmarkedSet = new Set<string>();

    if (currentUserId) {
        const postIds = posts.map((p) => p._id);
        const bookmarks = await Bookmark.find({
            user: currentUserId,
            post: { $in: postIds },
        }).select("post");
        bookmarkedSet = new Set(bookmarks.map((b) => b.post.toString()));
    }

    const formattedPosts = posts.map((post) => {
        const postObj = post.toObject();
        return {
            ...postObj,
            isLikedByMe: currentUserId
                ? post.likes.some((id) => id.toString() === currentUserId.toString())
                : false,
            isSavedByMe: bookmarkedSet.has(post._id.toString()),
        };
    });

    res.status(200).json({
        success: true,
        posts: formattedPosts,
        page,
        hasMore: posts.length === limit,
    });
});

// 5. Get Single Post Details
export const getPostById = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const { postId } = req.params;

    if (!Types.ObjectId.isValid(postId as string)) {
        return res.status(400).json({ message: "Invalid post ID format" });
    }

    const post = await Post.findById(postId).populate("author", "name email avatar about");

    if (!post || post.isArchived) {
        return res.status(404).json({ message: "Post not found or has been removed" });
    }

    const currentUserId = req.user?._id ? new Types.ObjectId(req.user._id) : null;
    let isSavedByMe = false;

    if (currentUserId) {
        const bookmark = await Bookmark.findOne({ user: currentUserId, post: post._id });
        isSavedByMe = !!bookmark;
    }

    const postObj = post.toObject();
    res.status(200).json({
        success: true,
        post: {
            ...postObj,
            isLikedByMe: currentUserId
                ? post.likes.some((id) => id.toString() === currentUserId.toString())
                : false,
            isSavedByMe,
            isViewedByMe: currentUserId
                ? post.views.some((v) => v.user.toString() === currentUserId.toString())
                : false,
        },
    });
});

// 6. Get User Posts (Profile 3-column grid & Reels)
export const getUserPosts = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.params;
    const type = req.query.type as string | undefined;

    if (!Types.ObjectId.isValid(userId as string)) {
        return res.status(400).json({ message: "Invalid user ID format" });
    }

    const filter: any = {
        author: new Types.ObjectId(userId as string),
        isArchived: false,
    };

    if (type === "reel") {
        filter.type = "reel";
    }

    const posts = await Post.find(filter)
        .sort({ createdAt: -1 })
        .populate("author", "name email avatar about");

    const currentUserId = req.user?._id ? new Types.ObjectId(req.user._id) : null;
    let bookmarkedSet = new Set<string>();

    if (currentUserId) {
        const postIds = posts.map((p) => p._id);
        const bookmarks = await Bookmark.find({
            user: currentUserId,
            post: { $in: postIds },
        }).select("post");
        bookmarkedSet = new Set(bookmarks.map((b) => b.post.toString()));
    }

    const formattedPosts = posts.map((post) => {
        const postObj = post.toObject();
        return {
            ...postObj,
            isLikedByMe: currentUserId
                ? post.likes.some((id) => id.toString() === currentUserId.toString())
                : false,
            isSavedByMe: bookmarkedSet.has(post._id.toString()),
        };
    });

    res.status(200).json({
        success: true,
        posts: formattedPosts,
        totalPosts: posts.length,
    });
});

// 7. Delete Post
export const deletePost = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user || !req.user._id) {
        return res.status(401).json({ message: "Unauthorized - User required" });
    }

    const { postId } = req.params;
    if (!Types.ObjectId.isValid(postId as string)) {
        return res.status(400).json({ message: "Invalid post ID format" });
    }

    const post = await Post.findById(postId);
    if (!post) {
        return res.status(404).json({ message: "Post not found" });
    }

    if (post.author.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "You are only permitted to delete your own posts" });
    }

    // Clean up Cloudinary assets
    for (const item of post.media) {
        if (item.public_id) {
            try {
                await cloudinary.uploader.destroy(item.public_id, {
                    resource_type: item.type === "video" ? "video" : "image",
                });
            } catch (err) {
                console.warn("Cloudinary asset cleanup warning:", err);
            }
        }
    }

    // Clean up relational records
    await Comment.deleteMany({ post: post._id });
    await Bookmark.deleteMany({ post: post._id });
    await Notification.deleteMany({ post: post._id });
    await Post.findByIdAndDelete(post._id);

    broadcastGlobal("post_deleted", { postId: post._id.toString() });

    res.status(200).json({
        success: true,
        message: "Post deleted successfully",
    });
});

// 8. Toggle Like Post (Atomic counter + Live Socket notification)
export const toggleLikePost = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user || !req.user._id) {
        return res.status(401).json({ message: "Unauthorized - User required" });
    }

    const { postId } = req.params;
    const currentUserId = new Types.ObjectId(req.user._id);

    if (!Types.ObjectId.isValid(postId as string)) {
        return res.status(400).json({ message: "Invalid post ID format" });
    }

    const post = await Post.findById(postId);
    if (!post) {
        return res.status(404).json({ message: "Post not found" });
    }

    const hasLiked = post.likes.some((id) => id.toString() === currentUserId.toString());
    let isLiked = false;

    if (hasLiked) {
        // Unlike
        post.likes = post.likes.filter((id) => id.toString() !== currentUserId.toString());
        post.likesCount = Math.max(0, post.likesCount - 1);
        isLiked = false;

        await Notification.findOneAndDelete({
            recipient: post.author,
            sender: currentUserId,
            type: "like_post",
            post: post._id,
        });
    } else {
        // Like
        post.likes.push(currentUserId);
        post.likesCount += 1;
        isLiked = true;

        // Generate activity notification if not liking own post
        if (post.author.toString() !== currentUserId.toString()) {
            const notif = await Notification.create({
                recipient: post.author,
                sender: currentUserId,
                type: "like_post",
                post: post._id,
                text: `${req.user.name || "Someone"} liked your post.`,
            });

            // Real-time socket notification to author
            emitToUser(post.author.toString(), "new_notification", {
                notification: notif,
                sender: {
                    _id: req.user._id,
                    name: req.user.name,
                    avatar: req.user.avatar,
                },
            });
        }
    }

    await post.save();

    // Broadcast live like update to all active viewers in post room and global feed
    emitToPostRoom(post._id.toString(), "post_likes_updated", {
        postId: post._id.toString(),
        likesCount: post.likesCount,
    });
    broadcastGlobal("post_likes_updated", {
        postId: post._id.toString(),
        likesCount: post.likesCount,
    });

    res.status(200).json({
        success: true,
        isLiked,
        likesCount: post.likesCount,
    });
});

// 9. Get Post Likers Inspector (Full modal list of users who liked post + Follow status)
export const getPostLikers = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const { postId } = req.params;

    if (!Types.ObjectId.isValid(postId as string)) {
        return res.status(400).json({ message: "Invalid post ID format" });
    }

    const post = await Post.findById(postId).populate("likes", "name email avatar about");
    if (!post) {
        return res.status(404).json({ message: "Post not found" });
    }

    const currentUserId = req.user?._id ? new Types.ObjectId(req.user._id) : null;
    let followingSet = new Set<string>();

    if (currentUserId) {
        const follows = await Follow.find({
            follower: currentUserId,
            status: "accepted",
        }).select("following");
        followingSet = new Set(follows.map((f) => f.following.toString()));
    }

    const likers = (post.likes as unknown as Array<any>).map((user) => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        about: user.about,
        isFollowing: currentUserId ? followingSet.has(user._id.toString()) : false,
        isSelf: currentUserId ? user._id.toString() === currentUserId.toString() : false,
    }));

    res.status(200).json({
        success: true,
        likers,
        totalLikers: likers.length,
    });
});

// 10. Record Post View (Deduplicated per user)
export const recordPostView = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user || !req.user._id) {
        return res.status(401).json({ message: "Unauthorized - User required" });
    }

    const { postId } = req.params;
    const currentUserId = new Types.ObjectId(req.user._id);

    if (!Types.ObjectId.isValid(postId as string)) {
        return res.status(400).json({ message: "Invalid post ID format" });
    }

    const post = await Post.findById(postId);
    if (!post) {
        return res.status(404).json({ message: "Post not found" });
    }

    const alreadyViewed = post.views.some(
        (v) => v.user.toString() === currentUserId.toString()
    );

    if (!alreadyViewed) {
        post.views.push({
            user: currentUserId,
            viewedAt: new Date(),
        });
        post.viewsCount += 1;
        await post.save();
    }

    res.status(200).json({
        success: true,
        viewsCount: post.viewsCount,
    });
});

// 11. Get Post Viewers Inspector (Full creator transparency view list + timestamps)
export const getPostViewers = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user || !req.user._id) {
        return res.status(401).json({ message: "Unauthorized - User required" });
    }

    const { postId } = req.params;
    const currentUserId = new Types.ObjectId(req.user._id);

    if (!Types.ObjectId.isValid(postId as string)) {
        return res.status(400).json({ message: "Invalid post ID format" });
    }

    const post = await Post.findById(postId).populate(
        "views.user",
        "name email avatar about"
    );
    if (!post) {
        return res.status(404).json({ message: "Post not found" });
    }

    // Only post author is permitted to inspect full viewer identities
    if (post.author.toString() !== currentUserId.toString()) {
        return res.status(403).json({
            message: "Only the author of this post can inspect the detailed viewers list",
        });
    }

    const follows = await Follow.find({
        follower: currentUserId,
        status: "accepted",
    }).select("following");
    const followingSet = new Set(follows.map((f) => f.following.toString()));

    const viewers = post.views
        .filter((v) => v.user) // Filter out any null users if user was deleted
        .map((v: any) => ({
            _id: v.user._id,
            name: v.user.name,
            email: v.user.email,
            avatar: v.user.avatar,
            about: v.user.about,
            viewedAt: v.viewedAt,
            isFollowing: followingSet.has(v.user._id.toString()),
        }))
        .reverse(); // Most recent viewers first

    res.status(200).json({
        success: true,
        viewers,
        viewsCount: post.viewsCount,
    });
});

// 12. Toggle Bookmark Post
export const toggleBookmarkPost = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user || !req.user._id) {
        return res.status(401).json({ message: "Unauthorized - User required" });
    }

    const { postId } = req.params;
    const { collectionName } = req.body;
    const currentUserId = new Types.ObjectId(req.user._id);

    if (!Types.ObjectId.isValid(postId as string)) {
        return res.status(400).json({ message: "Invalid post ID format" });
    }

    const post = await Post.findById(postId);
    if (!post) {
        return res.status(404).json({ message: "Post not found" });
    }

    const existingBookmark = await Bookmark.findOne({
        user: currentUserId,
        post: post._id,
    });

    let isSaved = false;
    if (existingBookmark) {
        await Bookmark.findByIdAndDelete(existingBookmark._id);
        isSaved = false;
    } else {
        await Bookmark.create({
            user: currentUserId,
            post: post._id,
            collectionName: collectionName || "All Posts",
        });
        isSaved = true;
    }

    res.status(200).json({
        success: true,
        isSaved,
        message: isSaved ? "Post saved to your bookmarks" : "Post removed from bookmarks",
    });
});

// 13. Get User's Saved / Bookmarked Posts
export const getUserSavedPosts = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user || !req.user._id) {
        return res.status(401).json({ message: "Unauthorized - User required" });
    }

    const currentUserId = new Types.ObjectId(req.user._id);

    const bookmarks = await Bookmark.find({ user: currentUserId })
        .sort({ createdAt: -1 })
        .populate({
            path: "post",
            populate: {
                path: "author",
                select: "name email avatar about",
            },
        });

    const validSavedPosts = bookmarks
        .filter((b) => b.post && !(b.post as any).isArchived)
        .map((b) => {
            const postObj = (b.post as any).toObject();
            return {
                ...postObj,
                bookmarkId: b._id,
                collectionName: b.collectionName,
                savedAt: b.createdAt,
                isSavedByMe: true,
            };
        });

    res.status(200).json({
        success: true,
        savedPosts: validSavedPosts,
        totalSaved: validSavedPosts.length,
    });
});

// 14. Get Reels Feed (Dedicated vertical video stream)
export const getReelsFeed = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(30, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    const filter: any = {
        isArchived: false,
        $or: [
            { type: "reel" },
            { type: "video" },
            { "media.type": "video" },
        ],
    };

    const reels = await Post.find(filter)
        .sort({ createdAt: -1, likesCount: -1 })
        .skip(skip)
        .limit(limit)
        .populate("author", "name email avatar about");

    const currentUserId = req.user?._id ? new Types.ObjectId(req.user._id) : null;
    let bookmarkedSet = new Set<string>();

    if (currentUserId) {
        const reelIds = reels.map((r) => r._id);
        const bookmarks = await Bookmark.find({
            user: currentUserId,
            post: { $in: reelIds },
        }).select("post");
        bookmarkedSet = new Set(bookmarks.map((b) => b.post.toString()));
    }

    const formattedReels = reels.map((reel) => {
        const reelObj = reel.toObject();
        return {
            ...reelObj,
            isLikedByMe: currentUserId
                ? reel.likes.some((id) => id.toString() === currentUserId.toString())
                : false,
            isSavedByMe: bookmarkedSet.has(reel._id.toString()),
            isViewedByMe: currentUserId
                ? reel.views.some((v) => v.user.toString() === currentUserId.toString())
                : false,
        };
    });

    res.status(200).json({
        success: true,
        reels: formattedReels,
        page,
        hasMore: reels.length === limit,
    });
});

