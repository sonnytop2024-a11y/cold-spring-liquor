import { NextRequest, NextResponse } from "next/server";
import { dbGetProductsPage, dbSaveProduct, dbGetActiveFlashDeals } from "@/lib/db";
import type { MockProduct } from "../_mock/store";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q") ?? searchParams.get("search") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const minPrice = Number(searchParams.get("minPrice") || 0);
  const maxPrice = Number(searchParams.get("maxPrice") || 999999);
  const page = Math.max(Number(searchParams.get("page") || 1), 1);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 12), 1), 100);
  const featured = searchParams.get("featured");
  const sale = searchParams.get("sale");
  const flashdeal = searchParams.get("flashdeal");
  const bundle = searchParams.get("bundle");
  const offset = (page - 1) * limit;

  const needsSale = sale === "true";
  const needsFlashdeal = flashdeal === "true";

  // flash deal: needs special handling — build from flash deal store + product lookup
  if (needsFlashdeal) {
    const activeDeals = await dbGetActiveFlashDeals();
    const productById   = new Map<string, MockProduct>();
    const productBySlug = new Map<string, MockProduct>();
    // Fetch all in-stock products for lookup (paginate to cover all)
    const { products: allProds } = await dbGetProductsPage({ limit: 3000, offset: 0, stock: "in" });
    allProds.forEach(p => { productById.set(p.id, p); productBySlug.set(p.slug, p); });
    const flashProducts = activeDeals.map(deal => {
      const real = (deal.productId ? productById.get(deal.productId) : undefined)
                ?? productBySlug.get(deal.slug);
      if (real) return { ...real, salePrice: deal.salePrice };
      return {
        id: deal.id, slug: deal.slug, name: deal.name, brand: deal.brand,
        category: "other", price: deal.price, salePrice: deal.salePrice,
        volume: deal.volume, stockQty: deal.stockQty, inStock: deal.stockQty > 0,
        featured: false, bundleEligible: false, active: true,
        rating: 0, reviewCount: 0, description: "", imageUrl: deal.imageUrl,
        abv: 0, country: "",
      } as MockProduct;
    });
    const total = flashProducts.length;
    return NextResponse.json({ products: flashProducts, data: flashProducts, total, page: 1, pageSize: total, limit: total, totalPages: 1 });
  }

  // sale: requires in-memory filter (salePrice comparison can't be done in Supabase JSON query)
  if (needsSale) {
    const { products: allProds } = await dbGetProductsPage({ limit: 3000, offset: 0, q, category, stock: "in" });
    let filtered = allProds.filter(p => p.salePrice !== null && p.salePrice < p.price);
    if (minPrice > 0) filtered = filtered.filter(p => p.price >= minPrice);
    if (maxPrice < 999999) filtered = filtered.filter(p => p.price <= maxPrice);
    const total = filtered.length;
    const products = filtered.slice(offset, offset + limit);
    return NextResponse.json({ products, data: products, total, page, pageSize: limit, limit, totalPages: Math.ceil(total / limit) });
  }

  // bundle / featured / normal: all handled at DB level now
  let { products, total } = await dbGetProductsPage({
    limit,
    offset,
    q,
    category,
    stock: "in",
    bundleEligible: bundle === "true" ? true : undefined,
    featured: featured === "true" ? true : undefined,
  });

  if (minPrice > 0) products = products.filter(p => p.price >= minPrice);
  if (maxPrice < 999999) products = products.filter(p => p.price <= maxPrice);

  return NextResponse.json({ products, data: products, total, page, pageSize: limit, limit, totalPages: Math.ceil(total / limit) });
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
    couponExcluded: Boolean(body.couponExcluded),
    pickupOnly: Boolean(body.pickupOnly),
    active: body.active !== false,
    rating: 0,
    reviewCount: 0,
    description: body.description ?? "",
    imageUrl: body.imageUrl ?? null,
  };

  await dbSaveProduct(product);
  return NextResponse.json(product, { status: 201 });
}
