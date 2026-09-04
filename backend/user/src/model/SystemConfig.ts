import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISystemConfig extends Document {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  enableCalling: boolean;
  enableReels: boolean;
  enableStories: boolean;
  maxMediaUploadMb: number;
  maxOtpPerHour: number;
  updatedAt: Date;
}

const SystemConfigSchema = new Schema<ISystemConfig>(
  {
    maintenanceMode: { type: Boolean, default: false },
    maintenanceMessage: {
      type: String,
      default: "Have-it is currently undergoing scheduled infrastructure upgrades. We will be back online shortly.",
    },
    enableCalling: { type: Boolean, default: true },
    enableReels: { type: Boolean, default: true },
    enableStories: { type: Boolean, default: true },
    maxMediaUploadMb: { type: Number, default: 50 },
    maxOtpPerHour: { type: Number, default: 5 },
  },
  { timestamps: true, collection: "system_configs" }
);

export const SystemConfig: Model<ISystemConfig> =
  (mongoose.models.SystemConfig as Model<ISystemConfig>) ||
  mongoose.model<ISystemConfig>("SystemConfig", SystemConfigSchema);
export default SystemConfig;
