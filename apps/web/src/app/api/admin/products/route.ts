import { NextResponse } from "next/server";
import { dbGetAllProducts } from "@/lib/db";

export async function GET() {
  const products = await dbGetAllProducts();
  return NextResponse.json(products);
}
