import mongoose, { Document, Schema, Types } from "mongoose";

export interface IBookmark extends Document {
    _id: Types.ObjectId;
    user: Types.ObjectId;
    post: Types.ObjectId;
    collectionName: string;
    createdAt: Date;
    updatedAt: Date;
}

const BookmarkSchema = new Schema<IBookmark>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        post: {
            type: Schema.Types.ObjectId,
            ref: "Post",
            required: true,
            index: true,
        },
        collectionName: {
            type: String,
            default: "All Posts",
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

// One bookmark per post per user, with quick index for saved collection queries
BookmarkSchema.index({ user: 1, post: 1 }, { unique: true });
BookmarkSchema.index({ user: 1, createdAt: -1 });

export const Bookmark = mongoose.model<IBookmark>("Bookmark", BookmarkSchema);
