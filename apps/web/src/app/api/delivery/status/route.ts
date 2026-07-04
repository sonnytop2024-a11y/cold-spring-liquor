import { NextResponse } from "next/server";
import { dbGetSettings } from "@/lib/db";

export const dynamic = "force-dynamic";

// Public: is Delivery accepting orders right now? (admin kill-switch)
// Checkout polls this so flipping the toggle reaches open sessions in seconds.
export async function GET() {
  const settings = await dbGetSettings();
  return NextResponse.json(
    { deliveryEnabled: settings.deliveryEnabled !== false },
    { headers: { "Cache-Control": "no-store" } },
  );
}
