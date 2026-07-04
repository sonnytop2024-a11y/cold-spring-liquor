import { NextResponse } from "next/server";
import { dbGetSettings } from "@/lib/db";

export const dynamic = "force-dynamic";

// Public store config for checkout — polled every 10s so Admin Settings
// changes (delivery on/off, radius, times, minimum order…) reach open
// sessions within seconds.
export async function GET() {
  const s = await dbGetSettings();
  return NextResponse.json(
    {
      deliveryEnabled: s.deliveryEnabled !== false,
      radiusMiles: Number(s.deliveryRadius) > 0 ? Number(s.deliveryRadius) : 10,
      timeMin: Number(s.deliveryTimeMin) > 0 ? Number(s.deliveryTimeMin) : 10,
      timeMax: Number(s.deliveryTimeMax) > 0 ? Number(s.deliveryTimeMax) : 30,
      minOrder: Number(s.minOrderAmount) >= 0 ? Number(s.minOrderAmount) : 20,
      freeDelivery: s.freeDeliveryEnabled !== false,
      noTipRequired: s.noTipRequired !== false,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
