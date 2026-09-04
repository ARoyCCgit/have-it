import { NextRequest, NextResponse } from "next/server";
import { connectAdminDB } from "@/lib/db";
import { ObjectId } from "mongodb";
import crypto from "crypto";
import axios from "axios";

export async function POST(
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

    const webhook = await db.collection("webhooks").findOne({ _id: new ObjectId(webhookId) });

    if (!webhook) {
      return NextResponse.json({ success: false, error: "Webhook subscription not found" }, { status: 404 });
    }

    // Official WhatsApp Cloud API standard mock payload
    const testPayload = {
      object: "haveit_business_account",
      entry: [
        {
          id: "haveit_enterprise_01",
          time: Math.floor(Date.now() / 1000),
          changes: [
            {
              value: {
                messaging_product: "haveit",
                metadata: {
                  display_phone_number: "+1 555-0199",
                  phone_number_id: "100987654321",
                },
                contacts: [
                  {
                    profile: { name: "Arnab Roy (Have-it Super Admin)" },
                    wa_id: "user_6a85b030c6b07ecd7f880557",
                  },
                ],
                messages: [
                  {
                    from: "user_6a85b030c6b07ecd7f880557",
                    id: `wamid.${crypto.randomBytes(16).toString("hex")}`,
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    text: { body: "⚡ Live Webhook Ping Test from Have-it Cloud API Studio" },
                    type: "text",
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };

    const payloadString = JSON.stringify(testPayload);
    const signature = `sha256=${crypto.createHmac("sha256", webhook.secret).update(payloadString).digest("hex")}`;

    const startTime = Date.now();
    let deliveryStatus = 0;
    let responseBody = "";
    let isSuccess = false;

    try {
      const response = await axios.post(webhook.targetUrl, testPayload, {
        headers: {
          "Content-Type": "application/json",
          "x-haveit-signature-256": signature,
          "User-Agent": "HaveIt-Webhook-Engine/1.0",
        },
        timeout: 6000,
      });

      deliveryStatus = response.status;
      responseBody = typeof response.data === "object" ? JSON.stringify(response.data) : String(response.data);
      isSuccess = deliveryStatus >= 200 && deliveryStatus < 300;
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: unknown }; message?: string };
      deliveryStatus = axiosErr.response?.status || 504;
      responseBody = axiosErr.response?.data
        ? (typeof axiosErr.response.data === "object" ? JSON.stringify(axiosErr.response.data) : String(axiosErr.response.data))
        : axiosErr.message || "Connection timed out or refused";
    }

    const latencyMs = Date.now() - startTime;

    // Update webhook health record in MongoDB
    await db.collection("webhooks").updateOne(
      { _id: new ObjectId(webhookId) },
      {
        $set: {
          lastDeliveryStatus: deliveryStatus,
          lastDeliveryAt: new Date(),
          lastDeliveryLatencyMs: latencyMs,
          lastDeliveryResponse: responseBody.slice(0, 500),
          updatedAt: new Date(),
        },
        $inc: {
          failureCount: isSuccess ? 0 : 1,
        },
      }
    );

    return NextResponse.json({
      success: true,
      delivered: isSuccess,
      status: deliveryStatus,
      latencyMs,
      targetUrl: webhook.targetUrl,
      signatureSent: signature,
      payload: testPayload,
      responseBody,
    });
  } catch (error) {
    console.error("Error dispatching test webhook:", error);
    return NextResponse.json({ success: false, error: "Failed to dispatch test webhook" }, { status: 500 });
  }
}
