import { NextRequest, NextResponse } from "next/server";
import { connectAdminDB } from "@/lib/db";
import { ObjectId } from "mongodb";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate Bearer API Key
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer haveit_live_")) {
      return NextResponse.json(
        {
          error: {
            message: "Invalid OAuth access token - Cannot parse access token. Expected 'Bearer haveit_live_...'",
            type: "OAuthException",
            code: 190,
            fbtrace_id: crypto.randomBytes(8).toString("hex"),
          },
        },
        { status: 401 }
      );
    }

    const rawToken = authHeader.replace("Bearer ", "").trim();
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const mongooseInstance = await connectAdminDB();
    const db = mongooseInstance.connection.db;

    if (!db) {
      return NextResponse.json(
        { error: { message: "Internal server database error", type: "InternalServerError", code: 500 } },
        { status: 500 }
      );
    }

    // Verify key in MongoDB
    const apiKey = await db.collection("api_keys").findOneAndUpdate(
      { keyHash: tokenHash, isActive: true },
      { $set: { lastUsedAt: new Date() } }
    );

    if (!apiKey) {
      return NextResponse.json(
        {
          error: {
            message: "The access token provided has expired, been revoked, or is invalid.",
            type: "OAuthException",
            code: 190,
            error_subcode: 463,
          },
        },
        { status: 401 }
      );
    }

    // 2. Parse WhatsApp Cloud API Request Payload
    const body = await req.json();
    const { to, type = "text", text } = body;

    if (!to || !text || !text.body) {
      return NextResponse.json(
        {
          error: {
            message: "Param 'to' and 'text.body' are required in request body.",
            type: "InvalidParameterException",
            code: 100,
          },
        },
        { status: 400 }
      );
    }

    // 3. Resolve recipient user
    let recipient = null;
    if (ObjectId.isValid(to)) {
      recipient = await db.collection("users").findOne({ _id: new ObjectId(to) });
    }
    if (!recipient) {
      recipient = await db.collection("users").findOne({ email: to.toLowerCase().trim() });
    }

    if (!recipient) {
      return NextResponse.json(
        {
          error: {
            message: `Recipient user '${to}' not found on Have-it network.`,
            type: "UserNotFoundException",
            code: 100,
          },
        },
        { status: 404 }
      );
    }

    // 4. Resolve sender (Admin or Have-it System Bot)
    const adminSender = await db.collection("users").findOne({ role: "super_admin" });
    const senderId = adminSender?._id || new ObjectId();
    const sIdStr = String(senderId);
    const rIdStr = String(recipient._id);

    // 5. Find or create 1-on-1 Chat
    let chat = await db.collection("chats").findOne({
      isGroup: false,
      $or: [
        { users: { $all: [sIdStr, rIdStr] } },
        { users: { $all: [senderId, recipient._id] } },
      ],
    });

    if (!chat) {
      const newChat = {
        users: [sIdStr, rIdStr],
        isGroup: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const chatRes = await db.collection("chats").insertOne(newChat);
      chat = { _id: chatRes.insertedId, ...newChat };
    }

    // 6. Insert Message Record
    const messageId = `wamid.${crypto.randomBytes(16).toString("hex")}`;
    const newMessage = {
      chatId: new ObjectId(String(chat._id)),
      sender: sIdStr,
      text: text.body,
      messageType: type,
      seen: false,
      delivered: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const insertedMsg = await db.collection("messages").insertOne(newMessage);

    // Update latestMessage in chat
    await db.collection("chats").updateOne(
      { _id: chat._id },
      {
        $set: {
          latestMessage: {
            text: text.body,
            sender: sIdStr,
            createdAt: new Date(),
          },
          updatedAt: new Date(),
        },
      }
    );

    // 7. Return WhatsApp Cloud API Standard Success Response
    return NextResponse.json({
      messaging_product: "haveit",
      contacts: [
        {
          input: to,
          wa_id: String(recipient._id),
        },
      ],
      messages: [
        {
          id: messageId,
          message_status: "accepted",
          internal_id: String(insertedMsg.insertedId),
        },
      ],
    });
  } catch (error) {
    console.error("Cloud API Message Dispatch error:", error);
    return NextResponse.json(
      {
        error: {
          message: "Internal server error dispatching Cloud API message.",
          type: "InternalServerError",
          code: 500,
        },
      },
      { status: 500 }
    );
  }
}
