import { NextRequest, NextResponse } from "next/server";
import { estimateDeliveryFromStoreAsync } from "@/lib/deliveryEstimate";

const MAX_DELIVERY_MILES = 10;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { street, city, state, zip } = body ?? {};

  if (!street && !city && !zip) {
    return NextResponse.json({ error: "Address required" }, { status: 400 });
  }

  if (!street || !/^\d+\s/.test(street.trim())) {
    return NextResponse.json({
      inRange: false,
      error: "Please provide a complete street address including your house or building number (e.g. 1221 Sonny Dr).",
    });
  }

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
