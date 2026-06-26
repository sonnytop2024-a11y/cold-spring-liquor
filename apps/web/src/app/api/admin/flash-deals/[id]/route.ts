import { requireAdminAuth } from "@/lib/adminAuth";
import { NextRequest, NextResponse } from "next/server";
import { store } from "../../../_mock/store";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const authErr = requireAdminAuth(req); if (authErr) return authErr;
  const body = await req.json();
  const updated = store.updateFlashDeal(params.id, body);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ok = store.deleteFlashDeal(params.id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
