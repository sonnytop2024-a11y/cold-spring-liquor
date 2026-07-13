import { NextRequest, NextResponse } from "next/server";
import { dbGetAllProducts, dbGetProductsPage, dbSaveProduct } from "@/lib/db";
import type { MockProduct } from "../../_mock/store";

export async function GET(req: NextRequest) {
const { searchParams } = req.nextUrl;
  const q        = searchParams.get("q")?.toLowerCase() ?? searchParams.get("search")?.toLowerCase() ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const stock    = searchParams.get("stock") ?? undefined;
  const featured = searchParams.get("featured") === "true";
  const bundle   = searchParams.get("bundle")   === "true";
  const couponExcluded = searchParams.get("couponExcluded") === "true";
  const pickupOnly     = searchParams.get("pickupOnly")     === "true";
  const limitStr = searchParams.get("limit");
  const pageStr  = searchParams.get("page");

  // Paginated path — used by admin UI
  if (limitStr) {
    const limit  = Math.min(Math.max(Number(limitStr) || 50, 1), 200);
    const page   = Math.max(Number(pageStr) || 1, 1);
    const offset = (page - 1) * limit;

    if (featured || bundle || couponExcluded || pickupOnly) {
      // featured/bundle/couponExcluded/pickupOnly require in-memory filtering — fetch all then paginate
      const { products: all } = await dbGetProductsPage({ limit: 2000, offset: 0, q, stock });
      let filtered = all;
      if (featured) filtered = filtered.filter(p => p.featured);
      if (bundle)   filtered = filtered.filter(p => p.bundleEligible);
      if (couponExcluded) filtered = filtered.filter(p => p.couponExcluded);
      if (pickupOnly)     filtered = filtered.filter(p => p.pickupOnly);
      const total = filtered.length;
      const sliced = filtered.slice(offset, offset + limit);
      return NextResponse.json({ products: sliced, total, page, totalPages: Math.ceil(total / limit), limit });
    }

    const { products, total } = await dbGetProductsPage({ limit, offset, q, category, stock });
    return NextResponse.json({ products, total, page, totalPages: Math.ceil(total / limit), limit });
  }

  // Legacy path — returns all (used by CSV export)
  let products = await dbGetAllProducts();
  if (q)             products = products.filter((p) => p.name.toLowerCase().includes(q) || (p.brand ?? "").toLowerCase().includes(q));
  if (category)      products = products.filter((p) => p.category === category);
  if (featured)      products = products.filter((p) => p.featured);
  if (bundle)        products = products.filter((p) => p.bundleEligible);
  if (couponExcluded) products = products.filter((p) => p.couponExcluded);
  if (pickupOnly)     products = products.filter((p) => p.pickupOnly);
  if (stock === "in")  products = products.filter((p) => p.inStock !== false && p.stockQty > 0);
  if (stock === "out") products = products.filter((p) => p.inStock === false || p.stockQty <= 0);
  return NextResponse.json({ products, total: products.length });
}

export async function POST(req: NextRequest) {
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
    bundleEligible: Boolean(body.bundleEligible),
    couponExcluded: Boolean(body.couponExcluded),
    pickupOnly: Boolean(body.pickupOnly),
    active: stockQty > 0,
    rating: 0,
    reviewCount: 0,
    description: body.description ?? "",
    imageUrl: body.imageUrl ?? null,
  };

  try {
    await dbSaveProduct(product);
    return NextResponse.json(product, { status: 201 });
  } catch (e) {
    console.error("[admin/products] POST save error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
