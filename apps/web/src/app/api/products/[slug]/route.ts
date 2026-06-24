import { NextRequest, NextResponse } from "next/server";
import { dbGetAllProducts, dbGetProduct, dbSaveProduct, dbDeleteProduct } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const product = await dbGetProduct(params.slug);
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const all = await dbGetAllProducts();
  const related = all
    .filter((p) => p.category === product.category && p.id !== product.id && p.active !== false)
    .slice(0, 4);
  return NextResponse.json({ ...product, related });
}

export async function PUT(req: NextRequest, { params }: { params: { slug: string } }) {
  const existing = await dbGetProduct(params.slug);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json();
  const newQty = Number(body.stockQty ?? existing.stockQty);
  // inStock: explicit body value wins; if stockQty is explicitly set to 0, force OOS
  const inStock =
    body.inStock !== undefined
      ? Boolean(body.inStock)
      : body.stockQty !== undefined
      ? newQty > 0
      : existing.inStock;
  const updated = {
    ...existing,
    ...body,
    id: existing.id,
    slug: existing.slug,
    price: Number(body.price ?? existing.price),
    salePrice: body.salePrice !== undefined ? (body.salePrice ? Number(body.salePrice) : null) : existing.salePrice,
    stockQty: newQty,
    inStock,
  };
  await dbSaveProduct(updated);
  return NextResponse.json(updated);
}

export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
  return PUT(req, { params });
}

export async function DELETE(_req: NextRequest, { params }: { params: { slug: string } }) {
  const deleted = await dbDeleteProduct(params.slug);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
