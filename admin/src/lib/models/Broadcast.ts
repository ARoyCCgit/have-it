import mongoose, { Schema, Document, Types } from "mongoose";

export interface IBroadcast extends Document {
  title: string;
  body: string;
  imageUrl?: string;
  buttonLabel?: string;
  buttonUrl?: string;
  targetAudience: "all" | "active" | "admins";
  sentCount: number;
  sentBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BroadcastSchema = new Schema<IBroadcast>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    buttonLabel: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    buttonUrl: {
      type: String,
      trim: true,
    },
    targetAudience: {
      type: String,
      enum: ["all", "active", "admins"],
      default: "all",
    },
    sentCount: {
      type: Number,
      default: 0,
    },
    sentBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Broadcast = mongoose.models.Broadcast || mongoose.model<IBroadcast>("Broadcast", BroadcastSchema);
export default Broadcast;
