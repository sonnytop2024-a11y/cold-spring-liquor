import { NextRequest, NextResponse } from "next/server";
import { estimateDeliveryFromStoreAsync } from "@/lib/deliveryEstimate";
import { dbGetSettings } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { street, city, state, zip } = body ?? {};

  if (!street && !city && !zip) {
    return NextResponse.json({ error: "Address required" }, { status: 400 });
  }

  if (!street || !/^\d+\s+[A-Za-z]/.test(street.trim())) {
    return NextResponse.json({
      inRange: false,
      error: "Please provide a complete street address including your house or building number (e.g. 1221 Sonny Dr).",
    });
  }

  // Delivery-only — reject pickup/placeholder addresses like "101 - Will Pick Up"
  const streetLower = street.toLowerCase().replace(/[^a-z ]/g, " ");
  const PICKUP_WORDS = ["pickup", "pick up", "will call", "willcall", "in store", "instore", "store pickup", "n a", "none"];
  if (PICKUP_WORDS.some((w: string) => streetLower.includes(w))) {
    return NextResponse.json({
      inRange: false,
      error: "Looking to pick up in store? Use our Pick Up checkout and save 5% — or enter a valid street address for delivery.",
    });
  }

  const settings = await dbGetSettings();
  const MAX_DELIVERY_MILES = Number(settings.deliveryRadius) > 0 ? Number(settings.deliveryRadius) : 10;
  const { distanceMiles } = await estimateDeliveryFromStoreAsync({ street, city, state, zip });

  if (distanceMiles > MAX_DELIVERY_MILES) {
    return NextResponse.json({
      inRange: false,
      distanceMiles,
      error: `Sorry, we only deliver within ${MAX_DELIVERY_MILES} miles of our store. Your address is ${distanceMiles} miles away. We currently deliver to Leander, Cedar Park, and Liberty Hill, TX.`,
    });
  }

  return NextResponse.json({ inRange: true, distanceMiles });
}
