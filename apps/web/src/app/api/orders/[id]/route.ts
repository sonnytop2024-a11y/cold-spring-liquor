import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { dbGetOrder, dbUpdateOrder, dbOverlayCurrentProductImages } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const order = await dbGetOrder(params.id);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Lazily backfill the card's brand + last4 from Stripe so Order History can
  // show "Visa •••• 4242" instead of the word "stripe" (anh Sơn, 31/07).
  // One Stripe call per order ever — the result is persisted onto the order.
  if (order.stripePaymentIntentId && !order.cardLast4 && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" });
      const pi = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId, { expand: ["latest_charge"] });
      const card = (pi.latest_charge as Stripe.Charge | null)?.payment_method_details?.card;
      if (card?.last4) {
        order.cardLast4 = card.last4;
        order.cardBrand = card.brand ?? undefined;
        await dbUpdateOrder(params.id, { cardLast4: order.cardLast4, cardBrand: order.cardBrand });
      }
    } catch {
      // Stripe unreachable or old intent — the page falls back to "Card"
    }
  }

  const [withImages] = await dbOverlayCurrentProductImages([order]);
  return NextResponse.json(withImages);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const patch = await req.json();
  const updated = await dbUpdateOrder(params.id, patch);
  if (!updated) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json(updated);
}
