import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-04-10" });

export async function POST(req: NextRequest) {
  try {
    const { amount } = await req.json();
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "usd",
      // card covers Apple Pay & Google Pay when domain is verified
      // klarna requires shipping country metadata — provided by PaymentElement automatically
      payment_method_types: ["card", "klarna"],
      payment_method_options: {
        klarna: {
          preferred_locale: "en-US",
        },
      },
    });
    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("[stripe] payment intent error:", err);
    return NextResponse.json({ error: "Failed to create payment intent" }, { status: 500 });
  }
}

// Quantities can be edited on the checkout review screen after the intent is
// created — this syncs the intent amount to the new total before confirmation.
export async function PATCH(req: NextRequest) {
  try {
    const { clientSecret, amount } = await req.json();
    if (typeof clientSecret !== "string" || !clientSecret.startsWith("pi_") || !amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const intentId = clientSecret.split("_secret")[0];
    await stripe.paymentIntents.update(intentId, { amount: Math.round(amount * 100) });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[stripe] payment intent update error:", err);
    return NextResponse.json({ error: "Failed to update payment intent" }, { status: 500 });
  }
}
