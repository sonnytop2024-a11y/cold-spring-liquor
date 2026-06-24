import { NextRequest, NextResponse } from "next/server";
import { dbGetProduct, dbSaveProduct, dbDeleteProduct } from "@/lib/db";
import type { MockProduct } from "@/app/api/_mock/store";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const existing = await dbGetProduct(params.id);
  if (!existing) {
    console.error(`[admin/products] PUT - not found: ${params.id}`);
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const body = await req.json();
  const newQty = Number(body.stockQty ?? existing.stockQty);

  const updated: MockProduct = {
    ...existing,
    ...(body as Partial<MockProduct>),
    id: existing.id,
    slug: existing.slug,
    price: Number(body.price ?? existing.price),
    salePrice:
      body.salePrice !== undefined
        ? body.salePrice ? Number(body.salePrice) : null
        : existing.salePrice,
    stockQty: newQty,
    inStock: newQty > 0,
    active: newQty > 0,
  };

  try {
    await dbSaveProduct(updated);
    console.log(`[admin/products] PUT saved: ${existing.id} stockQty=${newQty} category=${updated.category}`);
    return NextResponse.json(updated);
  } catch (e) {
    console.error(`[admin/products] PUT save error:`, e);
    return NextResponse.json({ error: "Failed to save product" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const existing = await dbGetProduct(params.id);
  if (!existing) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  try {
    const ok = await dbDeleteProduct(params.id);
    if (!ok) return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    console.log(`[admin/products] DELETE: ${params.id}`);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(`[admin/products] DELETE error:`, e);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
