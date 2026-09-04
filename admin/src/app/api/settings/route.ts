import { NextRequest, NextResponse } from "next/server";
import { connectAdminDB } from "@/lib/db";

export const dynamic = "force-dynamic";

const DEFAULT_CONFIG = {
  maintenanceMode: false,
  maintenanceMessage: "Have-it is currently undergoing scheduled infrastructure upgrades. We will be back online shortly.",
  enableCalling: true,
  enableReels: true,
  enableStories: true,
  maxMediaUploadMb: 50,
  maxOtpPerHour: 5,
};

export async function GET() {
  try {
    const mongooseInstance = await connectAdminDB();
    const db = mongooseInstance.connection.db;

    if (!db) {
      return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });
    }

    let config = await db.collection("system_configs").findOne({});

    if (!config) {
      const newConfig = {
        ...DEFAULT_CONFIG,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const res = await db.collection("system_configs").insertOne(newConfig);
      config = { _id: res.insertedId, ...newConfig };
    }

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error("Failed to fetch system config:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch system config" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      maintenanceMode,
      maintenanceMessage,
      enableCalling,
      enableReels,
      enableStories,
      maxMediaUploadMb,
      maxOtpPerHour,
    } = body;

    const mongooseInstance = await connectAdminDB();
    const db = mongooseInstance.connection.db;

    if (!db) {
      return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateFields: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (typeof maintenanceMode === "boolean") updateFields.maintenanceMode = maintenanceMode;
    if (typeof maintenanceMessage === "string" && maintenanceMessage.trim()) updateFields.maintenanceMessage = maintenanceMessage.trim();
    if (typeof enableCalling === "boolean") updateFields.enableCalling = enableCalling;
    if (typeof enableReels === "boolean") updateFields.enableReels = enableReels;
    if (typeof enableStories === "boolean") updateFields.enableStories = enableStories;
    if (typeof maxMediaUploadMb === "number") updateFields.maxMediaUploadMb = maxMediaUploadMb;
    if (typeof maxOtpPerHour === "number") updateFields.maxOtpPerHour = maxOtpPerHour;

    const result = await db.collection("system_configs").findOneAndUpdate(
      {},
      { $set: updateFields },
      { upsert: true, returnDocument: "after" }
    );

    return NextResponse.json({
      success: true,
      message: "Platform settings and feature flags updated successfully",
      config: result,
    });
  } catch (error) {
    console.error("Failed to update system config:", error);
    return NextResponse.json({ success: false, error: "Failed to update platform settings" }, { status: 500 });
  }
}
