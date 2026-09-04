import mongoose, { Schema, Document } from "mongoose";

export type WebhookEvent = "messages" | "message_status" | "calls" | "user_status";

export interface IWebhook extends Document {
  name: string;
  targetUrl: string;
  secret: string;
  events: WebhookEvent[];
  isActive: boolean;
  failureCount: number;
  lastDeliveryStatus?: number;
  lastDeliveryAt?: Date;
  lastDeliveryLatencyMs?: number;
  lastDeliveryResponse?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookSchema = new Schema<IWebhook>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    targetUrl: {
      type: String,
      required: true,
      trim: true,
    },
    secret: {
      type: String,
      required: true,
    },
    events: {
      type: [String],
      enum: ["messages", "message_status", "calls", "user_status"],
      default: ["messages", "message_status"],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    failureCount: {
      type: Number,
      default: 0,
    },
    lastDeliveryStatus: {
      type: Number,
    },
    lastDeliveryAt: {
      type: Date,
    },
    lastDeliveryLatencyMs: {
      type: Number,
    },
    lastDeliveryResponse: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const Webhook = mongoose.models.Webhook || mongoose.model<IWebhook>("Webhook", WebhookSchema);
export default Webhook;
