import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
    name: string;
    email: string;
    about?: string;
    avatar?: {
        url: string;
        publicId?: string;
    };
    role: "user" | "admin" | "super_admin" | "moderator";
    theme: "system" | "dark" | "light";
    isBanned: boolean;
    bannedReason?: string;
    isVerified: boolean;
    authProvider?: "email" | "google";
    googleId?: string;
    createdAt: Date;
    updatedAt: Date;
}

const schema: Schema<IUser> = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    about: {
        type: String,
        default: "Hey there! I am using Have-it.",
        trim: true,
    },
    avatar: {
        url: {
            type: String,
            default: "",
        },
        publicId: {
            type: String,
        },
    },
    role: {
        type: String,
        enum: ["user", "admin", "super_admin", "moderator"],
        default: "user",
    },
    theme: {
        type: String,
        enum: ["system", "dark", "light"],
        default: "system",
    },
    isBanned: {
        type: Boolean,
        default: false,
    },
    bannedReason: {
        type: String,
        default: "",
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    authProvider: {
        type: String,
        enum: ["email", "google"],
        default: "email",
    },
    googleId: {
        type: String,
        default: "",
    },
}, {
    timestamps: true,
});

export const User = mongoose.model<IUser>("User", schema);