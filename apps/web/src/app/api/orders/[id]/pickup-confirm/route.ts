import { NextRequest, NextResponse } from "next/server";
import { dbGetOrder, dbUpdateOrder } from "@/lib/db";
import { verifySessionToken } from "@/lib/session";

// Customer self-confirms they picked up their order.
// Allowed only when the order is a pickup order in "ready_for_pickup" state.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const order = await dbGetOrder(params.id);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.orderType !== "pickup") {
    return NextResponse.json({ error: "Not a pickup order" }, { status: 400 });
  }
  if (order.status !== "ready_for_pickup") {
    return NextResponse.json({ error: "Order is not ready for pickup yet" }, { status: 409 });
  }

  // If the order belongs to an account, only that account may confirm.
  // Guest orders are confirmable by anyone holding the order link.
  if (order.customerId) {
    const token = req.cookies.get("csl-session")?.value;
    const userId = token ? verifySessionToken(token) : null;
    if (userId !== order.customerId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
  }

  const updated = await dbUpdateOrder(params.id, {
    status: "picked_up",
    pickedUpAt: new Date().toISOString(),
  });
  return NextResponse.json(updated);
}
