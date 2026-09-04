import mongoose, { Document, Schema, Types } from "mongoose";

export interface IStoryViewer {
    user: Types.ObjectId;
    viewedAt: Date;
    reactionEmoji?: string | undefined;
}

export interface IStoryMedia {
    url: string;
    public_id: string;
    type: "image" | "video";
    thumbnailUrl?: string | undefined;
    duration?: number | undefined; // In seconds (max 60s)
}

export interface IStory extends Document {
    _id: Types.ObjectId;
    author: Types.ObjectId;
    media: IStoryMedia;
    caption?: string | undefined;
    viewers: IStoryViewer[];
    viewsCount: number;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const StoryMediaSchema = new Schema<IStoryMedia>(
    {
        url: { type: String, required: true },
        public_id: { type: String, required: true },
        type: { type: String, enum: ["image", "video"], default: "image", required: true },
        thumbnailUrl: { type: String },
        duration: { type: Number, default: 5 },
    },
    { _id: false }
);

const StoryViewerSchema = new Schema<IStoryViewer>(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        viewedAt: { type: Date, default: Date.now },
        reactionEmoji: { type: String },
    },
    { _id: false }
);

const StorySchema = new Schema<IStory>(
    {
        author: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        media: {
            type: StoryMediaSchema,
            required: true,
        },
        caption: {
            type: String,
            maxlength: 500,
            default: "",
            trim: true,
        },
        viewers: {
            type: [StoryViewerSchema],
            default: [],
        },
        viewsCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: { expires: "0s" }, // Automatic MongoDB TTL index for exact 24-hour expiration
        },
    },
    {
        timestamps: true,
    }
);

// Compound indexes for active 24h stories queries
StorySchema.index({ author: 1, createdAt: -1 });
StorySchema.index({ expiresAt: 1 });

export const Story = mongoose.model<IStory>("Story", StorySchema);
