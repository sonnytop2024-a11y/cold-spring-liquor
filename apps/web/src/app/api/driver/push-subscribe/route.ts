import { NextRequest, NextResponse } from "next/server";
import { dbSaveDriverPushSub, dbDeleteDriverPushSub } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { driverId, subscription } = await req.json();
  if (!driverId || !subscription) return NextResponse.json({ error: "Missing driverId or subscription" }, { status: 400 });
  await dbSaveDriverPushSub(driverId, subscription);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { driverId } = await req.json().catch(() => ({}));
  if (driverId) await dbDeleteDriverPushSub(driverId);
  return NextResponse.json({ ok: true });
}
