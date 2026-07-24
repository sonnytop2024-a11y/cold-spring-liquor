import { NextRequest, NextResponse } from "next/server";
import { processOrder } from "@/lib/processOrder";

// Dry-run of order creation: every rejection check (stock, min order, pickup
// window, address/radius) with zero writes. The Stripe checkout calls this
// right before confirmPayment so the customer sees problems BEFORE being
// charged — same protection the PayPal capture route runs server-side.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const sessionToken = req.cookies.get("csl-session")?.value ?? null;
  try {
    const result = await processOrder(body, sessionToken, { validateOnly: true });
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Fail open: if the validator itself hiccups, don't block the payment —
    // the post-payment auto-refund in /api/orders is the safety net.
    console.error("[orders/validate] crashed:", err);
    return NextResponse.json({ ok: true });
  }
}
