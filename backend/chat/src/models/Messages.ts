import mongoose, { Document, Schema, Types } from "mongoose";
import { Chat } from "./Chat.js";

export interface IReaction {
    userId: string;
    emoji: string;
}

export interface IReplyTo {
    messageId: string;
    senderId: string;
    senderName: string;
    text?: string;
    messageType: string;
    imageUrl?: string;
}

export interface IStoryReply {
    storyId: string;
    mediaUrl: string;
    mediaType: "image" | "video";
    thumbnailUrl?: string;
    authorName?: string;
    reactionEmoji?: string;
}

export interface IMessage extends Document {
    chatId: Types.ObjectId;
    sender: string;
    text?: string;
    image?: {
        url: string;
        publicId: string;
    } | undefined;
    audio?: {
        url: string;
        publicId?: string;
        duration?: number;
    } | undefined;
    messageType: "text" | "image" | "audio" | "story_reply";
    replyTo?: IReplyTo;
    storyReply?: IStoryReply;
    reactions?: IReaction[];
    isDeleted?: boolean;
    deletedForEveryone?: boolean;
    deletedForUsers?: string[];
    isEdited?: boolean;
    editedAt?: Date | null;
    seen: boolean;
    seenAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const schema = new Schema<IMessage>({
    chatId: {
        type: Schema.Types.ObjectId,
        ref: Chat,
        required: true,
    },
    sender: {
        type: String,
        required: true,
    },
    text: {
        type: String,
        default: "",
    },
    image: {
        url: String,
        publicId: String,
    },
    audio: {
        url: String,
        publicId: String,
        duration: Number,
    },
    messageType: {
        type: String,
        enum: ["text", "image", "audio", "story_reply"],
        default: "text",
    },
    replyTo: {
        messageId: String,
        senderId: String,
        senderName: String,
        text: String,
        messageType: String,
        imageUrl: String,
    },
    storyReply: {
        storyId: String,
        mediaUrl: String,
        mediaType: { type: String, enum: ["image", "video"], default: "image" },
        thumbnailUrl: String,
        authorName: String,
        reactionEmoji: String,
    },
    reactions: [
        {
            userId: { type: String, required: true },
            emoji: { type: String, required: true },
        },
    ],
    isDeleted: {
        type: Boolean,
        default: false,
    },
    deletedForEveryone: {
        type: Boolean,
        default: false,
    },
    deletedForUsers: {
        type: [String],
        default: [],
    },
    isEdited: {
        type: Boolean,
        default: false,
    },
    editedAt: {
        type: Date,
        default: null,
    },
    seen: {
        type: Boolean,
        default: false,
    },
    seenAt: {
        type: Date,
        default: null,
    },
}, {
    timestamps: true,
});

export const Messages = mongoose.model<IMessage>("Messages", schema);