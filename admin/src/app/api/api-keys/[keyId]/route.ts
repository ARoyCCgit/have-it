import { NextRequest, NextResponse } from "next/server";
import { connectAdminDB } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ keyId: string }> }
) {
  try {
    const { keyId } = await context.params;

    if (!ObjectId.isValid(keyId)) {
      return NextResponse.json({ success: false, error: "Invalid API Key ID" }, { status: 400 });
    }

    const mongooseInstance = await connectAdminDB();
    const db = mongooseInstance.connection.db;

    if (!db) {
      return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });
    }

    const result = await db.collection("api_keys").deleteOne({ _id: new ObjectId(keyId) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: "API key not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "API key revoked and deleted" });
  } catch (error) {
    console.error("Error deleting API key:", error);
    return NextResponse.json({ success: false, error: "Failed to revoke API key" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ keyId: string }> }
) {
  try {
    const { keyId } = await context.params;

    if (!ObjectId.isValid(keyId)) {
      return NextResponse.json({ success: false, error: "Invalid API Key ID" }, { status: 400 });
    }

    const body = await req.json();
    const { isActive } = body;

    const mongooseInstance = await connectAdminDB();
    const db = mongooseInstance.connection.db;

    if (!db) {
      return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });
    }

    const result = await db.collection("api_keys").findOneAndUpdate(
      { _id: new ObjectId(keyId) },
      { $set: { isActive: Boolean(isActive), updatedAt: new Date() } },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ success: false, error: "API key not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, key: result });
  } catch (error) {
    console.error("Error updating API key status:", error);
    return NextResponse.json({ success: false, error: "Failed to update API key" }, { status: 500 });
  }
}
