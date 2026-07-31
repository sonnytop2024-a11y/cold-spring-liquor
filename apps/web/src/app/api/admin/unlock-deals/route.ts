import { NextRequest, NextResponse } from "next/server";
import { dbGetAllUnlockDeals, dbCreateUnlockDeal } from "@/lib/db";

export async function GET() {
  return NextResponse.json(await dbGetAllUnlockDeals());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { productId, productName, productBrand, productImage, productSlug, regularPrice, minSpend, specialPrice, maxRedemptions, active, sortOrder } = body;

  if (!productId || !productName) {
    return NextResponse.json({ error: "productId and productName required" }, { status: 400 });
  }
  if (!(Number(minSpend) > 0)) {
    return NextResponse.json({ error: "minSpend must be greater than 0" }, { status: 400 });
  }
  if (!(Number(specialPrice) >= 0)) {
    return NextResponse.json({ error: "specialPrice must be 0 or greater" }, { status: 400 });
  }

  const deal = await dbCreateUnlockDeal({
    productId,
    productName,
    productBrand: productBrand ?? "",
    productImage: productImage ?? null,
    productSlug: productSlug ?? "",
    regularPrice: Number(regularPrice) || 0,
    minSpend: Number(minSpend),
    specialPrice: Number(specialPrice),
    maxRedemptions: Number(maxRedemptions) > 0 ? Number(maxRedemptions) : null,
    active: active !== false,
    sortOrder: Number(sortOrder) || 0,
  });

  return NextResponse.json(deal, { status: 201 });
}
