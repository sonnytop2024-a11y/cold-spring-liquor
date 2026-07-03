import { NextRequest, NextResponse } from "next/server";
import { dbGetAllCategories, dbCreateCategory } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
const cats = await dbGetAllCategories();
  return NextResponse.json(cats);
}

export async function POST(req: NextRequest) {
const body = await req.json();
  const { value, label, emoji, active, sortOrder } = body;
  if (!value || !label) {
    return NextResponse.json({ error: "value and label required" }, { status: 400 });
  }
  // Check duplicate value
  const existing = await dbGetAllCategories();
  if (existing.some(c => c.value === value.toLowerCase().trim())) {
    return NextResponse.json({ error: "Category value already exists" }, { status: 409 });
  }
  const cat = await dbCreateCategory({
    value: value.toLowerCase().trim(),
    label: label.trim(),
    emoji: emoji?.trim() || "📦",
    active: active !== false,
    sortOrder: sortOrder ?? existing.length,
  });
  return NextResponse.json(cat, { status: 201 });
}
