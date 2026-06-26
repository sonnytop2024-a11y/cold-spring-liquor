import { requireAdminAuth } from "@/lib/adminAuth";
import { NextRequest, NextResponse } from "next/server";
import { dbGetAllProducts, dbSaveProduct } from "@/lib/db";
import type { MockProduct } from "../../_mock/store";

export async function GET(req: NextRequest) {
  const authErr = requireAdminAuth(req); if (authErr) return authErr;
  const { searchParams } = req.nextUrl;
  const q        = searchParams.get("q")?.toLowerCase() ?? searchParams.get("search")?.toLowerCase();
  const category = searchParams.get("category");
  const stock    = searchParams.get("stock"); // "in" | "out" | undefined = all

  let products = await dbGetAllProducts();

  if (q)        products = products.filter((p) => p.name.toLowerCase().includes(q) || (p.brand ?? "").toLowerCase().includes(q));
  if (category) products = products.filter((p) => p.category === category);
  if (stock === "in")  products = products.filter((p) => p.inStock !== false && p.stockQty > 0);
  if (stock === "out") products = products.filter((p) => p.inStock === false || p.stockQty <= 0);

  return NextResponse.json({ products, total: products.length });
}

export async function POST(req: NextRequest) {
  const authErr = requireAdminAuth(req); if (authErr) return authErr;
  const body = await req.json();
  const stockQty = Number(body.stockQty) || 0;
  const id = `p${Date.now()}`;
  const name = String(body.name ?? "");
  const slug = (body.slug ?? name)
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const product: MockProduct = {
    id,
    slug,
    name,
    brand: body.brand ?? "",
    category: body.category ?? "other",
    price: Number(body.price) || 0,
    salePrice: body.salePrice ? Number(body.salePrice) : null,
    volume: body.volume ?? "750ml",
    abv: Number(body.abv) || 0,
    country: body.country ?? "USA",
    stockQty,
    inStock: stockQty > 0,
    featured: Boolean(body.featured),
    active: stockQty > 0,
    rating: 0,
    reviewCount: 0,
    description: body.description ?? "",
    imageUrl: body.imageUrl ?? null,
  };

  try {
    await dbSaveProduct(product);
    console.log(`[admin/products] POST created: ${id} "${name}"`);
    return NextResponse.json(product, { status: 201 });
  } catch (e) {
    console.error("[admin/products] POST save error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
