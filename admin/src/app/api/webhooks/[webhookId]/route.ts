import { NextRequest, NextResponse } from "next/server";
import { connectAdminDB } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ webhookId: string }> }
) {
  try {
    const { webhookId } = await context.params;

    if (!ObjectId.isValid(webhookId)) {
      return NextResponse.json({ success: false, error: "Invalid Webhook ID" }, { status: 400 });
    }

    const mongooseInstance = await connectAdminDB();
    const db = mongooseInstance.connection.db;

    if (!db) {
      return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });
    }

    const result = await db.collection("webhooks").deleteOne({ _id: new ObjectId(webhookId) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: "Webhook subscription not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Webhook subscription deleted" });
  } catch (error) {
    console.error("Error deleting webhook:", error);
    return NextResponse.json({ success: false, error: "Failed to delete webhook" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ webhookId: string }> }
) {
  try {
    const { webhookId } = await context.params;

    if (!ObjectId.isValid(webhookId)) {
      return NextResponse.json({ success: false, error: "Invalid Webhook ID" }, { status: 400 });
    }

    const body = await req.json();
    const { isActive, events, name, targetUrl } = body;

    const mongooseInstance = await connectAdminDB();
    const db = mongooseInstance.connection.db;

    if (!db) {
      return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (typeof isActive === "boolean") updates.isActive = isActive;
    if (Array.isArray(events)) updates.events = events;
    if (typeof name === "string" && name.trim()) updates.name = name.trim();
    if (typeof targetUrl === "string" && targetUrl.trim()) updates.targetUrl = targetUrl.trim();

    const result = await db.collection("webhooks").findOneAndUpdate(
      { _id: new ObjectId(webhookId) },
      { $set: updates },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ success: false, error: "Webhook subscription not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, webhook: result });
  } catch (error) {
    console.error("Error updating webhook:", error);
    return NextResponse.json({ success: false, error: "Failed to update webhook" }, { status: 500 });
  }
}
