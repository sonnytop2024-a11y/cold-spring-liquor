import { NextRequest, NextResponse } from "next/server";

const VALID_AMOUNTS = [25, 50, 100, 250];

function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `GIFT-${seg()}-${seg()}`;
}

export async function POST(req: NextRequest) {
  const { amount, recipientEmail, senderName, message } = await req.json();
  if (!VALID_AMOUNTS.includes(amount)) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }
  return NextResponse.json({
    id: `gc_${Date.now()}`, code: genCode(), originalAmount: amount,
    remainingBalance: amount, recipientEmail, senderName, message,
    status: "active", issuedAt: new Date().toISOString(),
  }, { status: 201 });
}
