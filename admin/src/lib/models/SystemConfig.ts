import mongoose, { Schema, Document } from "mongoose";

export interface ISystemConfig extends Document {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  enableCalling: boolean;
  enableReels: boolean;
  enableStories: boolean;
  maxMediaUploadMb: number;
  maxOtpPerHour: number;
  updatedBy?: string;
  updatedAt: Date;
}

const SystemConfigSchema = new Schema<ISystemConfig>(
  {
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    maintenanceMessage: {
      type: String,
      default: "Have-it is currently undergoing scheduled infrastructure upgrades. We will be back online shortly.",
    },
    enableCalling: {
      type: Boolean,
      default: true,
    },
    enableReels: {
      type: Boolean,
      default: true,
    },
    enableStories: {
      type: Boolean,
      default: true,
    },
    maxMediaUploadMb: {
      type: Number,
      default: 50,
      min: 5,
      max: 500,
    },
    maxOtpPerHour: {
      type: Number,
      default: 5,
      min: 1,
      max: 50,
    },
    updatedBy: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const SystemConfig =
  mongoose.models.SystemConfig ||
  mongoose.model<ISystemConfig>("SystemConfig", SystemConfigSchema);
export default SystemConfig;
