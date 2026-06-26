import { requireAdminAuth } from "@/lib/adminAuth";
import { NextRequest, NextResponse } from "next/server";
import { dbGetProduct, dbSaveProduct, dbDeleteProduct, dbUpdateProduct } from "@/lib/db";
import type { MockProduct } from "@/app/api/_mock/store";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const authErr = requireAdminAuth(req); if (authErr) return authErr;
  const body = await req.json();

  // Direct single-row lookup — much faster than loading all products
  const existing = await dbGetProduct(params.id);

  const newQty = Number(body.stockQty ?? existing?.stockQty ?? 0);

  // If product exists in DB, merge. If not, build from body (new-style upsert).
  const updated: MockProduct = {
    id: params.id,
    slug: existing?.slug ?? params.id,
    name: body.name ?? existing?.name ?? "",
    brand: body.brand ?? existing?.brand ?? "",
    category: body.category ?? existing?.category ?? "other",
    price: Number(body.price ?? existing?.price ?? 0),
    salePrice:
      body.salePrice !== undefined
        ? body.salePrice ? Number(body.salePrice) : null
        : (existing?.salePrice ?? null),
    volume: body.volume ?? existing?.volume ?? "750ml",
    abv: Number(body.abv ?? existing?.abv ?? 0),
    country: body.country ?? existing?.country ?? "USA",
    stockQty: newQty,
    inStock: newQty > 0,
    featured: body.featured ?? existing?.featured ?? false,
    bundleEligible: body.bundleEligible !== undefined ? Boolean(body.bundleEligible) : (existing?.bundleEligible ?? false),
    active: newQty > 0,
    rating: existing?.rating ?? 0,
    reviewCount: existing?.reviewCount ?? 0,
    description: body.description ?? existing?.description ?? "",
    imageUrl: body.imageUrl !== undefined ? body.imageUrl : (existing?.imageUrl ?? null),
  };

  try {
    await dbSaveProduct(updated);
    console.log(`[admin/products] PUT saved: ${params.id} stockQty=${newQty} category=${updated.category}`);
    return NextResponse.json(updated);
  } catch (e) {
    console.error(`[admin/products] PUT save error:`, e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PATCH — surgical partial update (only the provided fields, uses UPDATE not upsert)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const authErr = requireAdminAuth(req); if (authErr) return authErr;
  try {
    const body = await req.json();
    const result = await dbUpdateProduct(params.id, body);
    if (!result) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    console.log(`[admin/products] PATCH ${params.id}:`, Object.keys(body));
    return NextResponse.json(result);
  } catch (e) {
    console.error(`[admin/products] PATCH error:`, e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  // No pre-check — delete directly by id; Supabase handles non-existent row gracefully
  try {
    await dbDeleteProduct(params.id);
    console.log(`[admin/products] DELETE: ${params.id}`);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(`[admin/products] DELETE error:`, e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
