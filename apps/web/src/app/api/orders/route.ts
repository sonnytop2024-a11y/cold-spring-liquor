import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { dbGetAllOrders } from "@/lib/db";
import { processOrder } from "@/lib/processOrder";
import { sendSms } from "@/lib/sms";

const OWNER_PHONE = "5127202489";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sessionToken = req.cookies.get("csl-session")?.value ?? null;

  let result;
  try {
    result = await processOrder(body, sessionToken);
  } catch (err: any) {
    console.error("[orders] processOrder crashed:", err?.message ?? err);
    result = { error: "Something went wrong while creating your order.", status: 500 as number };
  }

  if (result.error) {
    // The Stripe flow charges the card BEFORE posting the order here. If the
    // order is then rejected (or crashes), refund the charge immediately so
    // the customer is never left paid-with-no-order (real incident 24/07 —
    // PayPal side; Stripe had the same exposure).
    if (body.stripePaymentIntentId) {
      const refunded = await refundStripeIntent(body.stripePaymentIntentId);
      console.error("[orders] order failed AFTER Stripe charge:", result.error, "| refunded:", refunded, "| pi:", body.stripePaymentIntentId);
      sendSms(
        OWNER_PHONE,
        refunded
          ? `⚠️ Stripe order failed after payment (auto-refunded): ${result.error}`
          : `🚨 Stripe order failed after payment and AUTO-REFUND FAILED — refund manually in Stripe! Intent ${body.stripePaymentIntentId}. Reason: ${result.error}`,
      ).catch(() => {});
      return NextResponse.json({
        error: refunded
          ? `${result.error} Your card payment has been refunded in full — you have not been charged.`
          : `${result.error} Please contact us at (512) 337-7051 — we will refund your card payment right away.`,
      }, { status: result.status ?? 400 });
    }
    return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
  }
  return NextResponse.json(result.order, { status: 201 });
}

// Full refund by PaymentIntent — returns true when Stripe accepts the refund
async function refundStripeIntent(paymentIntentId: string): Promise<boolean> {
  try {
    if (!process.env.STRIPE_SECRET_KEY || !paymentIntentId.startsWith("pi_")) return false;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" });
    const refund = await stripe.refunds.create({ payment_intent: paymentIntentId });
    return refund.status === "succeeded" || refund.status === "pending";
  } catch (err: any) {
    console.error("[orders] Stripe refund failed:", err?.message ?? err);
    return false;
  }
}

export async function GET() {
  return NextResponse.json(await dbGetAllOrders());
}
