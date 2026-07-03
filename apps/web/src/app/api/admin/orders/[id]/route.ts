import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { dbGetOrder, dbUpdateOrder, dbGetUserById, dbSaveUser, dbGetGiftCard, dbSaveGiftCard, dbGetProduct, dbUpdateProduct } from "@/lib/db";
import type { OrderStatus } from "../../../_mock/store";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-04-10" });

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const order = await dbGetOrder(params.id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const order = await dbGetOrder(params.id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { status, items, deliveryAddress, cancelReason, refundType, refundAmount, driverId, note } = body;

  const patch: Record<string, unknown> = {};
  if (status) patch.status = status as OrderStatus;
  if (items) {
    const subtotal = items.reduce((a: number, i: { price: number; quantity: number }) => a + i.price * i.quantity, 0);
    const tax = +(subtotal * 0.0825).toFixed(2);
    patch.items = items;
    patch.subtotal = subtotal;
    patch.tax = tax;
    patch.total = +(subtotal + tax).toFixed(2);
  }
  if (deliveryAddress) patch.deliveryAddress = deliveryAddress;
  if (driverId !== undefined) patch.driverId = driverId;
  if (cancelReason) patch.cancelReason = cancelReason;
  if (refundType) patch.refundType = refundType;
  if (note) patch.adminNote = note;

  // Process Stripe refund when cancelling with refund
  if (status === "cancelled" && refundType && refundType !== "none" && order.stripePaymentIntentId) {
    try {
      const amountCents =
        refundType === "full"
          ? Math.round(order.total * 100)
          : Math.round(Number(refundAmount ?? 0) * 100);

      if (amountCents > 0) {
        const refund = await stripe.refunds.create({
          payment_intent: order.stripePaymentIntentId,
          amount: refundType === "full" ? undefined : amountCents, // undefined = full refund
        });
        patch.stripeRefundId = refund.id;
        patch.refundStatus = refund.status; // "succeeded" | "pending" | "failed"
        patch.refundedAt = new Date().toISOString();
        patch.refundedAmount = refund.amount / 100;
        // Mark as refunded if full refund succeeded
        if (refundType === "full" && refund.status === "succeeded") {
          patch.status = "refunded";
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[admin/orders] Stripe refund failed:", msg);
      return NextResponse.json({ error: `Refund failed: ${msg}` }, { status: 502 });
    }
  }

  // When cancelling → return the items to inventory (once)
  if (status === "cancelled" && !order.inventoryRestocked) {
    for (const item of order.items ?? []) {
      try {
        const product = item.productId ? await dbGetProduct(item.productId) : undefined;
        if (product) {
          const newQty = (product.stockQty ?? 0) + item.quantity;
          await dbUpdateProduct(product.id, { stockQty: newQty, inStock: true });
        }
      } catch (e) {
        console.error("[admin/orders] restock failed for", item.productId, e);
      }
    }
    patch.inventoryRestocked = true;
  }

  // When cancelling (full or partial refund) → restore rewards points + gift card balance
  const isCancelling = status === "cancelled" && refundType && refundType !== "none";
  if (isCancelling) {
    // 1. Restore reward points
    const pointsUsed = order.rewardsPointsToRedeem ?? 0;
    if (pointsUsed > 0 && order.customerId) {
      const user = await dbGetUserById(order.customerId);
      if (user) {
        const newPoints = user.points + pointsUsed;
        await dbSaveUser({
          ...user,
          points: newPoints,
          tier: newPoints >= 3000 ? "Platinum" : newPoints >= 1500 ? "Gold" : newPoints >= 500 ? "Silver" : "Bronze",
        });
        patch.pointsRestored = pointsUsed;
      }
    }

    // 2. Restore gift card balance
    const gcCode = order.giftCardCode;
    const gcAmount = order.giftCardAmount ?? 0;
    if (gcCode && gcAmount > 0) {
      const card = await dbGetGiftCard(gcCode);
      if (card) {
        const newBalance = +(card.remainingBalance + gcAmount).toFixed(2);
        await dbSaveGiftCard({
          ...card,
          remainingBalance: newBalance,
          status: newBalance >= card.originalAmount ? "active" : "partial",
        });
        patch.giftCardRestored = gcAmount;
      }
    }
  }

  const updated = await dbUpdateOrder(params.id, patch as any);
  return NextResponse.json(updated);
}
