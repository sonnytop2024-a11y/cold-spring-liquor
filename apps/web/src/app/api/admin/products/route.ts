import { NextResponse } from "next/server";
import { store } from "../../_mock/store";

// Admin: get all products (no activeOnly filter)
export async function GET() {
  const products = store.getAllProducts();
  return NextResponse.json(products);
}
