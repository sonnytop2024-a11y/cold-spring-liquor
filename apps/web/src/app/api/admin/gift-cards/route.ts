import { NextRequest, NextResponse } from "next/server";
import { dbGetSettings, dbSaveGiftCard, type GiftCard } from "@/lib/db";
import { sendGiftCardEmail } from "@/lib/email";

function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `GIFT-${seg()}-${seg()}`;
}

export async function GET(req: NextRequest) {
const settings = await dbGetSettings();
  const map: Record<string, GiftCard> = (settings as any).giftCards ?? {};
  const cards = Object.values(map).sort(
    (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
  );
  return NextResponse.json(cards);
}

export async function POST(req: NextRequest) {
const { amount, recipientEmail, senderName = "Cold Spring Liquor", message = "", sendEmail = true } = await req.json();

  const VALID = [25, 50, 100, 250];
  if (!VALID.includes(amount)) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  if (!recipientEmail) return NextResponse.json({ error: "recipientEmail required" }, { status: 400 });

  const code = genCode();
  const card: GiftCard = {
    code,
    originalAmount: amount,
    remainingBalance: amount,
    recipientEmail,
    senderName,
    message,
    status: "active",
    issuedAt: new Date().toISOString(),
    source: "admin_issued",
  };

  await dbSaveGiftCard(card);
  if (sendEmail) sendGiftCardEmail(code, amount, recipientEmail, senderName, message).catch(() => {});

  return NextResponse.json(card, { status: 201 });
}
