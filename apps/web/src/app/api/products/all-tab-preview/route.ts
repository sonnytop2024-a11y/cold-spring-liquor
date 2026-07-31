import { NextResponse } from "next/server";
import { dbGetProductsPage, dbGetActiveCategories } from "@/lib/db";

// Without this, Next statically prerenders this GET at build time (it reads no
// request data), freezing the JSON — admin image/product edits never showed up
// on the All tab. force-dynamic runs it per request like /api/products.
export const dynamic = "force-dynamic";

// "All" tab mobile carousels: every active category (admin sortOrder) with
// ALL of its in-stock products that have a photo, in catalog order — the
// customer can swipe through the entire category (anh Sơn, 28/07: no cap;
// no-photo products never appear here). Categories with nothing to show are
// skipped entirely.
export async function GET() {
  const [categories, { products }] = await Promise.all([
    dbGetActiveCategories(),
    // Same source the shop grid uses (in-stock, catalog sort order)
    dbGetProductsPage({ limit: 3000, offset: 0, stock: "in" }),
  ]);

  const withImage = products.filter(p => p.imageUrl);
  const sections = categories
    .map(cat => ({
      id: cat.id,
      value: cat.value,
      label: cat.label,
      emoji: cat.emoji,
      iconUrl: cat.iconUrl,
      products: withImage.filter(p => p.category === cat.value),
    }))
    .filter(s => s.products.length > 0);

  // Short edge cache only — admin edits must reach the All tab within ~a minute
  return NextResponse.json(
    { categories: sections },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30" } },
  );
}
