import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase.server";

export async function GET(req: NextRequest) {
  const sb = supabaseServer();
  if (!sb) {
    return NextResponse.json({ supabase: false, error: "Missing SUPABASE env vars" });
  }

  try {
    // Count rows and get first 3 IDs to verify what's actually stored
    const { data: sample, error: sampleErr } = await (sb as any)
      .from("csl_products")
      .select("id, data->id as data_id")
      .limit(3);

    if (sampleErr) {
      return NextResponse.json({ supabase: true, read: false, readError: sampleErr.message });
    }

    // Count total rows
    const { count, error: countErr } = await (sb as any)
      .from("csl_products")
      .select("*", { count: "exact", head: true });

    // Test write + delete
    const testId = "__debug_test__";
    const { error: writeErr } = await (sb as any)
      .from("csl_products")
      .upsert({ id: testId, data: { id: testId, test: true } }, { onConflict: "id" });

    let writeOk = !writeErr;
    let deleteOk = false;

    if (writeOk) {
      const { data: delData, error: delErr } = await (sb as any)
        .from("csl_products")
        .delete()
        .eq("id", testId)
        .select("id");
      deleteOk = !delErr && Array.isArray(delData) && delData.length > 0;
    }

    return NextResponse.json({
      supabase: true,
      read: true,
      write: writeOk,
      delete: deleteOk,
      totalRows: countErr ? "error" : count,
      // First 3 rows: row_id = Supabase id column, data_id = id inside the JSONB
      sampleIds: sample?.map((r: Record<string, unknown>) => ({
        row_id: r.id,
        data_id: r.data_id,
        match: r.id === r.data_id,
      })),
      writeError: writeErr?.message,
    });
  } catch (e) {
    return NextResponse.json({ supabase: true, error: String(e) });
  }
}
