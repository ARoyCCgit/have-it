import type { Request, Response } from "express";
import { Types } from "mongoose";
import TryCatch from "../config/TryCatch.js";
import { Comment } from "../models/Comment.js";
import { Post } from "../models/Post.js";
import { User } from "../models/User.js";
import { Notification } from "../models/Notification.js";
import type { AuthenticatedRequest } from "../middlewares/isAuth.js";
import { emitToPostRoom, emitToUser, broadcastGlobal } from "../socket.js";

// 1. Add Comment or Nested Reply
export const addComment = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user || !req.user._id) {
        return res.status(401).json({ message: "Unauthorized - User required" });
    }

    const { postId } = req.params;
    const { text, parentCommentId } = req.body;
    const currentUserId = new Types.ObjectId(req.user._id);

    if (!Types.ObjectId.isValid(postId as string)) {
        return res.status(400).json({ message: "Invalid post ID format" });
    }

    if (!text || !text.trim()) {
        return res.status(400).json({ message: "Comment text cannot be empty" });
    }

    const post = await Post.findById(postId);
    if (!post || post.isArchived) {
        return res.status(404).json({ message: "Post not found or has been removed" });
    }

    if (post.isCommentsDisabled) {
        return res.status(403).json({ message: "Comments are disabled for this post" });
    }

    let parentId: Types.ObjectId | null = null;
    if (parentCommentId && Types.ObjectId.isValid(parentCommentId)) {
        const parent = await Comment.findById(parentCommentId);
        if (parent) {
            parentId = parent._id;
            parent.repliesCount += 1;
            await parent.save();
        }
    }

    const comment = await Comment.create({
        post: post._id,
        author: currentUserId,
        text: text.trim(),
        parentComment: parentId,
        likes: [],
        likesCount: 0,
        repliesCount: 0,
        isEdited: false,
    });

    // Update post comments count
    post.commentsCount += 1;
    await post.save();

    const populatedComment = await Comment.findById(comment._id).populate("author", "name email avatar about");

    // Detect @mentions in text (e.g., @alex, @john)
    const mentionRegex = /@([a-zA-Z0-9_\u0080-\uFFFF]+)/g;
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
        const mentionedName = match[1];
        if (mentionedName) {
            const mentionedUser = await User.findOne({
                name: { $regex: new RegExp(`^${mentionedName}$`, "i") },
            });
            if (mentionedUser && mentionedUser._id.toString() !== currentUserId.toString()) {
                const notif = await Notification.create({
                    recipient: mentionedUser._id,
                    sender: currentUserId,
                    type: "mention",
                    post: post._id,
                    comment: comment._id,
                    text: `${req.user.name || "Someone"} mentioned you in a comment: "${text.trim()}".`,
                });
                emitToUser(mentionedUser._id.toString(), "new_notification", {
                    notification: notif,
                    sender: {
                        _id: req.user._id,
                        name: req.user.name,
                        avatar: req.user.avatar,
                    },
                });
            }
        }
    }

    // Generate notification for post author (if not commenting on own post)
    if (post.author.toString() !== currentUserId.toString()) {
        const notif = await Notification.create({
            recipient: post.author,
            sender: currentUserId,
            type: parentId ? "reply" : "comment",
            post: post._id,
            comment: comment._id,
            text: `${req.user.name || "Someone"} ${parentId ? "replied to a comment on" : "commented on"} your post: "${text.trim()}".`,
        });

        emitToUser(post.author.toString(), "new_notification", {
            notification: notif,
            sender: {
                _id: req.user._id,
                name: req.user.name,
                avatar: req.user.avatar,
            },
        });
    }

    // Live Socket.IO Broadcast to everyone currently viewing the post
    emitToPostRoom(post._id.toString(), "new_comment", {
        postId: post._id.toString(),
        comment: populatedComment,
        commentsCount: post.commentsCount,
    });
    broadcastGlobal("post_comments_count_updated", {
        postId: post._id.toString(),
        commentsCount: post.commentsCount,
    });

    res.status(201).json({
        success: true,
        message: "Comment added successfully",
        comment: populatedComment,
        commentsCount: post.commentsCount,
    });
});

// 2. Get Post Comments with Nested 1-Level Replies
export const getPostComments = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const { postId } = req.params;

    if (!Types.ObjectId.isValid(postId as string)) {
        return res.status(400).json({ message: "Invalid post ID format" });
    }

    const currentUserId = req.user?._id ? new Types.ObjectId(req.user._id) : null;

    // 1. Get all top-level comments
    const topLevelComments = await Comment.find({
        post: new Types.ObjectId(postId as string),
        parentComment: null,
    })
        .sort({ createdAt: -1 })
        .populate("author", "name email avatar about");

    // 2. Get all nested replies for these comments
    const commentIds = topLevelComments.map((c) => c._id);
    const replies = await Comment.find({
        post: new Types.ObjectId(postId as string),
        parentComment: { $in: commentIds },
    })
        .sort({ createdAt: 1 })
        .populate("author", "name email avatar about");

    // 3. Map replies under their parent comments
    const repliesMap = new Map<string, any[]>();
    for (const reply of replies) {
        const parentId = reply.parentComment?.toString();
        if (parentId) {
            if (!repliesMap.has(parentId)) {
                repliesMap.set(parentId, []);
            }
            const replyObj = reply.toObject();
            repliesMap.get(parentId)!.push({
                ...replyObj,
                isLikedByMe: currentUserId
                    ? reply.likes.some((id) => id.toString() === currentUserId.toString())
                    : false,
            });
        }
    }

    const formattedComments = topLevelComments.map((comment) => {
        const commentObj = comment.toObject();
        return {
            ...commentObj,
            isLikedByMe: currentUserId
                ? comment.likes.some((id) => id.toString() === currentUserId.toString())
                : false,
            replies: repliesMap.get(comment._id.toString()) || [],
        };
    });

    res.status(200).json({
        success: true,
        comments: formattedComments,
        totalComments: formattedComments.length,
    });
});

// 3. Delete Comment
export const deleteComment = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user || !req.user._id) {
        return res.status(401).json({ message: "Unauthorized - User required" });
    }

    const { commentId } = req.params;
    if (!Types.ObjectId.isValid(commentId as string)) {
        return res.status(400).json({ message: "Invalid comment ID format" });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
    }

    const post = await Post.findById(comment.post);
    const isCommentAuthor = comment.author.toString() === req.user._id.toString();
    const isPostAuthor = post && post.author.toString() === req.user._id.toString();

    if (!isCommentAuthor && !isPostAuthor) {
        return res.status(403).json({ message: "You are not permitted to delete this comment" });
    }

    // Delete nested replies if this is a parent comment
    const repliesDeleted = await Comment.deleteMany({ parentComment: comment._id });
    await Comment.findByIdAndDelete(comment._id);

    // Update post comments count
    if (post) {
        post.commentsCount = Math.max(0, post.commentsCount - (1 + repliesDeleted.deletedCount));
        await post.save();
    }

    // If deleting a reply, decrement parent comment's repliesCount
    if (comment.parentComment) {
        const parent = await Comment.findById(comment.parentComment);
        if (parent) {
            parent.repliesCount = Math.max(0, parent.repliesCount - 1);
            await parent.save();
        }
    }

    // Broadcast deletion to post room and updated commentsCount globally
    emitToPostRoom(comment.post.toString(), "comment_deleted", {
        postId: comment.post.toString(),
        commentId: comment._id.toString(),
        parentCommentId: comment.parentComment ? comment.parentComment.toString() : null,
        commentsCount: post?.commentsCount || 0,
    });
    broadcastGlobal("post_comments_count_updated", {
        postId: comment.post.toString(),
        commentsCount: post?.commentsCount || 0,
    });

    res.status(200).json({
        success: true,
        message: "Comment deleted successfully",
    });
});

// 4. Toggle Like on Comment
export const toggleLikeComment = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user || !req.user._id) {
        return res.status(401).json({ message: "Unauthorized - User required" });
    }

    const { commentId } = req.params;
    const currentUserId = new Types.ObjectId(req.user._id);

    if (!Types.ObjectId.isValid(commentId as string)) {
        return res.status(400).json({ message: "Invalid comment ID format" });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
    }

    const hasLiked = comment.likes.some((id) => id.toString() === currentUserId.toString());
    let isLiked = false;

    if (hasLiked) {
        comment.likes = comment.likes.filter((id) => id.toString() !== currentUserId.toString());
        comment.likesCount = Math.max(0, comment.likesCount - 1);
        isLiked = false;
    } else {
        comment.likes.push(currentUserId);
        comment.likesCount += 1;
        isLiked = true;

        if (comment.author.toString() !== currentUserId.toString()) {
            const notif = await Notification.create({
                recipient: comment.author,
                sender: currentUserId,
                type: "like_comment",
                post: comment.post,
                comment: comment._id,
                text: `${req.user.name || "Someone"} liked your comment: "${comment.text}".`,
            });
            emitToUser(comment.author.toString(), "new_notification", {
                notification: notif,
                sender: {
                    _id: req.user._id,
                    name: req.user.name,
                    avatar: req.user.avatar,
                },
            });
        }
    }

    await comment.save();

    // Broadcast updated likes count to all users in this post room
    emitToPostRoom(comment.post.toString(), "comment_likes_updated", {
        postId: comment.post.toString(),
        commentId: comment._id.toString(),
        likesCount: comment.likesCount,
    });

    res.status(200).json({
        success: true,
        isLiked,
        likesCount: comment.likesCount,
    });
});
