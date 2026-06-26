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
    if (error || !data?.data?.flashDeals) return NextResponse.json([]);

    const map = data.data.flashDeals as Record<string, FlashDeal>;
    const now = new Date();
    const active = Object.values(map).filter(d => {
      if (!d.active) return false;
      if (d.startAt && new Date(d.startAt) > now) return false;
      if (d.endsAt && new Date(d.endsAt) < now) return false;
      return true;
    });

    return NextResponse.json(active);
  } catch {
    return NextResponse.json([]);
  }
}
