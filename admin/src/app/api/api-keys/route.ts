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

    const keys = await db
      .collection("api_keys")
      .find({})
      .project({ keyHash: 0 }) // Never leak the hash
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ success: true, keys });
  } catch (error) {
    console.error("Failed to fetch API keys:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch API keys" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, permissions } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ success: false, error: "Key name is required" }, { status: 400 });
    }

    const mongooseInstance = await connectAdminDB();
    const db = mongooseInstance.connection.db;

    if (!db) {
      return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });
    }

    // Generate Bearer token: haveit_live_ + 24 bytes hex (48 hex chars)
    const randomBytes = crypto.randomBytes(24).toString("hex");
    const rawKey = `haveit_live_${randomBytes}`;

    // SHA-256 hash for secure storage
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

    // Masked prefix for identification
    const prefix = `haveit_live_${randomBytes.slice(0, 6)}...${randomBytes.slice(-4)}`;

    const newKeyRecord = {
      name: name.trim(),
      keyHash,
      prefix,
      permissions: Array.isArray(permissions) && permissions.length > 0 ? permissions : ["messages:send", "users:read", "webhooks"],
      isActive: true,
      lastUsedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("api_keys").insertOne(newKeyRecord);

    return NextResponse.json({
      success: true,
      rawKey, // Exposed once at generation time
      key: {
        _id: result.insertedId,
        name: newKeyRecord.name,
        prefix: newKeyRecord.prefix,
        permissions: newKeyRecord.permissions,
        isActive: newKeyRecord.isActive,
        createdAt: newKeyRecord.createdAt,
      },
    });
  } catch (error) {
    console.error("Failed to create API key:", error);
    return NextResponse.json({ success: false, error: "Failed to generate API key" }, { status: 500 });
  }
}
