import { NextRequest, NextResponse } from "next/server";
import { store } from "../../../_mock/store";
import { dbGetOrder, dbUpdateOrder } from "@/lib/db";
import { sendPickupReady } from "@/lib/email";
import { sendSms } from "@/lib/sms";
import type { OrderStatus } from "../../../_mock/store";

const VALID_STATUSES: OrderStatus[] = [
  "pending","confirmed","preparing","driver_assigned","driver_at_store",
  "out_for_delivery","driver_arriving","driver_arrived","delivered","failed_delivery","cancelled",
  "ready_for_pickup","picked_up",
];

const NOTIFICATION_STATUSES: Record<string, keyof { msgOnTheWay: string; msgArrivingSoon: string; msgArrived: string }> = {
  out_for_delivery: "msgOnTheWay",
  driver_arriving:  "msgArrivingSoon",
  driver_arrived:   "msgArrived",
};

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { status, driverId, ageVerified, signatureUrl, deliveryProof, failReason, deliveryConfirmations } = body;

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const order = await dbGetOrder(params.id);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    status,
    statusTimestamps: { ...(order.statusTimestamps ?? {}), [status]: now },
  };

  if (driverId !== undefined) patch.driverId = driverId;
  if (ageVerified !== undefined) patch.ageVerified = ageVerified;
  if (signatureUrl !== undefined) patch.signatureUrl = signatureUrl;
  if (deliveryProof !== undefined) patch.deliveryProof = deliveryProof;
  if (failReason !== undefined) patch.failReason = failReason;
  if (deliveryConfirmations !== undefined) patch.deliveryConfirmations = deliveryConfirmations;
  if (status === "driver_arrived") patch.waitTimerStart = now;

  // Set ETA only when order is first accepted (pending → confirmed) for same-day delivery orders
  if (status === "confirmed" && order.orderType !== "pickup" && order.deliveryType === "same-day" && !order.estimatedDelivery) {
    patch.estimatedDelivery = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  }
  if (status === "picked_up") patch.pickedUpAt = now;

  // Ready for Pick Up → notify customer by email + SMS (once)
  if (status === "ready_for_pickup" && order.orderType === "pickup") {
    if (!order.readyEmailSent) {
      const emailOk = await sendPickupReady(order);
      patch.readyEmailSent = emailOk;
    }
    if (!order.readySmsSent && order.customerPhone) {
      const sms = await sendSms(
        order.customerPhone,
        "Your Cold Spring Liquor order is ready for pick up. Please visit the store during your selected pickup window and bring a valid ID.",
      );
      patch.readySmsSent = sms.sent;
      if (!sms.sent) console.warn("[status] pickup SMS not sent:", sms.error);
    }
  }

  const updated = await dbUpdateOrder(params.id, patch as any);
  if (!updated) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // In-app notification when pickup order becomes ready
  if (status === "ready_for_pickup" && updated.customerId) {
    store.createNotification({
      orderId: updated.id,
      customerId: updated.customerId,
      orderNumber: updated.orderNumber,
      triggerStatus: status,
      message: "Your order is ready for pick up! Visit us during your pickup window and bring a valid 21+ photo ID.",
    });
  }

  // Create in-app notification for customer
  const notifKey = NOTIFICATION_STATUSES[status];
  if (notifKey && updated.customerId) {
    const settings = store.getSettings();
    store.createNotification({
      orderId: updated.id,
      customerId: updated.customerId,
      orderNumber: updated.orderNumber,
      triggerStatus: status,
      message: settings[notifKey] as string,
    });
  }

  return NextResponse.json(updated);
}
