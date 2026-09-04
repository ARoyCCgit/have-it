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
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "all";
    const status = searchParams.get("status") || "all";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);
    const skip = (page - 1) * limit;

    // Build Mongo Query Filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};

    if (search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { email: { $regex: search.trim(), $options: "i" } },
      ];
    }

    if (role !== "all") {
      filter.role = role;
    }

    if (status === "verified") {
      filter.isVerified = true;
    } else if (status === "banned") {
      filter.isBanned = true;
    } else if (status === "active") {
      filter.isBanned = { $ne: true };
    }

    const [users, total] = await Promise.all([
      db
        .collection("users")
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("users").countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      users,
      total,
      totalPages: Math.ceil(total / limit),
      page,
      limit,
    });
  } catch (error) {
    console.error("Failed to fetch users directory:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error fetching users directory" },
      { status: 500 }
    );
  }
}
