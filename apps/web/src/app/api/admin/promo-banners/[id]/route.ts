import { NextRequest, NextResponse } from "next/server";
import { dbUpdatePromoBanner, dbDeletePromoBanner } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { name, positionCategory, image, destType, destValue, priority, active, startDate, endDate } = body;
  const updated = await dbUpdatePromoBanner(params.id, {
    ...(name !== undefined && { name }),
    ...(positionCategory !== undefined && { positionCategory }),
    ...(image !== undefined && { image: image || undefined }),
    ...(destType !== undefined && { destType }),
    ...(destValue !== undefined && { destValue }),
    ...(priority !== undefined && { priority: Number(priority) || 0 }),
    ...(active !== undefined && { active }),
    // empty string clears the date restriction
    ...(startDate !== undefined && { startDate: startDate || undefined }),
    ...(endDate !== undefined && { endDate: endDate || undefined }),
  });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const ok = await dbDeletePromoBanner(params.id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
