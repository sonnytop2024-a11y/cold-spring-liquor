import { NextRequest, NextResponse } from "next/server";
import { dbGetAllBanners, dbSaveBanner, dbDeleteBanner } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
const { id } = params;
  const body = await req.json();

  const all = await dbGetAllBanners();
  const existing = all.find(b => b.id === id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = { ...existing, ...body, id };
  await dbSaveBanner(updated);
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
const deleted = await dbDeleteBanner(params.id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
