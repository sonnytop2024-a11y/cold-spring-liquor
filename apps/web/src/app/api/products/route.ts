import { NextRequest, NextResponse } from "next/server";
import { dbGetAllProducts, dbSaveProduct } from "@/lib/db";
import type { MockProduct } from "../_mock/store";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q")?.toLowerCase() ?? searchParams.get("search")?.toLowerCase();
  const category = searchParams.get("category");
  const minPrice = Number(searchParams.get("minPrice") || 0);
  const maxPrice = Number(searchParams.get("maxPrice") || 999999);
  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 12);
  const featured = searchParams.get("featured");
  const activeOnly = searchParams.get("activeOnly") !== "false";

  let results = await dbGetAllProducts();

  // Website-facing: only show products with stock
  if (activeOnly) results = results.filter((p) => p.stockQty > 0);
  if (q) results = results.filter((p) => p.name.toLowerCase().includes(q) || (p.brand ?? "").toLowerCase().includes(q));
  if (category) results = results.filter((p) => p.category === category);
  if (featured === "true") results = results.filter((p) => p.featured);
  results = results.filter((p) => p.price >= minPrice && p.price <= maxPrice);

  const total = results.length;
  const data = results.slice((page - 1) * limit, page * limit);

  return NextResponse.json({ products: data, data, total, page, pageSize: limit, limit, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = `p${Date.now()}`;
  const slug = (body.name as string)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const product: MockProduct = {
    id,
    slug: body.slug ?? slug,
    name: body.name,
    brand: body.brand ?? "",
    category: body.category ?? "other",
    price: Number(body.price) || 0,
    salePrice: body.salePrice ? Number(body.salePrice) : null,
    volume: body.volume ?? "750ml",
    abv: Number(body.abv) || 0,
    country: body.country ?? "USA",
    stockQty: Number(body.stockQty) || 0,
    inStock: (Number(body.stockQty) || 0) > 0,
    featured: Boolean(body.featured),
    bundleEligible: Boolean(body.bundleEligible),
    active: body.active !== false,
    rating: 0,
    reviewCount: 0,
    description: body.description ?? "",
    imageUrl: body.imageUrl ?? null,
  };

  await dbSaveProduct(product);
  return NextResponse.json(product, { status: 201 });
}
