import { NextResponse } from "next/server";
import { dbGetProductsPage, dbGetActiveCategories } from "@/lib/db";

// "All" tab mobile carousels: every active category (admin sortOrder) with a
// short preview strip — first products in catalog order that are in stock AND
// have a photo (anh Sơn: no-photo products never appear here). Categories with
// nothing to show are skipped entirely.
const PREVIEW_PER_CATEGORY = 6;

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
      products: withImage.filter(p => p.category === cat.value).slice(0, PREVIEW_PER_CATEGORY),
    }))
    .filter(s => s.products.length > 0);

  return NextResponse.json(
    { categories: sections },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
