import { NextRequest, NextResponse } from "next/server";
import { dbGetGiftCard } from "@/lib/db";

async function lookupCode(code: string) {
  if (!code) return null;
  const card = await dbGetGiftCard(code.toUpperCase());
  if (!card || card.status === "redeemed" || card.remainingBalance <= 0) return null;
  return card;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code") ?? "";
  const card = await lookupCode(code);
  if (card) return NextResponse.json({ valid: true, balance: card.remainingBalance });
  return NextResponse.json({ valid: false, balance: 0 });
}

export async function POST(req: NextRequest) {
  const { code } = await req.json();
  const card = await lookupCode(code);
  if (card) return NextResponse.json({ valid: true, balance: card.remainingBalance });
  return NextResponse.json({ valid: false, balance: 0 }, { status: 400 });
}
