import { NextRequest, NextResponse } from "next/server";
import { SERVICE_CITIES } from "../../_mock/data";
import { getDeliveryTiming } from "@/lib/deliveryTiming";

export async function POST(req: NextRequest) {
  const { address, city } = await req.json();
  const input = (city || address || "").toLowerCase();
  const available = SERVICE_CITIES.some(c => input.includes(c));
  const timing = getDeliveryTiming();

  return NextResponse.json({
    available,
    message: available
      ? "Great news! We deliver to your area. FREE delivery, no tip required!"
      : "Sorry, we currently only deliver to Leander, Cedar Park, and Liberty Hill, TX.",
    estimatedTime: available ? timing.label : null,
    deliveryType: available ? timing.type : null,
    deliveryMessage: available ? timing.message : null,
    isStoreClosed: timing.isStoreClosed,
    deliveryFee: 0,
  });
}
