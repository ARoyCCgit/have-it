import { NextRequest, NextResponse } from "next/server";
import { connectAdminDB } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const mongooseInstance = await connectAdminDB();
    const db = mongooseInstance.connection.db;

    if (!db) {
      return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const filterType = searchParams.get("filter") || "all"; // "reported" | "all"

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = {};
    if (filterType === "reported") {
      query.isReported = true;
    }

    // Join with Users collection to get Author profile
    const posts = await db
      .collection("posts")
      .aggregate([
        { $match: query },
        { $sort: { isReported: -1, createdAt: -1 } },
        { $limit: 50 },
        {
          $lookup: {
            from: "users",
            localField: "author",
            foreignField: "_id",
            as: "authorDetails",
          },
        },
        {
          $unwind: {
            path: "$authorDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            type: 1,
            media: 1,
            caption: 1,
            tags: 1,
            likesCount: 1,
            commentsCount: 1,
            viewsCount: 1,
            isReported: 1,
            reportCount: 1,
            reports: 1,
            createdAt: 1,
            author: {
              _id: "$authorDetails._id",
              name: "$authorDetails.name",
              email: "$authorDetails.email",
              avatar: "$authorDetails.avatar",
              role: "$authorDetails.role",
              isVerified: "$authorDetails.isVerified",
              isBanned: "$authorDetails.isBanned",
            },
          },
        },
      ])
      .toArray();

    return NextResponse.json({
      success: true,
      posts,
      count: posts.length,
    });
  } catch (error) {
    console.error("Failed to fetch moderation queue:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error fetching moderation queue" },
      { status: 500 }
    );
  }
}
