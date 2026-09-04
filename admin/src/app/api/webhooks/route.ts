import { NextRequest, NextResponse } from "next/server";
import { connectAdminDB } from "@/lib/db";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const mongooseInstance = await connectAdminDB();
    const db = mongooseInstance.connection.db;

    if (!db) {
      return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });
    }

    const webhooks = await db
      .collection("webhooks")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ success: true, webhooks });
  } catch (error) {
    console.error("Failed to fetch webhooks:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch webhooks" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, targetUrl, events, secret } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ success: false, error: "Webhook name is required" }, { status: 400 });
    }

    if (!targetUrl || typeof targetUrl !== "string" || (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://"))) {
      return NextResponse.json({ success: false, error: "A valid HTTP or HTTPS Target URL is required" }, { status: 400 });
    }

    const mongooseInstance = await connectAdminDB();
    const db = mongooseInstance.connection.db;

    if (!db) {
      return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });
    }

    // Generate or use provided HMAC secret
    const hmacSecret = secret && secret.trim() ? secret.trim() : crypto.randomBytes(24).toString("hex");

    const newWebhook = {
      name: name.trim(),
      targetUrl: targetUrl.trim(),
      secret: hmacSecret,
      events: Array.isArray(events) && events.length > 0 ? events : ["messages", "message_status"],
      isActive: true,
      failureCount: 0,
      lastDeliveryStatus: null,
      lastDeliveryAt: null,
      lastDeliveryLatencyMs: null,
      lastDeliveryResponse: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("webhooks").insertOne(newWebhook);

    return NextResponse.json({
      success: true,
      webhook: {
        _id: result.insertedId,
        ...newWebhook,
      },
    });
  } catch (error) {
    console.error("Failed to register webhook:", error);
    return NextResponse.json({ success: false, error: "Failed to register webhook subscription" }, { status: 500 });
  }
}
