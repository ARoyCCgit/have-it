import express from "express";
import { isAuth } from "../middlewares/isAuth.js";
import {
    createNewChat,
    createGroupChat,
    updateGroupDetails,
    updateGroupAvatar,
    addGroupMembers,
    removeGroupMember,
    promoteGroupAdmin,
    demoteGroupAdmin,
    leaveGroup,
    getAllChats,
    getMessagesByChat,
    sendMessage,
    reactToMessage,
    deleteMessage,
    editMessage,
    sendStoryReplyMessage,
} from "../controller/chat.js";
import { upload } from "../middlewares/multer.js";

const router = express.Router();

// File upload wrapper supporting images and audio notes
const handleFileUpload = (req: any, res: any, next: any) => {
    upload.any()(req, res, (err) => {
        if (err) {
            return res.status(400).json({ message: err.message });
        }
        if (req.files && req.files.length > 0) {
            req.file = req.files[0];
        }
        next();
    });
};

router.post("/chat/new", isAuth, createNewChat);
router.post("/chat/group/new", isAuth, handleFileUpload, createGroupChat);
router.put("/chat/group/:chatId/update", isAuth, updateGroupDetails);
router.post("/chat/group/:chatId/avatar", isAuth, handleFileUpload, updateGroupAvatar);
router.post("/chat/group/:chatId/add", isAuth, addGroupMembers);
router.post("/chat/group/:chatId/remove", isAuth, removeGroupMember);
router.post("/chat/group/:chatId/admin/promote", isAuth, promoteGroupAdmin);
router.post("/chat/group/:chatId/admin/demote", isAuth, demoteGroupAdmin);
router.post("/chat/group/:chatId/leave", isAuth, leaveGroup);

router.get("/chat/all", isAuth, getAllChats);
router.post("/chat/message", isAuth, handleFileUpload, sendMessage);
router.get("/chat/message/:chatId", isAuth, getMessagesByChat);
router.post("/chat/message/:messageId/reaction", isAuth, reactToMessage);
router.delete("/chat/message/:messageId", isAuth, deleteMessage);
router.put("/chat/message/:messageId", isAuth, editMessage);
router.post("/chat/story-reply", isAuth, sendStoryReplyMessage);

export default router;