import mongoose, { Document, Schema, Types } from "mongoose";

export type NotificationType =
    | "like_post"
    | "like_comment"
    | "comment"
    | "reply"
    | "follow"
    | "mention"
    | "story_reaction";

export interface INotification extends Document {
    _id: Types.ObjectId;
    recipient: Types.ObjectId;
    sender: Types.ObjectId;
    type: NotificationType;
    post?: Types.ObjectId | undefined;
    comment?: Types.ObjectId | undefined;
    story?: Types.ObjectId | undefined;
    text?: string | undefined;
    isRead: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
    {
        recipient: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        sender: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        type: {
            type: String,
            enum: [
                "like_post",
                "like_comment",
                "comment",
                "reply",
                "follow",
                "mention",
                "story_reaction",
            ],
            required: true,
        },
        post: {
            type: Schema.Types.ObjectId,
            ref: "Post",
            default: null,
        },
        comment: {
            type: Schema.Types.ObjectId,
            ref: "Comment",
            default: null,
        },
        story: {
            type: Schema.Types.ObjectId,
            ref: "Story",
            default: null,
        },
        text: {
            type: String,
            default: "",
            trim: true,
        },
        isRead: {
            type: Boolean,
            default: false,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for fast chronological inbox retrieval and unread badges
NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, isRead: 1 });

export const Notification = mongoose.model<INotification>("Notification", NotificationSchema);
