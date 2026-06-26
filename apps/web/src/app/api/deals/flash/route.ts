import { NextResponse } from "next/server";
import { dbGetActiveFlashDeals, dbGetAllFlashDeals } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.has("debug")) {
    const all = await dbGetAllFlashDeals();
    const active = await dbGetActiveFlashDeals();
    const now = new Date();
    return NextResponse.json({ now: now.toISOString(), all: all.length, active: active.length, deals: all });
  }
  return NextResponse.json(await dbGetActiveFlashDeals());
}
