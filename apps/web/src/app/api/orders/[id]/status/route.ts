import { NextRequest, NextResponse } from "next/server";
import { store } from "../../../_mock/store";
import type { OrderStatus } from "../../../_mock/store";

const VALID_STATUSES: OrderStatus[] = [
  "pending","confirmed","preparing","driver_assigned","driver_at_store",
  "out_for_delivery","driver_arriving","driver_arrived","delivered","failed_delivery","cancelled",
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

  const now = new Date().toISOString();
  const order = store.getOrder(params.id);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const extra: Record<string, unknown> = {};
  if (driverId !== undefined) extra.driverId = driverId;
  if (ageVerified !== undefined) extra.ageVerified = ageVerified;
  if (signatureUrl !== undefined) extra.signatureUrl = signatureUrl;
  if (deliveryProof !== undefined) extra.deliveryProof = deliveryProof;
  if (failReason !== undefined) extra.failReason = failReason;
  if (deliveryConfirmations !== undefined) extra.deliveryConfirmations = deliveryConfirmations;

  // Record timestamp for this status transition
  const existingTimestamps = order.statusTimestamps ?? {};
  extra.statusTimestamps = { ...existingTimestamps, [status]: now };

  // Start wait timer when driver arrives
  if (status === "driver_arrived") {
    extra.waitTimerStart = now;
  }

  const updated = store.updateOrderStatus(params.id, status as OrderStatus, extra);
  if (!updated) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Create in-app notification for customer on key status changes
  const notifKey = NOTIFICATION_STATUSES[status];
  if (notifKey && updated.customerId) {
    const settings = store.getSettings();
    const message = settings[notifKey] as string;
    store.createNotification({
      orderId: updated.id,
      customerId: updated.customerId,
      orderNumber: updated.orderNumber,
      triggerStatus: status,
      message,
    });
  }

  return NextResponse.json(updated);
}
