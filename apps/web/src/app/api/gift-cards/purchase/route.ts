import { NextRequest, NextResponse } from "next/server";
import { dbSaveGiftCard } from "@/lib/db";
import { sendGiftCardEmail } from "@/lib/email";

const VALID_AMOUNTS = [25, 50, 100, 250];

function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `GIFT-${seg()}-${seg()}`;
}

export async function POST(req: NextRequest) {
  const { amount, recipientEmail, senderName, message = "" } = await req.json();

  if (!VALID_AMOUNTS.includes(amount)) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }
  if (!recipientEmail || !senderName) {
    return NextResponse.json({ error: "recipientEmail and senderName are required" }, { status: 400 });
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
  };

  await dbSaveGiftCard(card);
  sendGiftCardEmail(code, amount, recipientEmail, senderName, message).catch(() => {});

  return NextResponse.json(card, { status: 201 });
}
