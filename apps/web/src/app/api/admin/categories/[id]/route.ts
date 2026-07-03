import { NextRequest, NextResponse } from "next/server";
import { dbUpdateCategory, dbDeleteCategory, dbGetAllCategories, dbReorderCategories } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
const body = await req.json();
  const { id } = params;

  // Special: reorder action
  if (body.action === "reorder" && Array.isArray(body.orderedIds)) {
    await dbReorderCategories(body.orderedIds);
    return NextResponse.json({ ok: true });
  }

  const { label, emoji, active, sortOrder, value } = body;
  const updated = await dbUpdateCategory(id, {
    ...(label !== undefined && { label: label.trim() }),
    ...(emoji !== undefined && { emoji: emoji.trim() }),
    ...(active !== undefined && { active }),
    ...(sortOrder !== undefined && { sortOrder }),
    ...(value !== undefined && { value: value.toLowerCase().trim() }),
  });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
// Prevent deleting if it's a system category that products depend on
  const all = await dbGetAllCategories();
  const cat = all.find(c => c.id === params.id);
  if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await dbDeleteCategory(params.id);
  return NextResponse.json({ ok: true });
}
