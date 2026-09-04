import mongoose, { Document, Schema, Types } from "mongoose";

export interface IComment extends Document {
    _id: Types.ObjectId;
    post: Types.ObjectId;
    author: Types.ObjectId;
    text: string;
    parentComment?: Types.ObjectId | null | undefined; // For nested replies
    likes: Types.ObjectId[];
    likesCount: number;
    repliesCount: number;
    isEdited: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
    {
        post: {
            type: Schema.Types.ObjectId,
            ref: "Post",
            required: true,
            index: true,
        },
        author: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        text: {
            type: String,
            required: true,
            maxlength: 1000,
            trim: true,
        },
        parentComment: {
            type: Schema.Types.ObjectId,
            ref: "Comment",
            default: null,
            index: true,
        },
        likes: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        likesCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        repliesCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        isEdited: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for fast chronological comment loading and threaded hierarchy
CommentSchema.index({ post: 1, parentComment: 1, createdAt: 1 });
CommentSchema.index({ author: 1, createdAt: -1 });

export const Comment = mongoose.model<IComment>("Comment", CommentSchema);
