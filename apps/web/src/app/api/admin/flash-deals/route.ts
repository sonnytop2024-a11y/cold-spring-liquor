import { requireAdminAuth } from "@/lib/adminAuth";
import { NextRequest, NextResponse } from "next/server";
import { store } from "../../_mock/store";

export async function GET() {
  return NextResponse.json(store.getAllFlashDeals());
}

export async function POST(req: NextRequest) {
  const authErr = requireAdminAuth(req); if (authErr) return authErr;
  const body = await req.json();
  const { name, brand, slug, price, salePrice, imageUrl, volume, stockQty, maxStock, active, startAt, endsAt } = body;

  if (!name || !price || !salePrice) {
    return NextResponse.json({ error: "name, price, salePrice required" }, { status: 400 });
  }

  const deal = store.createFlashDeal({
    name, brand: brand ?? "", slug: slug ?? name.toLowerCase().replace(/\s+/g, "-"),
    price: Number(price), salePrice: Number(salePrice),
    imageUrl: imageUrl ?? null, volume: volume ?? "",
    stockQty: Number(stockQty) || 0, maxStock: Number(maxStock || stockQty) || 0,
    active: active !== false,
    startAt: startAt || null,
    endsAt: endsAt || null,
  });

  return NextResponse.json(deal, { status: 201 });
}
