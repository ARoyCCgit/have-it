import mongoose, { Document, Schema, Types } from "mongoose";

export interface IChat extends Document {
    _id: Types.ObjectId;
    users: string[];
    isGroup?: boolean;
    groupName?: string;
    groupDescription?: string;
    groupAvatar?: {
        url?: string;
        publicId?: string;
    };
    groupAdmins?: string[];
    createdBy?: string;
    latestMessage?: {
        text: string;
        sender: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

const schema: Schema<IChat> = new Schema({
    users: [{ type: String, required: true }],
    isGroup: {
        type: Boolean,
        default: false,
    },
    groupName: {
        type: String,
        trim: true,
    },
    groupDescription: {
        type: String,
        trim: true,
        default: "",
    },
    groupAvatar: {
        url: { type: String, default: "" },
        publicId: { type: String, default: "" },
    },
    groupAdmins: [{
        type: String,
    }],
    createdBy: {
        type: String,
    },
    latestMessage: {
        text: String,
        sender: String,
    },
}, {
    timestamps: true,
});

export const Chat = mongoose.model<IChat>("Chat", schema);