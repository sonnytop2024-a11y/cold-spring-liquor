import { NextRequest, NextResponse } from "next/server";
import { dbGetAllProducts, dbSaveManyProducts, dbGetSettings, dbSaveSettings } from "@/lib/db";
import { todayCT } from "@/lib/preorder";

// Nightly job (Vercel Cron, see vercel.json): every PRE-ORDER product's
// availableFrom moves forward by exactly one calendar day, every night,
// forever — until anh Sơn clears it himself once the bottle truly arrives.
//
// Why: without this, a forgotten pre-order date quietly arrives and the
// product starts selling as regular in-stock (anh Sơn, 10/08 — the whole
// point is to never let that happen by accident). Orders already placed are
// untouched — they snapshot their own date at order time and must stay
// exactly what was emailed to the customer (anh Sơn: "không có làm hoang
// mang khách nha").
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = todayCT();

  // Idempotency guard — a retried/duplicate cron fire (or a manual test hit)
  // on the same calendar day must not double-advance every date.
  const settings = await dbGetSettings();
  if (settings.preorderLastAdvanceDate === today) {
    return NextResponse.json({ skipped: true, reason: "already ran today", today });
  }

  const products = await dbGetAllProducts();
  const toAdvance = products.filter((p) => !!p.availableFrom);

  const advanced = toAdvance.map((p) => {
    const [y, m, d] = p.availableFrom!.split("-").map(Number);
    const next = new Date(Date.UTC(y, m - 1, d));
    next.setUTCDate(next.getUTCDate() + 1);
    const iso = next.toISOString().slice(0, 10); // yyyy-mm-dd
    return { ...p, availableFrom: iso };
  });

  const result = advanced.length > 0
    ? await dbSaveManyProducts(advanced)
    : { saved: 0, errors: [] };

  await dbSaveSettings({ preorderLastAdvanceDate: today });

  return NextResponse.json({
    today,
    advancedCount: advanced.length,
    saved: result.saved,
    errors: result.errors,
  });
}
