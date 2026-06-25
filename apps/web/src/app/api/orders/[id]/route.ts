import { NextRequest, NextResponse } from "next/server";
import { dbGetOrder, dbUpdateOrder } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const order = await dbGetOrder(params.id);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const patch = await req.json();
  const updated = await dbUpdateOrder(params.id, patch);
  if (!updated) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json(updated);
}
