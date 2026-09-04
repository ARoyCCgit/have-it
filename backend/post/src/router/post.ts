import express from "express";
import {
    getHealth,
    createPost,
    getFeedPosts,
    getExplorePosts,
    getPostById,
    getUserPosts,
    deletePost,
    toggleLikePost,
    getPostLikers,
    recordPostView,
    getPostViewers,
    toggleBookmarkPost,
    getUserSavedPosts,
    getReelsFeed,
} from "../controller/post.js";
import {
    addComment,
    getPostComments,
    deleteComment,
    toggleLikeComment,
} from "../controller/comment.js";
import {
    followUser,
    unfollowUser,
    getUserFollowers,
    getUserFollowing,
    getSuggestedUsers,
} from "../controller/follow.js";
import {
    getNotifications,
    markNotificationsAsRead,
    getUnreadNotificationsCount,
} from "../controller/notification.js";
import { isAuth } from "../middlewares/isAuth.js";
import { uploadMedia } from "../middlewares/multer.js";

const router = express.Router();

// System Health & Diagnostics
router.get("/health", getHealth);

// Feed, Explore, Reels & Saved Collections
router.get("/feed", isAuth, getFeedPosts);
router.get("/explore", isAuth, getExplorePosts);
router.get("/reels", isAuth, getReelsFeed);
router.get("/saved", isAuth, getUserSavedPosts);

// Notifications Stream & Unread Badge
router.get("/notifications/stream", isAuth, getNotifications);
router.put("/notifications/read", isAuth, markNotificationsAsRead);
router.get("/notifications/unread-count", isAuth, getUnreadNotificationsCount);

// Social Follow Graph & Suggestions
router.get("/user/suggestions", isAuth, getSuggestedUsers);
router.post("/user/follow/:targetUserId", isAuth, followUser);
router.post("/user/unfollow/:targetUserId", isAuth, unfollowUser);
router.get("/user/:userId/followers", isAuth, getUserFollowers);
router.get("/user/:userId/following", isAuth, getUserFollowing);

// User Profile Posts Grid
router.get("/user/:userId", isAuth, getUserPosts);

// Post Creation (Single image, Multi-Image Carousel, Video, or Reel)
router.post("/", isAuth, uploadMedia.array("media", 10), createPost);

// Post Details & Deletion
router.get("/:postId", isAuth, getPostById);
router.delete("/:postId", isAuth, deletePost);

// Likes & Likers Transparency Inspector
router.put("/:postId/like", isAuth, toggleLikePost);
router.get("/:postId/likers", isAuth, getPostLikers);

// View Tracking & Creator Viewers Transparency Inspector
router.post("/:postId/view", isAuth, recordPostView);
router.get("/:postId/viewers", isAuth, getPostViewers);

// Bookmarking / Collections
router.put("/:postId/bookmark", isAuth, toggleBookmarkPost);

// Threaded Comments (1-level nested replies, mentions, likes)
router.post("/:postId/comments", isAuth, addComment);
router.get("/:postId/comments", isAuth, getPostComments);
router.delete("/comments/:commentId", isAuth, deleteComment);
router.put("/comments/:commentId/like", isAuth, toggleLikeComment);

export default router;
