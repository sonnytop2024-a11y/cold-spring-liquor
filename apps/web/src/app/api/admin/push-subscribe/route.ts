import { NextRequest, NextResponse } from "next/server";
import { dbSaveSettings } from "@/lib/db";

export async function POST(req: NextRequest) {
try {
    const sub = await req.json();
    if (!sub?.endpoint) return NextResponse.json({ ok: false }, { status: 400 });
    await dbSaveSettings({ pushSubscription: sub });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
await dbSaveSettings({ pushSubscription: null });
  return NextResponse.json({ ok: true });
}
