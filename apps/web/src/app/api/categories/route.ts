import { NextResponse } from "next/server";
import { dbGetActiveCategories } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const cats = await dbGetActiveCategories();
  return NextResponse.json(cats);
}
