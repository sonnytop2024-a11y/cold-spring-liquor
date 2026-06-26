import { NextRequest, NextResponse } from "next/server";
import { dbGetAllFlashDeals, dbSaveFlashDeal } from "@/lib/db";

export async function GET() {
  return NextResponse.json(await dbGetAllFlashDeals());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, brand, slug, price, salePrice, imageUrl, volume, stockQty, maxStock, active, startAt, endsAt, productId } = body;

  if (!name || !price || !salePrice) {
    return NextResponse.json({ error: "name, price, salePrice required" }, { status: 400 });
  }

  const deal = {
    id: `fd${Date.now()}`,
    createdAt: new Date().toISOString(),
    name, brand: brand ?? "", slug: slug ?? name.toLowerCase().replace(/\s+/g, "-"),
    price: Number(price), salePrice: Number(salePrice),
    imageUrl: imageUrl ?? null, volume: volume ?? "",
    stockQty: Number(stockQty) || 0, maxStock: Number(maxStock || stockQty) || 0,
    active: active !== false,
    startAt: startAt || null,
    endsAt: endsAt || null,
    productId: productId ?? null,
  };

  await dbSaveFlashDeal(deal);
  return NextResponse.json(deal, { status: 201 });
}
