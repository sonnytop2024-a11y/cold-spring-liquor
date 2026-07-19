import { NextRequest, NextResponse } from "next/server";
import { dbGetAllFlashDeals, dbSaveFlashDeal, dbReorderFlashDeals } from "@/lib/db";

export async function GET(req: NextRequest) {
return NextResponse.json(await dbGetAllFlashDeals());
}

export async function POST(req: NextRequest) {
const body = await req.json();

  // Reorder request — same contract as /admin/banners
  if (body.action === "reorder" && Array.isArray(body.ids)) {
    await dbReorderFlashDeals(body.ids);
    return NextResponse.json({ ok: true });
  }

  const { name, brand, slug, price, salePrice, imageUrl, volume, stockQty, maxStock, active, startAt, endsAt, productId } = body;

  if (!name || !price || !salePrice) {
    return NextResponse.json({ error: "name, price, salePrice required" }, { status: 400 });
  }

  const all = await dbGetAllFlashDeals();
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
    sortOrder: all.length,
  };

  await dbSaveFlashDeal(deal);
  return NextResponse.json(deal, { status: 201 });
}
