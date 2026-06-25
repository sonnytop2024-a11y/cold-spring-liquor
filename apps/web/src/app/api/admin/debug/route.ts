import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase.server";

export async function GET(_req: NextRequest) {
  const sb = supabaseServer();
  if (!sb) {
    return NextResponse.json({ supabase: false, error: "Missing SUPABASE env vars" });
  }

  try {
    // Count total rows
    const { count } = await (sb as any)
      .from("csl_products")
      .select("*", { count: "exact", head: true });

    // Get 5 sample rows with BOTH columns to compare row id vs data.id
    const { data: sample, error: sampleErr } = await (sb as any)
      .from("csl_products")
      .select("id, data")
      .limit(5);

    if (sampleErr) {
      return NextResponse.json({ supabase: true, sampleError: sampleErr.message, totalRows: count });
    }

    // Check if Supabase row id column matches the id inside the data JSONB
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sampleIds = sample?.map((r: any) => ({
      row_id: r.id,
      data_id: r.data?.id ?? "(missing)",
      match: r.id === r.data?.id,
    }));

    const allMatch = sampleIds?.every((s: { match: boolean }) => s.match);

    return NextResponse.json({
      supabase: true,
      totalRows: count,
      idsMismatch: !allMatch,
      sampleIds,
      // If ids don't match, delete/edit by data.id will fail (hits 0 rows)
      diagnosis: !allMatch
        ? "PROBLEM: row id != data.id → delete/edit calls wrong id. Need to re-import or run SQL fix."
        : "OK: row id matches data.id — delete/edit should work.",
    });
  } catch (e) {
    return NextResponse.json({ supabase: true, error: String(e) });
  }
}
