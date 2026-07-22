import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { dbSaveGiftCard, dbGetActiveBonusTiers, computeBonusTier, type GiftCard } from "@/lib/db";
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

  // The charged amount comes from Stripe, not the request body — the client-sent
  // `amount` only decides what the PaymentIntent was created for earlier. Trusting
  // it here would let someone pay for a small card but request a larger one (and,
  // now that bonus tiers exist, an undeserved bonus on top).
  const verifiedAmount = Math.round(pi.amount) / 100;

  const code = genCode();
  const card: GiftCard = {
    code,
    originalAmount: verifiedAmount,
    remainingBalance: verifiedAmount,
    recipientEmail,
    senderName,
    message,
    status: "active",
    issuedAt: new Date().toISOString(),
    source: "customer_purchase",
    buyerEmail: buyerEmail ?? pi.receipt_email ?? undefined,
    design: typeof design === "string" ? design : undefined,
  };
  await dbSaveGiftCard(card);

  // Automatic bonus card — no promo code, tier match is purely amount-based so
  // custom amounts qualify the same as the $50/$100 preset buttons.
  const activeTiers = await dbGetActiveBonusTiers();
  const tier = computeBonusTier(verifiedAmount, activeTiers);
  let bonus: { code: string; amount: number; expiresAt?: string } | undefined;

  if (tier) {
    const bonusCode = genCode();
    const expiresAt = tier.expiryDays > 0
      ? new Date(Date.now() + tier.expiryDays * 24 * 60 * 60 * 1000).toISOString()
      : undefined;
    const bonusCard: GiftCard = {
      code: bonusCode,
      originalAmount: tier.bonusAmount,
      remainingBalance: tier.bonusAmount,
      recipientEmail,
      senderName,
      message: "",
      status: "active",
      issuedAt: new Date().toISOString(),
      source: "bonus_promo",
      buyerEmail: card.buyerEmail,
      design: card.design,
      expiresAt,
      linkedCode: code,
      bonusTierId: tier.id,
    };
    await dbSaveGiftCard(bonusCard);
    bonus = { code: bonusCode, amount: tier.bonusAmount, expiresAt };
  }

  // One email, both codes shown together (per the product decision — not two separate emails).
  sendGiftCardEmail(code, verifiedAmount, recipientEmail, senderName, message, design, bonus).catch(() => {});
  sendGiftCardAdminAlert(code, verifiedAmount, recipientEmail, senderName, card.buyerEmail).catch(() => {});
  sendSms(
    OWNER_PHONE,
    bonus
      ? `🎁 New gift card sold: $${verifiedAmount} (${code}) + $${bonus.amount} bonus (${bonus.code}) sent to ${recipientEmail}, from ${senderName}`
      : `🎁 New gift card sold: $${verifiedAmount} (${code}) sent to ${recipientEmail}, from ${senderName}`,
  ).catch(() => {});

  return NextResponse.json({ code, amount: verifiedAmount, recipientEmail, bonus: bonus ?? null });
}
