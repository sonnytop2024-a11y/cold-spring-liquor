import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase.server";

export const dynamic = "force-dynamic";

interface FlashDeal {
  id: string; name: string; brand: string; slug: string;
  price: number; salePrice: number; imageUrl: string | null;
  volume: string; stockQty: number; maxStock: number;
  active: boolean; startAt: string | null; endsAt: string | null;
  createdAt: string; productId?: string | null;
}

export async function GET() {
  const sb = supabaseServer();
  if (!sb) return NextResponse.json([]);

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (sb as any).from("csl_settings").select("data").eq("id", 1).maybeSingle();
    const now = new Date();
    const flashDeals = data?.data?.flashDeals;
    const dealCount = flashDeals ? Object.keys(flashDeals).length : -1;
    if (error) return NextResponse.json({ _err: String(error?.message), now: now.toISOString() });
    if (!flashDeals) return NextResponse.json({ _err: "no flashDeals field", dataKeys: data?.data ? Object.keys(data.data) : null, now: now.toISOString() });
    if (dealCount === 0) return NextResponse.json({ _err: "flashDeals is empty {}", now: now.toISOString() });

    const map = flashDeals as Record<string, FlashDeal>;
    const active = Object.values(map).filter(d => {
      if (!d.active) return false;
      if (d.startAt && new Date(d.startAt) > now) return false;
      if (d.endsAt && new Date(d.endsAt) < now) return false;
      return true;
    });

    return NextResponse.json(active);
  } catch (e) {
    return NextResponse.json({ _err: String(e) });
  }
}
