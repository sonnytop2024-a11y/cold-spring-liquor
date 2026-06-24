import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase.server";

export async function GET() {
  const sb = supabaseServer();
  if (!sb) {
    return NextResponse.json({ supabase: false, error: "Missing SUPABASE env vars" });
  }

  try {
    // Test read
    const { data: readData, error: readErr } = await (sb as any)
      .from("csl_products")
      .select("id")
      .limit(1);

    if (readErr) {
      return NextResponse.json({ supabase: true, read: false, readError: readErr.message });
    }

    // Test write (upsert a sentinel row)
    const testId = "__debug_test__";
    const { error: writeErr } = await (sb as any)
      .from("csl_products")
      .upsert({ id: testId, data: { id: testId, test: true } }, { onConflict: "id" });

    if (writeErr) {
      return NextResponse.json({
        supabase: true, read: true, rowCount: readData?.length ?? 0,
        write: false, writeError: writeErr.message,
      });
    }

    // Clean up sentinel row
    await (sb as any).from("csl_products").delete().eq("id", testId);

    return NextResponse.json({
      supabase: true,
      read: true,
      write: true,
      rowCount: readData?.length ?? 0,
    });
  } catch (e) {
    return NextResponse.json({ supabase: true, error: String(e) });
  }
}
