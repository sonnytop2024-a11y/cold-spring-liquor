import { NextRequest, NextResponse } from "next/server";
import { dbGetOrder, dbUpdateOrder } from "@/lib/db";
import type { OrderStatus } from "../../../_mock/store";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const order = await dbGetOrder(params.id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const order = await dbGetOrder(params.id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { status, items, deliveryAddress, cancelReason, refundType, driverId, note } = body;

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

  const updated = await dbUpdateOrder(params.id, patch as any);
  return NextResponse.json(updated);
}
