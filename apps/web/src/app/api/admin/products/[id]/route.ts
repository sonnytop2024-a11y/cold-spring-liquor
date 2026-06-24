import { NextRequest, NextResponse } from "next/server";
import { dbGetProduct, dbSaveProduct } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const existing = await dbGetProduct(params.id);
  if (!existing) {
    console.error(`[admin/products] PUT - not found: ${params.id}`);
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const body = await req.json();
  const newQty = Number(body.stockQty ?? existing.stockQty);

  const updated = {
    ...existing,
    ...body,
    id: existing.id,
    slug: existing.slug,
    price: Number(body.price ?? existing.price),
    salePrice:
      body.salePrice !== undefined
        ? body.salePrice
          ? Number(body.salePrice)
          : null
        : existing.salePrice,
    stockQty: newQty,
    inStock: newQty > 0,
    active: newQty > 0,
  };

  try {
    await dbSaveProduct(updated);
    console.log(`[admin/products] PUT saved: ${existing.id} stockQty=${newQty}`);
    return NextResponse.json(updated);
  } catch (e) {
    console.error(`[admin/products] PUT save error:`, e);
    return NextResponse.json({ error: "Failed to save product" }, { status: 500 });
  }
}
