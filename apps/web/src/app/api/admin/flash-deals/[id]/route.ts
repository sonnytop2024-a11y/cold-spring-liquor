import { NextRequest, NextResponse } from "next/server";
import { dbGetAllFlashDeals, dbSaveFlashDeal, dbDeleteFlashDeal } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
const body = await req.json();
  const all = await dbGetAllFlashDeals();
  const existing = all.find(d => d.id === params.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const updated = { ...existing, ...body, id: params.id };
  await dbSaveFlashDeal(updated);
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
const ok = await dbDeleteFlashDeal(params.id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
