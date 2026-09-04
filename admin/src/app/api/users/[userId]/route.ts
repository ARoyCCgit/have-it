import { NextRequest, NextResponse } from "next/server";
import { connectAdminDB } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params;

    if (!ObjectId.isValid(userId)) {
      return NextResponse.json({ success: false, error: "Invalid User ID format" }, { status: 400 });
    }

    const body = await req.json();
    const { action, isVerified, isBanned, bannedReason, role } = body;

    const mongooseInstance = await connectAdminDB();
    const db = mongooseInstance.connection.db;

    if (!db) {
      return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateFields: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (action === "toggle_verify") {
      updateFields.isVerified = Boolean(isVerified);
    } else if (action === "toggle_ban") {
      updateFields.isBanned = Boolean(isBanned);
      if (isBanned) {
        updateFields.bannedReason = bannedReason || "Administrative violation of Have-it Community Guidelines";
      } else {
        updateFields.bannedReason = "";
      }
    } else if (action === "change_role") {
      if (!["user", "admin", "super_admin", "moderator"].includes(role)) {
        return NextResponse.json({ success: false, error: "Invalid role specified" }, { status: 400 });
      }
      updateFields.role = role;
    } else {
      return NextResponse.json({ success: false, error: "Unsupported administrative action" }, { status: 400 });
    }

    const result = await db.collection("users").findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $set: updateFields },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "User successfully updated by administrator",
      user: result,
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to execute administrative update on user" },
      { status: 500 }
    );
  }
}
