import { NextRequest, NextResponse } from "next/server";
import { processOrder } from "@/lib/processOrder";
import { sendSms } from "@/lib/sms";

const OWNER_PHONE = "5127202489";

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
  if (!data.access_token) throw new Error(`PayPal auth failed: ${JSON.stringify(data)}`);
  return data.access_token as string;
}

export async function POST(req: NextRequest) {
  const { paypalOrderId, orderPayload } = await req.json();
  if (!paypalOrderId || !orderPayload) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  try {
    const sessionToken = req.cookies.get("csl-session")?.value ?? null;

    // 1. Validate the order BEFORE taking money — stock, min order, pickup
    // window, delivery address/radius. A rejection here costs the customer
    // nothing. (Previously validation only ran after capture: an out-of-stock
    // item meant the customer was charged with no order created.)
    const precheck = await processOrder(
      { ...orderPayload, paymentMethod: "paypal", paypalOrderId },
      sessionToken,
      { validateOnly: true },
    );
    if (precheck.error) {
      return NextResponse.json({ error: precheck.error }, { status: precheck.status ?? 400 });
    }

    // 2. Get access token
    const token = await getAccessToken();

    // 3. Capture PayPal payment
    const captureRes = await fetch(`${BASE}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      cache: "no-store",
    });
    const captureData = await captureRes.json();

    if (captureData.status !== "COMPLETED") {
      const detail = captureData.details?.[0]?.description ?? captureData.message ?? "Payment not completed";
      console.error("[paypal] capture failed:", JSON.stringify(captureData));
      return NextResponse.json({ error: detail }, { status: 400 });
    }

    // Reject eChecks — they are "COMPLETED" at order level but "PENDING" at capture level
    const captureUnit = captureData.purchase_units?.[0]?.payments?.captures?.[0];
    if (captureUnit?.status === "PENDING") {
      const reason = captureUnit?.status_details?.reason ?? "ECHECK";
      console.error("[paypal] capture pending:", reason);
      return NextResponse.json({
        error: "Sorry, eCheck payments are not accepted. Please use PayPal balance, debit, or credit card.",
      }, { status: 400 });
    }

    // 4. Create order using shared logic (points, email, notifications, gift card)
    const result = await processOrder({ ...orderPayload, paymentMethod: "paypal", paypalOrderId }, sessionToken);

    if (result.error) {
      // Money was captured but the order couldn't be created (e.g. the last
      // unit sold in the seconds since the precheck). Refund immediately so
      // the customer is never charged for nothing.
      const refunded = await refundCapture(token, captureUnit?.id);
      console.error("[paypal] order failed AFTER capture:", result.error, "| refunded:", refunded, "| capture:", captureUnit?.id);
      sendSms(
        OWNER_PHONE,
        refunded
          ? `⚠️ PayPal order failed after payment (auto-refunded): ${result.error}`
          : `🚨 PayPal order failed after payment and AUTO-REFUND FAILED — refund manually in PayPal! Capture ${captureUnit?.id}. Reason: ${result.error}`,
      ).catch(() => {});
      return NextResponse.json({
        error: refunded
          ? `${result.error} Your PayPal payment has been refunded in full — you have not been charged.`
          : `${result.error} Please contact us at (512) 337-7051 — we will refund your PayPal payment right away.`,
      }, { status: result.status ?? 400 });
    }
    return NextResponse.json(result.order, { status: 201 });
  } catch (err: any) {
    console.error("[paypal] capture-order error:", err?.message ?? err);
    return NextResponse.json({ error: err?.message ?? "Failed to capture payment" }, { status: 500 });
  }
}

// Full refund of a capture — returns true when PayPal confirms the refund
async function refundCapture(token: string, captureId?: string): Promise<boolean> {
  if (!captureId) return false;
  try {
    const res = await fetch(`${BASE}/v2/payments/captures/${captureId}/refund`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: "{}",
      cache: "no-store",
    });
    const data = await res.json();
    return res.ok && (data.status === "COMPLETED" || data.status === "PENDING");
  } catch (err) {
    console.error("[paypal] refund failed:", err);
    return false;
  }
}
