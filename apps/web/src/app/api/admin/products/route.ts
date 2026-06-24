import { NextRequest, NextResponse } from "next/server";
import { dbGetAllProducts } from "@/lib/db";

export async function GET(req: NextRequest) {
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
