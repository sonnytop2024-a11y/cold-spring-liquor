import { NextRequest, NextResponse } from "next/server";
import { store, OrderStatus } from "../../../_mock/store";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const order = store.getOrder(params.id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const order = store.getOrder(params.id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { status, items, deliveryAddress, cancelReason, refundType, driverId, note } = body;

  const updates: Record<string, unknown> = {};

  if (status) updates.status = status as OrderStatus;
  if (items) {
    const subtotal = items.reduce((a: number, i: { price: number; quantity: number }) => a + i.price * i.quantity, 0);
    const tax = +(subtotal * 0.0825).toFixed(2);
    const total = +(subtotal + tax).toFixed(2);
    updates.items = items;
    updates.subtotal = subtotal;
    updates.tax = tax;
    updates.total = total;
  }
  if (deliveryAddress) updates.deliveryAddress = deliveryAddress;
  if (driverId !== undefined) updates.driverId = driverId;
  if (cancelReason) updates.cancelReason = cancelReason;
  if (refundType) updates.refundType = refundType;
  if (note) updates.adminNote = note;

  const updated = store.updateOrderStatus(params.id, (status ?? order.status) as OrderStatus, updates);
  return NextResponse.json(updated);
}
