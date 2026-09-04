import { NextRequest, NextResponse } from "next/server";
import { connectAdminDB } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await context.params;

    if (!ObjectId.isValid(postId)) {
      return NextResponse.json({ success: false, error: "Invalid Post ID format" }, { status: 400 });
    }

    const mongooseInstance = await connectAdminDB();
    const db = mongooseInstance.connection.db;

    if (!db) {
      return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });
    }

    const postObjId = new ObjectId(postId);

    // 1. Delete post
    const post = await db.collection("posts").findOneAndDelete({ _id: postObjId });

    if (!post) {
      return NextResponse.json({ success: false, error: "Post not found or already deleted" }, { status: 404 });
    }

    // 2. Cascade delete comments and bookmarks associated with this post
    await Promise.all([
      db.collection("comments").deleteMany({ post: postObjId }).catch(() => null),
      db.collection("bookmarks").deleteMany({ post: postObjId }).catch(() => null),
    ]);

    return NextResponse.json({
      success: true,
      message: "Post and associated discussions purged successfully from platform",
      deletedPostId: postId,
    });
  } catch (error) {
    console.error("Error executing atomic post takedown:", error);
    return NextResponse.json(
      { success: false, error: "Failed to purge post from system" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await context.params;

    if (!ObjectId.isValid(postId)) {
      return NextResponse.json({ success: false, error: "Invalid Post ID format" }, { status: 400 });
    }

    const mongooseInstance = await connectAdminDB();
    const db = mongooseInstance.connection.db;

    if (!db) {
      return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });
    }

    // Dismiss reports
    const result = await db.collection("posts").findOneAndUpdate(
      { _id: new ObjectId(postId) },
      {
        $set: {
          isReported: false,
          reportCount: 0,
          reports: [],
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Reports dismissed. Post marked as safe.",
      post: result,
    });
  } catch (error) {
    console.error("Error dismissing post report:", error);
    return NextResponse.json(
      { success: false, error: "Failed to dismiss report" },
      { status: 500 }
    );
  }
}
