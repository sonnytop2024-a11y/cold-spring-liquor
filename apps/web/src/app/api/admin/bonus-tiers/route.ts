import { NextRequest, NextResponse } from "next/server";
import { dbGetAllBonusTiers, dbCreateBonusTier } from "@/lib/db";

export async function GET() {
  return NextResponse.json(await dbGetAllBonusTiers());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { minAmount, bonusAmount, expiryDays, active } = body;

  if (!minAmount || !bonusAmount) {
    return NextResponse.json({ error: "minAmount and bonusAmount required" }, { status: 400 });
  }

  const tier = await dbCreateBonusTier({
    minAmount: Number(minAmount),
    bonusAmount: Number(bonusAmount),
    expiryDays: expiryDays === undefined || expiryDays === "" ? 45 : Number(expiryDays),
    active: active !== false,
  });

  return NextResponse.json(tier, { status: 201 });
}
