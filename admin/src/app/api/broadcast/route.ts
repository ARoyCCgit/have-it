import { NextRequest, NextResponse } from "next/server";
import { connectAdminDB } from "@/lib/db";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const mongooseInstance = await connectAdminDB();
    const db = mongooseInstance.connection.db;

    if (!db) {
      return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });
    }

    const broadcasts = await db
      .collection("broadcasts")
      .find({})
      .sort({ createdAt: -1 })
      .limit(30)
      .toArray();

    return NextResponse.json({ success: true, broadcasts });
  } catch (error) {
    console.error("Error fetching broadcasts:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch broadcasts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, textBody, imageUrl, buttonLabel, buttonUrl, targetAudience = "all" } = body;

    if (!title || !title.trim() || !textBody || !textBody.trim()) {
      return NextResponse.json(
        { success: false, error: "Announcement title and body message are required" },
        { status: 400 }
      );
    }

    const mongooseInstance = await connectAdminDB();
    const db = mongooseInstance.connection.db;

    if (!db) {
      return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });
    }

    // 1. Resolve or Create official "Have-it Team" System Account
    let systemAccount = await db.collection("users").findOne({ email: "team@haveit.com" });
    if (!systemAccount) {
      const newSystemUser = {
        name: "Have-it Team",
        email: "team@haveit.com",
        about: "Official Have-it Verified System & Platform Announcements Channel.",
        role: "super_admin",
        theme: "system",
        isVerified: true,
        isBanned: false,
        avatar: {
          url: "/icon.svg",
          publicId: "",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const insertRes = await db.collection("users").insertOne(newSystemUser);
      systemAccount = { _id: insertRes.insertedId, ...newSystemUser };
    }

    const senderId = systemAccount._id;

    // 2. Resolve Target Audience
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userFilter: Record<string, any> = {
      _id: { $ne: senderId },
      isBanned: { $ne: true },
    };

    if (targetAudience === "active") {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      userFilter.updatedAt = { $gte: sevenDaysAgo };
    } else if (targetAudience === "admins") {
      userFilter.role = { $in: ["admin", "super_admin"] };
    }

    const targetUsers = await db
      .collection("users")
      .find(userFilter)
      .project({ _id: 1 })
      .toArray();

    if (targetUsers.length === 0) {
      return NextResponse.json(
        { success: false, error: "No active users match the selected audience filter" },
        { status: 400 }
      );
    }

    // 3. Format Announcement Text Card
    let formattedMessageText = `📢 **${title.trim()}**\n\n${textBody.trim()}`;
    if (buttonUrl && buttonUrl.trim()) {
      const btnText = buttonLabel && buttonLabel.trim() ? buttonLabel.trim() : "View Details";
      formattedMessageText += `\n\n🔗 [${btnText}](${buttonUrl.trim()})`;
    }

    let sentCount = 0;
    const now = new Date();

    // 4. Batch Ingestion into User Threads
    for (const u of targetUsers) {
      const recipientId = u._id;
      const sIdStr = String(senderId);
      const rIdStr = String(recipientId);

      // Find or create 1-on-1 thread with official system account (checking both string and ObjectId formats)
      let chat = await db.collection("chats").findOne({
        isGroup: false,
        $or: [
          { users: { $all: [sIdStr, rIdStr] } },
          { users: { $all: [senderId, recipientId] } },
        ],
      });

      if (!chat) {
        const newChat = {
          users: [sIdStr, rIdStr],
          isGroup: false,
          createdAt: now,
          updatedAt: now,
        };
        const chatRes = await db.collection("chats").insertOne(newChat);
        chat = { _id: chatRes.insertedId, ...newChat };
      } else {
        // Ensure users array is normalized to string IDs
        await db.collection("chats").updateOne(
          { _id: chat._id },
          { $set: { users: [sIdStr, rIdStr] } }
        );
      }

      // Insert message
      await db.collection("messages").insertOne({
        chatId: new ObjectId(String(chat._id)),
        sender: sIdStr,
        text: formattedMessageText,
        messageType: imageUrl && imageUrl.trim() ? "image" : "text",
        image: imageUrl && imageUrl.trim() ? { url: imageUrl.trim(), publicId: "" } : undefined,
        seen: false,
        delivered: true,
        isAnnouncement: true,
        createdAt: now,
        updatedAt: now,
      });

      // Update latest message in chat
      await db.collection("chats").updateOne(
        { _id: chat._id },
        {
          $set: {
            latestMessage: {
              text: `📢 ${title.trim()}`,
              sender: sIdStr,
              createdAt: now,
            },
            updatedAt: now,
          },
        }
      );

      sentCount++;
    }

    // 5. Store Broadcast Record
    const broadcastRecord = {
      title: title.trim(),
      body: textBody.trim(),
      imageUrl: imageUrl && imageUrl.trim() ? imageUrl.trim() : undefined,
      buttonLabel: buttonLabel && buttonLabel.trim() ? buttonLabel.trim() : undefined,
      buttonUrl: buttonUrl && buttonUrl.trim() ? buttonUrl.trim() : undefined,
      targetAudience,
      sentCount,
      sentBy: senderId,
      createdAt: now,
      updatedAt: now,
    };

    const broadcastRes = await db.collection("broadcasts").insertOne(broadcastRecord);

    return NextResponse.json({
      success: true,
      broadcastId: broadcastRes.insertedId,
      sentCount,
      message: `Announcement successfully broadcast to ${sentCount} users from the official Have-it Team! 📢`,
    });
  } catch (error) {
    console.error("Error creating mass broadcast:", error);
    return NextResponse.json({ success: false, error: "Failed to dispatch platform announcement" }, { status: 500 });
  }
}
