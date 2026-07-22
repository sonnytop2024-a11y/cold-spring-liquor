import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { dbSaveGiftCard } from "@/lib/db";
import { sendGiftCardEmail, sendGiftCardAdminAlert } from "@/lib/email";
import { sendSms } from "@/lib/sms";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-04-10" });
const OWNER_PHONE = "5127202489";

function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `GIFT-${seg()}-${seg()}`;
}

export async function POST(req: NextRequest) {
  const { paymentIntentId, amount, design, recipientEmail, senderName, message = "", buyerEmail } = await req.json();

  if (!paymentIntentId || !amount || !recipientEmail || !senderName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify payment actually succeeded with Stripe
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (pi.status !== "succeeded") {
    return NextResponse.json({ error: "Payment not completed" }, { status: 402 });
  }

  const code = genCode();
  const card = {
    code,
    originalAmount: amount,
    remainingBalance: amount,
    recipientEmail,
    senderName,
    message,
    status: "active" as const,
    issuedAt: new Date().toISOString(),
    source: "customer_purchase" as const,
    buyerEmail: buyerEmail ?? pi.receipt_email ?? undefined,
    design: typeof design === "string" ? design : undefined,
  };

  await dbSaveGiftCard(card);
  sendGiftCardEmail(code, amount, recipientEmail, senderName, message, design).catch(() => {});
  sendGiftCardAdminAlert(code, amount, recipientEmail, senderName, card.buyerEmail).catch(() => {});
  sendSms(OWNER_PHONE, `🎁 New gift card sold: $${amount} (${code}) sent to ${recipientEmail}, from ${senderName}`).catch(() => {});

  return NextResponse.json({ code, amount, recipientEmail });
}
