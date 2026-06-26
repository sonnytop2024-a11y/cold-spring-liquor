import { NextResponse } from "next/server";
import { dbGetActiveFlashDeals, dbGetAllFlashDeals } from "@/lib/db";
import { supabaseServer } from "@/lib/supabase.server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.has("debug")) {
    const all = await dbGetAllFlashDeals();
    const now = new Date();
    // Direct Supabase read to compare
    const sb = supabaseServer();
    let rawRow: unknown = null;
    let rawError: unknown = null;
    if (sb) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (sb as any).from("csl_settings").select("id,data").eq("id", 2).maybeSingle();
      rawRow = data; rawError = error;
    }
    return NextResponse.json({ now: now.toISOString(), dbAll: all.length, rawRow, rawError });
  }
  return NextResponse.json(await dbGetActiveFlashDeals());
}
