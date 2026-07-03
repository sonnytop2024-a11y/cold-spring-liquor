import { NextRequest, NextResponse } from "next/server";
import { dbGetAllBundleTiers, dbCreateBundleTier } from "@/lib/db";

export async function GET(req: NextRequest) {
return NextResponse.json(await dbGetAllBundleTiers());
}

export async function POST(req: NextRequest) {
const body = await req.json();
  const { minQty, discountPct, label, active, sortOrder } = body;

  if (!minQty || !discountPct) {
    return NextResponse.json({ error: "minQty and discountPct required" }, { status: 400 });
  }

  const tiers = await dbGetAllBundleTiers();
  const tier = await dbCreateBundleTier({
    minQty: Number(minQty),
    discountPct: Number(discountPct),
    label: label || `Buy ${minQty}+ bottles — Save ${discountPct}%`,
    active: active !== false,
    sortOrder: Number(sortOrder) || tiers.length + 1,
  });

  return NextResponse.json(tier, { status: 201 });
}
