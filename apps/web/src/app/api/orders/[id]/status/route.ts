import { NextRequest, NextResponse } from "next/server";
import { store } from "../../../_mock/store";
import { dbGetOrder, dbUpdateOrder } from "@/lib/db";
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

  const updated = await dbUpdateOrder(params.id, patch as any);
  if (!updated) return NextResponse.json({ error: "Order not found" }, { status: 404 });

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
