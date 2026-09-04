import mongoose, { Schema, Document } from "mongoose";

export interface IApiKey extends Document {
  name: string;
  keyHash: string;
  prefix: string;
  permissions: string[];
  lastUsedAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySchema = new Schema<IApiKey>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    keyHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    prefix: {
      type: String,
      required: true,
    },
    permissions: {
      type: [String],
      default: ["messages:send", "users:read", "webhooks"],
    },
    lastUsedAt: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const ApiKey = mongoose.models.ApiKey || mongoose.model<IApiKey>("ApiKey", ApiKeySchema);
export default ApiKey;
