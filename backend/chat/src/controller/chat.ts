import axios from "axios";
import mongoose from "mongoose";
import TryCatch from "../config/TryCatch.js";
import type { AuthenticateRequest } from "../middlewares/isAuth.js";
import { Chat } from "../models/Chat.js";
import { Messages } from "../models/Messages.js";
import { getIO } from "../socket.js";

const getUserServiceUrl = () => {
    const raw = (process.env.USER_SERVICE || "http://localhost:5000").trim();
    return raw.replace(/\/+$/, "");
};

// Helper: Fetch a single user profile from user service
async function fetchUserProfile(userId: string) {
    if (!userId || userId === "undefined" || userId === "null") {
        return { _id: userId, name: "Contact" };
    }
    try {
        const userServiceUrl = getUserServiceUrl();
        const { data } = await axios.get(`${userServiceUrl}/api/v1/user/${userId}`);
        return (data && data._id) ? data : { _id: userId, name: data?.name || "Contact" };
    } catch {
        return { _id: userId, name: "Contact" };
    }
}

// 1-on-1 Chat Creation
export const createNewChat = TryCatch(async (req: AuthenticateRequest, res) => {
    const userId = req.user?._id;
    const { otherUserId } = req.body;

    if (!otherUserId) {
        res.status(400).json({
            message: "Other user id is Required",
        });
        return;
    }

    const existingChat = await Chat.findOne({
        isGroup: { $ne: true },
        users: { $all: [userId, otherUserId], $size: 2 },
    });

    if (existingChat) {
        res.status(200).json({
            message: "Chat Already Exist",
            chatId: existingChat._id,
        });
        return;
    }

    const newChat = await Chat.create({
        users: [userId, otherUserId],
        isGroup: false,
    });

    res.status(201).json({
        message: "New Chat Created",
        chatId: newChat._id,
    });
});

// Group Chat Creation
export const createGroupChat = TryCatch(async (req: AuthenticateRequest, res) => {
    const creatorId = req.user?._id;
    let { groupName, users, groupDescription } = req.body;
    const avatarFile = req.file;

    if (!creatorId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    if (!groupName || !groupName.trim()) {
        res.status(400).json({ message: "Group subject/name is required" });
        return;
    }

    // Parse member IDs
    let memberIds: string[] = [];
    if (typeof users === "string") {
        try {
            memberIds = JSON.parse(users);
        } catch {
            memberIds = users.split(",").map((s: string) => s.trim()).filter(Boolean);
        }
    } else if (Array.isArray(users)) {
        memberIds = users.map((u: string) => u.toString());
    }

    // Add creator to member list if not already present
    if (!memberIds.includes(creatorId.toString())) {
        memberIds.push(creatorId.toString());
    }

    if (memberIds.length < 2) {
        res.status(400).json({ message: "A group must contain at least 2 participants" });
        return;
    }

    const groupAvatarData: { url: string; publicId: string } = {
        url: "",
        publicId: "",
    };

    if (avatarFile) {
        groupAvatarData.url = avatarFile.path;
        groupAvatarData.publicId = avatarFile.filename;
    }

    const groupChat = await Chat.create({
        groupName: groupName.trim(),
        groupDescription: (groupDescription || "").trim(),
        groupAvatar: groupAvatarData,
        users: memberIds,
        isGroup: true,
        groupAdmins: [creatorId.toString()],
        createdBy: creatorId.toString(),
        latestMessage: {
            text: `Group "${groupName.trim()}" created`,
            sender: creatorId.toString(),
        },
    });

    // Create initial system/welcome message
    const initialMessage = await Messages.create({
        chatId: groupChat._id,
        sender: creatorId.toString(),
        text: `Group "${groupName.trim()}" created by you`,
        messageType: "text",
        seen: true,
        seenAt: new Date(),
    });

    // Notify all members via socket
    try {
        const io = getIO();
        if (io) {
            memberIds.forEach((memberId) => {
                io.to(`user:${memberId}`).emit("chat_updated", {
                    chatId: groupChat._id.toString(),
                    isGroup: true,
                    groupName: groupChat.groupName,
                });
                io.to(`user:${memberId}`).emit("receive_message", initialMessage);
            });
        }
    } catch (err) {
        console.error("Socket group creation broadcast error:", err);
    }

    res.status(201).json({
        message: "Group created successfully",
        chatId: groupChat._id,
        group: groupChat,
    });
});

// Update Group Details (Subject & Description)
export const updateGroupDetails = TryCatch(async (req: AuthenticateRequest, res) => {
    const userId = req.user?._id;
    const { chatId } = req.params;
    const { groupName, groupDescription } = req.body;

    if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    const group = await Chat.findOne({ _id: chatId, isGroup: true });
    if (!group) {
        res.status(404).json({ message: "Group not found" });
        return;
    }

    if (!group.users.includes(userId.toString())) {
        res.status(403).json({ message: "You are not a member of this group" });
        return;
    }

    if (groupName && groupName.trim()) {
        group.groupName = groupName.trim();
    }
    if (groupDescription !== undefined) {
        group.groupDescription = groupDescription.trim();
    }

    await group.save();

    // Broadcast update
    try {
        const io = getIO();
        if (io) {
            io.to(group._id.toString()).emit("chat_updated", {
                chatId: group._id.toString(),
                groupName: group.groupName,
                groupDescription: group.groupDescription,
            });
            group.users.forEach((mId) => {
                io.to(`user:${mId}`).emit("chat_updated", {
                    chatId: group._id.toString(),
                    groupName: group.groupName,
                });
            });
        }
    } catch (err) {
        console.error("Socket error:", err);
    }

    res.status(200).json({
        message: "Group details updated",
        group,
    });
});

// Update Group Avatar
export const updateGroupAvatar = TryCatch(async (req: AuthenticateRequest, res) => {
    const userId = req.user?._id;
    const { chatId } = req.params;
    const avatarFile = req.file;

    if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    if (!avatarFile) {
        res.status(400).json({ message: "No image file provided" });
        return;
    }

    const group = await Chat.findOne({ _id: chatId, isGroup: true });
    if (!group) {
        res.status(404).json({ message: "Group not found" });
        return;
    }

    if (!group.users.includes(userId.toString())) {
        res.status(403).json({ message: "You are not a member of this group" });
        return;
    }

    group.groupAvatar = {
        url: avatarFile.path,
        publicId: avatarFile.filename,
    };

    await group.save();

    try {
        const io = getIO();
        if (io) {
            io.to(group._id.toString()).emit("chat_updated", {
                chatId: group._id.toString(),
                groupAvatar: group.groupAvatar,
            });
        }
    } catch (err) {
        console.error("Socket error:", err);
    }

    res.status(200).json({
        message: "Group icon updated",
        group,
    });
});

// Add Members to Group
export const addGroupMembers = TryCatch(async (req: AuthenticateRequest, res) => {
    const userId = req.user?._id;
    const { chatId } = req.params;
    let { users } = req.body;

    if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    const group = await Chat.findOne({ _id: chatId, isGroup: true });
    if (!group) {
        res.status(404).json({ message: "Group not found" });
        return;
    }

    const isAdmin = (group.groupAdmins || []).includes(userId.toString());
    if (!isAdmin) {
        res.status(403).json({ message: "Only group admins can add participants" });
        return;
    }

    let newMemberIds: string[] = [];
    if (typeof users === "string") {
        try {
            newMemberIds = JSON.parse(users);
        } catch {
            newMemberIds = [users];
        }
    } else if (Array.isArray(users)) {
        newMemberIds = users.map((u: string) => u.toString());
    }

    const existingUsers = new Set(group.users.map((u) => u.toString()));
    newMemberIds.forEach((id) => existingUsers.add(id));

    group.users = Array.from(existingUsers);
    await group.save();

    // System message
    const addMsg = await Messages.create({
        chatId: group._id,
        sender: userId.toString(),
        text: `New participants added to the group`,
        messageType: "text",
    });

    try {
        const io = getIO();
        if (io) {
            group.users.forEach((mId) => {
                io.to(`user:${mId}`).emit("chat_updated", { chatId: group._id.toString() });
                io.to(`user:${mId}`).emit("receive_message", addMsg);
            });
        }
    } catch (err) {
        console.error("Socket error:", err);
    }

    res.status(200).json({
        message: "Members added successfully",
        group,
    });
});

// Remove Member from Group
export const removeGroupMember = TryCatch(async (req: AuthenticateRequest, res) => {
    const userId = req.user?._id;
    const { chatId } = req.params;
    const { memberId } = req.body;

    if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    const group = await Chat.findOne({ _id: chatId, isGroup: true });
    if (!group) {
        res.status(404).json({ message: "Group not found" });
        return;
    }

    const isAdmin = (group.groupAdmins || []).includes(userId.toString());
    if (!isAdmin && userId.toString() !== memberId.toString()) {
        res.status(403).json({ message: "Only group admins can remove participants" });
        return;
    }

    group.users = group.users.filter((id) => id.toString() !== memberId.toString());
    group.groupAdmins = (group.groupAdmins || []).filter((id) => id.toString() !== memberId.toString());

    await group.save();

    try {
        const io = getIO();
        if (io) {
            io.to(`user:${memberId}`).emit("chat_updated", { chatId: group._id.toString(), removed: true });
            group.users.forEach((mId) => {
                io.to(`user:${mId}`).emit("chat_updated", { chatId: group._id.toString() });
            });
        }
    } catch (err) {
        console.error("Socket error:", err);
    }

    res.status(200).json({
        message: "Participant removed",
        group,
    });
});

// Promote Member to Group Admin
export const promoteGroupAdmin = TryCatch(async (req: AuthenticateRequest, res) => {
    const userId = req.user?._id;
    const { chatId } = req.params;
    const { memberId } = req.body;

    if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    const group = await Chat.findOne({ _id: chatId, isGroup: true });
    if (!group) {
        res.status(404).json({ message: "Group not found" });
        return;
    }

    const isAdmin = (group.groupAdmins || []).includes(userId.toString());
    if (!isAdmin) {
        res.status(403).json({ message: "Only group admins can promote other members" });
        return;
    }

    if (!group.users.includes(memberId.toString())) {
        res.status(400).json({ message: "Target user is not a group member" });
        return;
    }

    const admins = new Set(group.groupAdmins || []);
    admins.add(memberId.toString());
    group.groupAdmins = Array.from(admins);

    await group.save();

    try {
        const io = getIO();
        if (io) {
            group.users.forEach((mId) => {
                io.to(`user:${mId}`).emit("chat_updated", { chatId: group._id.toString() });
            });
        }
    } catch (err) {
        console.error("Socket error:", err);
    }

    res.status(200).json({
        message: "User promoted to admin",
        group,
    });
});

// Demote Group Admin
export const demoteGroupAdmin = TryCatch(async (req: AuthenticateRequest, res) => {
    const userId = req.user?._id;
    const { chatId } = req.params;
    const { memberId } = req.body;

    if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    const group = await Chat.findOne({ _id: chatId, isGroup: true });
    if (!group) {
        res.status(404).json({ message: "Group not found" });
        return;
    }

    const isAdmin = (group.groupAdmins || []).includes(userId.toString());
    if (!isAdmin) {
        res.status(403).json({ message: "Only group admins can demote members" });
        return;
    }

    if (group.createdBy && group.createdBy.toString() === memberId.toString()) {
        res.status(400).json({ message: "Group creator cannot be demoted" });
        return;
    }

    group.groupAdmins = (group.groupAdmins || []).filter((id) => id.toString() !== memberId.toString());
    await group.save();

    try {
        const io = getIO();
        if (io) {
            group.users.forEach((mId) => {
                io.to(`user:${mId}`).emit("chat_updated", { chatId: group._id.toString() });
            });
        }
    } catch (err) {
        console.error("Socket error:", err);
    }

    res.status(200).json({
        message: "Admin demoted to participant",
        group,
    });
});

// Leave Group
export const leaveGroup = TryCatch(async (req: AuthenticateRequest, res) => {
    const userId = req.user?._id;
    const { chatId } = req.params;

    if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    const group = await Chat.findOne({ _id: chatId, isGroup: true });
    if (!group) {
        res.status(404).json({ message: "Group not found" });
        return;
    }

    group.users = group.users.filter((id) => id.toString() !== userId.toString());
    group.groupAdmins = (group.groupAdmins || []).filter((id) => id.toString() !== userId.toString());

    // If no admins left and group still has members, promote the first remaining member
    if (group.groupAdmins.length === 0 && group.users.length > 0) {
        const nextAdmin = group.users[0];
        if (nextAdmin) {
            group.groupAdmins = [nextAdmin.toString()];
        }
    }

    await group.save();

    // System message
    const leaveMsg = await Messages.create({
        chatId: group._id,
        sender: userId.toString(),
        text: `A participant left the group`,
        messageType: "text",
    });

    try {
        const io = getIO();
        if (io) {
            group.users.forEach((mId) => {
                io.to(`user:${mId}`).emit("chat_updated", { chatId: group._id.toString() });
                io.to(`user:${mId}`).emit("receive_message", leaveMsg);
            });
            io.to(`user:${userId}`).emit("chat_updated", { chatId: group._id.toString(), left: true });
        }
    } catch (err) {
        console.error("Socket error:", err);
    }

    res.status(200).json({
        message: "You left the group",
    });
});

// Get All Chats (Both 1-on-1 and Groups)
export const getAllChats = TryCatch(async (req: AuthenticateRequest, res) => {
    const userId = req.user?._id;

    if (!userId) {
        res.status(400).json({
            message: "UserId missing",
        });
        return;
    }
    const userStr = userId.toString();
    const chats = await Chat.find({
        $or: [
            { users: userStr },
            { users: new mongoose.Types.ObjectId(userStr) },
        ],
    }).sort({ updatedAt: -1 });

    const chatWithUserData = await Promise.all(
        chats.map(async (chat) => {
            const unseenCount = await Messages.countDocuments({
                chatId: chat._id,
                sender: { $ne: userStr },
                seen: false,
                deletedForEveryone: { $ne: true },
                deletedForUsers: { $ne: userStr },
            });

            // Group Chat Format
            if (chat.isGroup) {
                return {
                    user: {
                        _id: chat._id.toString(),
                        name: chat.groupName || "Group Chat",
                        avatar: chat.groupAvatar?.url ? { url: chat.groupAvatar.url } : undefined,
                        isGroup: true,
                        groupName: chat.groupName,
                        groupDescription: chat.groupDescription,
                        groupAdmins: chat.groupAdmins,
                        createdBy: chat.createdBy,
                        usersCount: chat.users.length,
                    },
                    chat: {
                        ...chat.toObject(),
                        latestMessage: chat.latestMessage,
                        unseenCount,
                    },
                };
            }

            // 1-on-1 Chat Format
            const otherUserId = (chat.users.find((id) => id && id.toString() !== userStr) || userStr).toString();

            if (otherUserId && otherUserId !== userStr) {
                const userData = await fetchUserProfile(otherUserId);
                return {
                    user: userData,
                    chat: {
                        ...chat.toObject(),
                        latestMessage: chat.latestMessage,
                        unseenCount,
                    },
                };
            } else {
                return {
                    user: { _id: userId, name: "Saved Messages (You)" },
                    chat: {
                        ...chat.toObject(),
                        latestMessage: chat.latestMessage,
                        unseenCount,
                    },
                };
            }
        })
    );

    res.json({
        chats: chatWithUserData,
    });
});

// Send Message (1-on-1 and Group Chat Real-Time Dispatch)
export const sendMessage = TryCatch(async (req: AuthenticateRequest, res) => {
    const senderId = req.user?._id;
    const { chatId, text, replyTo, duration } = req.body;
    const mediaFile = req.file;

    if (!senderId) {
        res.status(401).json({
            message: "Unauthorized",
        });
        return;
    }
    if (!chatId) {
        res.status(400).json({
            message: "chatId required",
        });
        return;
    }

    if (!text && !mediaFile) {
        res.status(400).json({
            message: "Either text or media is required",
        });
        return;
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
        res.status(400).json({
            message: "Chat not found",
        });
        return;
    }

    const isUserInChat = chat.users.some(
        (userId) => userId && userId.toString() === senderId.toString()
    );

    if (!isUserInChat) {
        res.status(400).json({
            message: "You are not a participant of this chat",
        });
        return;
    }

    const messageData: any = {
        chatId: chatId,
        sender: senderId,
        seen: false,
        seenAt: null,
        reactions: [],
        deletedForUsers: [],
    };

    if (mediaFile) {
        const isAudio =
            mediaFile.mimetype.startsWith("audio/") ||
            mediaFile.mimetype.includes("audio") ||
            mediaFile.mimetype.includes("webm") ||
            mediaFile.originalname.endsWith(".webm") ||
            mediaFile.originalname.endsWith(".mp3") ||
            mediaFile.originalname.endsWith(".ogg") ||
            mediaFile.originalname.endsWith(".wav");

        if (isAudio) {
            messageData.audio = {
                url: mediaFile.path,
                publicId: mediaFile.filename,
                duration: duration ? Number(duration) : undefined,
            };
            messageData.messageType = "audio";
            messageData.text = text || "";
        } else {
            messageData.image = {
                url: mediaFile.path,
                publicId: mediaFile.filename,
            };
            messageData.messageType = "image";
            messageData.text = text || "";
        }
    } else {
        messageData.text = text;
        messageData.messageType = "text";
    }

    // Attach Quoted / Reply-To Context
    if (replyTo) {
        try {
            messageData.replyTo = typeof replyTo === "string" ? JSON.parse(replyTo) : replyTo;
        } catch (err) {
            console.error("Error parsing replyTo:", err);
        }
    }

    const message = new Messages(messageData);
    const savedMessage = await message.save();

    let latestMessageText = text;
    if (messageData.messageType === "image") {
        latestMessageText = text ? `📷 ${text}` : "📷 Photo";
    } else if (messageData.messageType === "audio") {
        latestMessageText = "🎤 Voice message";
    }

    await Chat.findByIdAndUpdate(chatId, {
        latestMessage: {
            text: latestMessageText,
            sender: senderId,
        },
        updatedAt: new Date(),
    }, { new: true });

    // Real-time socket broadcast to all group members or 1-on-1 recipient
    try {
        const io = getIO();
        if (io) {
            const roomName = chatId.toString();
            io.to(roomName).emit("receive_message", savedMessage);

            // Broadcast to each member's private socket room
            chat.users.forEach((memberId) => {
                io.to(`user:${memberId.toString()}`).emit("receive_message", savedMessage);
                io.to(`user:${memberId.toString()}`).emit("chat_updated", {
                    chatId: roomName,
                    latestMessage: {
                        text: latestMessageText,
                        sender: senderId,
                    },
                });
            });
        }
    } catch (socketError) {
        console.error("Socket emission error:", socketError);
    }

    res.status(201).json({
        message: savedMessage,
        sender: senderId,
    });
});

// Get Messages By Chat (Supports Group Chat Metadata and Members)
export const getMessagesByChat = TryCatch(async (req: AuthenticateRequest, res) => {
    const userId = req.user?._id;
    const { chatId } = req.params;

    if (!userId) {
        res.status(401).json({
            message: "Unauthorized",
        });
        return;
    }

    if (!chatId) {
        res.status(400).json({
            message: "chatId required",
        });
        return;
    }

    const chat = await Chat.findById(chatId);

    if (!chat) {
        res.status(404).json({
            message: "Chat not found",
        });
        return;
    }

    const isUserInChat = chat.users.some(
        (id) => id && id.toString() === userId.toString()
    );

    if (!isUserInChat) {
        res.status(400).json({
            message: "You are not a participant of this chat",
        });
        return;
    }

    const seenAt = new Date();
    await Messages.updateMany({
        chatId: chatId,
        sender: { $ne: userId },
        seen: false,
    }, {
        seen: true,
        seenAt,
    });

    // Emit read receipt update to chat room
    try {
        const io = getIO();
        if (io) {
            io.to(chatId.toString()).emit("messages_seen_update", {
                chatId: chatId.toString(),
                seenBy: userId.toString(),
                seenAt,
            });
        }
    } catch (socketErr) {
        console.error("Socket seen update error:", socketErr);
    }

    // Filter out messages deleted for this user
    const messages = await Messages.find({
        chatId,
        deletedForUsers: { $ne: userId.toString() },
    }).sort({ createdAt: 1 });

    // Group Chat response
    if (chat.isGroup) {
        // Fetch all group member profiles
        const memberProfiles = await Promise.all(
            chat.users.map((mId) => fetchUserProfile(mId))
        );

        res.json({
            messages,
            chat,
            groupUsers: memberProfiles,
            user: {
                _id: chat._id.toString(),
                name: chat.groupName || "Group Chat",
                avatar: chat.groupAvatar?.url ? { url: chat.groupAvatar.url } : undefined,
                isGroup: true,
                groupName: chat.groupName,
                groupDescription: chat.groupDescription,
                groupAdmins: chat.groupAdmins,
                createdBy: chat.createdBy,
                users: memberProfiles,
            },
        });
        return;
    }

    // 1-on-1 Chat response
    const otherUserId = chat.users.find((id) => id && id.toString() !== userId.toString()) || userId;

    if (otherUserId && otherUserId.toString() !== userId.toString()) {
        const userData = await fetchUserProfile(otherUserId);
        res.json({
            messages,
            chat,
            user: userData,
        });
    } else {
        res.json({
            messages,
            chat,
            user: { _id: userId, name: "Saved Messages (You)" },
        });
    }
});

export const reactToMessage = TryCatch(async (req: AuthenticateRequest, res) => {
    const userId = req.user?._id;
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    if (!emoji) {
        res.status(400).json({ message: "Emoji required" });
        return;
    }

    const message = await Messages.findById(messageId);
    if (!message) {
        res.status(404).json({ message: "Message not found" });
        return;
    }

    const reactions = message.reactions ? [...message.reactions] : [];

    const existingReactionIndex = reactions.findIndex(
        (r) => r.userId.toString() === userId.toString()
    );

    if (existingReactionIndex > -1) {
        const targetReaction = reactions[existingReactionIndex];
        if (targetReaction && targetReaction.emoji === emoji) {
            // Toggle off reaction if clicked same emoji
            reactions.splice(existingReactionIndex, 1);
        } else if (targetReaction) {
            // Update to new emoji
            targetReaction.emoji = emoji;
        }
    } else {
        // Add new reaction
        reactions.push({ userId: userId.toString(), emoji });
    }

    message.reactions = reactions;
    await message.save();

    // Broadcast reaction update
    try {
        const io = getIO();
        if (io) {
            io.to(message.chatId.toString()).emit("reaction_updated", {
                messageId: (message._id as any).toString(),
                chatId: message.chatId.toString(),
                reactions: message.reactions,
            });
        }
    } catch (err) {
        console.error("Socket reaction update error:", err);
    }

    res.status(200).json({
        message: "Reaction updated",
        reactions: message.reactions,
    });
});

export const deleteMessage = TryCatch(async (req: AuthenticateRequest, res) => {
    const userId = req.user?._id;
    const { messageId } = req.params;
    const { deleteType } = req.body; // "everyone" | "me"

    if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    const message = await Messages.findById(messageId);
    if (!message) {
        res.status(404).json({ message: "Message not found" });
        return;
    }

    if (deleteType === "everyone") {
        if (message.sender.toString() !== userId.toString()) {
            res.status(403).json({ message: "You can only delete your own messages for everyone" });
            return;
        }

        message.deletedForEveryone = true;
        message.isDeleted = true;
        message.text = "This message was deleted";
        message.image = undefined;
        message.audio = undefined;
        await message.save();

        // Broadcast to all participants in room
        try {
            const io = getIO();
            if (io) {
                io.to(message.chatId.toString()).emit("message_deleted", {
                    messageId: (message._id as any).toString(),
                    chatId: message.chatId.toString(),
                    deleteType: "everyone",
                });
            }
        } catch (err) {
            console.error("Socket delete broadcast error:", err);
        }
    } else {
        // Delete for me
        const deletedForUsers = message.deletedForUsers ? [...message.deletedForUsers] : [];
        if (!deletedForUsers.includes(userId.toString())) {
            deletedForUsers.push(userId.toString());
            message.deletedForUsers = deletedForUsers;
            await message.save();
        }

        // Notify this user's socket
        try {
            const io = getIO();
            if (io) {
                io.to(`user:${userId.toString()}`).emit("message_deleted", {
                    messageId: (message._id as any).toString(),
                    chatId: message.chatId.toString(),
                    deleteType: "me",
                });
            }
        } catch (err) {
            console.error("Socket delete for me error:", err);
        }
    }

    res.status(200).json({ message: "Message deleted" });
});

export const editMessage = TryCatch(async (req: AuthenticateRequest, res) => {
    const userId = req.user?._id;
    const { messageId } = req.params;
    const { text } = req.body;

    if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    if (!text || !text.trim()) {
        res.status(400).json({ message: "Text is required" });
        return;
    }

    const message = await Messages.findById(messageId);
    if (!message) {
        res.status(404).json({ message: "Message not found" });
        return;
    }

    if (message.sender.toString() !== userId.toString()) {
        res.status(403).json({ message: "You can only edit your own messages" });
        return;
    }

    if (message.deletedForEveryone) {
        res.status(400).json({ message: "Cannot edit deleted message" });
        return;
    }

    message.text = text.trim();
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    // Broadcast message edit
    try {
        const io = getIO();
        if (io) {
            io.to(message.chatId.toString()).emit("message_edited", {
                messageId: (message._id as any).toString(),
                chatId: message.chatId.toString(),
                text: message.text,
                isEdited: true,
                editedAt: message.editedAt,
            });
        }
    } catch (err) {
        console.error("Socket edit broadcast error:", err);
    }

    res.status(200).json({
        message: "Message edited",
        updatedMessage: message,
    });
});

// Story Reaction & Reply -> Direct Chat Bridge
export const sendStoryReplyMessage = TryCatch(async (req: AuthenticateRequest, res) => {
    const senderId = req.user?._id;
    if (!senderId) {
        res.status(401).json({ message: "Unauthorized - User required" });
        return;
    }

    const { recipientId, storyId, mediaUrl, mediaType, thumbnailUrl, authorName, reactionEmoji, text } = req.body;

    if (!recipientId || !storyId || !mediaUrl) {
        res.status(400).json({ message: "recipientId, storyId, and mediaUrl are required" });
        return;
    }

    // Find or create 1-on-1 chat
    let chat = await Chat.findOne({
        isGroup: { $ne: true },
        users: { $all: [senderId, recipientId], $size: 2 },
    });

    if (!chat) {
        chat = await Chat.create({
            users: [senderId, recipientId],
            isGroup: false,
        });
    }

    const displayText = reactionEmoji
        ? `${reactionEmoji} ${text ? text.trim() : "Reacted to story"}`
        : (text ? text.trim() : "Replied to story");

    const message = await Messages.create({
        chatId: chat._id,
        sender: senderId,
        text: displayText,
        messageType: "story_reply",
        storyReply: {
            storyId,
            mediaUrl,
            mediaType: mediaType || "image",
            thumbnailUrl,
            authorName,
            reactionEmoji,
        },
        seen: false,
    });

    chat.latestMessage = {
        text: displayText,
        sender: senderId,
    };
    await chat.save();

    // Realtime Socket.IO emission to recipient
    try {
        const io = getIO();
        if (io) {
            io.to(recipientId.toString()).emit("receive_message", {
                message,
                chatId: chat._id.toString(),
            });
            io.to(chat._id.toString()).emit("new_message", {
                message,
                chatId: chat._id.toString(),
            });
        }
    } catch (err) {
        console.error("Socket story reply broadcast error:", err);
    }

    res.status(201).json({
        success: true,
        message: "Story reply routed to chat",
        chatId: chat._id,
        chatMessage: message,
    });
});