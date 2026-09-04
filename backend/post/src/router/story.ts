import express from "express";
import {
    createStory,
    getStoriesFeed,
    getStoryById,
    deleteStory,
    markStoryViewed,
    getStoryViewers,
    interactWithStory,
} from "../controller/story.js";
import { isAuth } from "../middlewares/isAuth.js";
import { uploadMedia } from "../middlewares/multer.js";

const router = express.Router();

// Story Creation & Feed
router.post("/", isAuth, uploadMedia.single("media"), createStory);
router.get("/feed", isAuth, getStoriesFeed);

// Story Details & Deletion
router.get("/:storyId", isAuth, getStoryById);
router.delete("/:storyId", isAuth, deleteStory);

// Views & Creator Viewers Inspector
router.put("/:storyId/view", isAuth, markStoryViewed);
router.get("/:storyId/viewers", isAuth, getStoryViewers);

// Direct Chat Routing Bridge (Story Reaction / Reply)
router.post("/:storyId/interact", isAuth, interactWithStory);

export default router;
