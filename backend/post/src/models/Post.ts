import mongoose, { Document, Schema, Types } from "mongoose";

export interface IMediaItem {
    url: string;
    public_id: string;
    type: "image" | "video";
    aspectRatio?: ("1:1" | "4:5" | "16:9" | "9:16") | undefined;
    thumbnailUrl?: string | undefined;
}

export interface IPostView {
    user: Types.ObjectId;
    viewedAt: Date;
}

export interface IPost extends Document {
    _id: Types.ObjectId;
    author: Types.ObjectId;
    type: "image" | "carousel" | "video" | "reel";
    media: IMediaItem[];
    caption: string;
    tags: string[];
    location?: string | undefined;
    likes: Types.ObjectId[];
    likesCount: number;
    views: IPostView[];
    viewsCount: number;
    commentsCount: number;
    isCommentsDisabled: boolean;
    isArchived: boolean;
    isReported: boolean;
    reportCount: number;
    reports: {
        reporter: Types.ObjectId;
        reason: string;
        reportedAt: Date;
    }[];
    createdAt: Date;
    updatedAt: Date;
}

const MediaItemSchema = new Schema<IMediaItem>(
    {
        url: { type: String, required: true },
        public_id: { type: String, required: true },
        type: { type: String, enum: ["image", "video"], required: true },
        aspectRatio: {
            type: String,
            enum: ["1:1", "4:5", "16:9", "9:16"],
            default: "1:1",
        },
        thumbnailUrl: { type: String },
    },
    { _id: false }
);

const PostViewSchema = new Schema<IPostView>(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        viewedAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const PostSchema = new Schema<IPost>(
    {
        author: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: ["image", "carousel", "video", "reel"],
            default: "image",
            required: true,
        },
        media: {
            type: [MediaItemSchema],
            required: true,
            validate: [
                (val: IMediaItem[]) => val.length > 0 && val.length <= 10,
                "Post must contain between 1 and 10 media items",
            ],
        },
        caption: {
            type: String,
            maxlength: 2200,
            default: "",
            trim: true,
        },
        tags: {
            type: [String],
            default: [],
            index: true,
        },
        location: {
            type: String,
            trim: true,
            default: "",
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
        views: {
            type: [PostViewSchema],
            default: [],
        },
        viewsCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        commentsCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        isCommentsDisabled: {
            type: Boolean,
            default: false,
        },
        isArchived: {
            type: Boolean,
            default: false,
        },
        isReported: {
            type: Boolean,
            default: false,
            index: true,
        },
        reportCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        reports: [
            {
                reporter: { type: Schema.Types.ObjectId, ref: "User" },
                reason: { type: String, default: "Inappropriate Content" },
                reportedAt: { type: Date, default: Date.now },
            },
        ],
    },
    {
        timestamps: true,
    }
);

// Compound Indexing for High-Performance Social Feed, Creator Profiles, and Explore Search
PostSchema.index({ author: 1, createdAt: -1 });
PostSchema.index({ createdAt: -1 });
PostSchema.index({ tags: 1, createdAt: -1 });
PostSchema.index({ type: 1, createdAt: -1 });
PostSchema.index({ "views.user": 1 });

export const Post = mongoose.model<IPost>("Post", PostSchema);
