import { NextRequest, NextResponse } from "next/server";
import { dbCreateOrder } from "@/lib/db";

const BASE =
  process.env.PAYPAL_ENV === "sandbox"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";

async function getAccessToken(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!;
  const secret = process.env.PAYPAL_CLIENT_SECRET!;
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  const data = await res.json();
  return data.access_token as string;
}

export async function POST(req: NextRequest) {
  try {
    const { paypalOrderId, orderPayload } = await req.json();
    if (!paypalOrderId || !orderPayload) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    // Capture PayPal payment
    const token = await getAccessToken();
    const captureRes = await fetch(`${BASE}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    const captureData = await captureRes.json();
    if (captureData.status !== "COMPLETED") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
    }

    // Create order in DB
    const order = await dbCreateOrder({
      ...orderPayload,
      paymentMethod: "paypal",
      paypalOrderId,
    });

    return NextResponse.json(order);
  } catch (err) {
    console.error("[paypal] capture-order error:", err);
    return NextResponse.json({ error: "Failed to capture payment" }, { status: 500 });
  }
}
