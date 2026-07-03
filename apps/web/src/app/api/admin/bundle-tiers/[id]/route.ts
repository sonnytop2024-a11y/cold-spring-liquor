import { NextRequest, NextResponse } from "next/server";
import { dbUpdateBundleTier, dbDeleteBundleTier } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
const body = await req.json();
  const updated = await dbUpdateBundleTier(params.id, body);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
const ok = await dbDeleteBundleTier(params.id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
