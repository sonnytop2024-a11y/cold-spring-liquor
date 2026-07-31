import { NextRequest, NextResponse } from "next/server";
import { dbGetOrder, dbUpdateOrder } from "@/lib/db";
import { sendChatPushToDriver } from "@/lib/notify";

// In-app chat between the customer and the assigned driver, scoped to one
// order. Messages live on the order blob itself (order.chat) — both apps
// already poll the order every ~5s, so new messages ride that with no new
// table or realtime infra. No phone numbers involved (anh Sơn, 31/07).
//
// Rules:
// - Chat opens once a driver has accepted the order (order.driverId set)
// - Read-only after the order reaches a final status (delivered etc.)
// - Only "customer" and "driver" can write; admin reads via order detail

const FINAL_STATUSES = ["delivered", "failed_delivery", "cancelled", "refunded", "picked_up"];
const MAX_TEXT = 500;
const MAX_MESSAGES = 300;

export interface ChatMessage {
  id: string;
  from: "customer" | "driver";
  text: string;
  at: string; // ISO timestamp
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const from = body?.from;
  const text = typeof body?.text === "string" ? body.text.trim() : "";

  if (from !== "customer" && from !== "driver") {
    return NextResponse.json({ error: "from must be 'customer' or 'driver'" }, { status: 400 });
  }
  if (!text) return NextResponse.json({ error: "Message is empty" }, { status: 400 });
  if (text.length > MAX_TEXT) {
    return NextResponse.json({ error: `Message too long (max ${MAX_TEXT} characters)` }, { status: 400 });
  }

  const order = await dbGetOrder(params.id);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.orderType === "pickup") {
    return NextResponse.json({ error: "Chat is only available on delivery orders" }, { status: 400 });
  }
  if (!order.driverId) {
    return NextResponse.json({ error: "Chat opens once a driver accepts the order" }, { status: 400 });
  }
  if (FINAL_STATUSES.includes(order.status)) {
    return NextResponse.json({ error: "This order is complete — chat is closed" }, { status: 400 });
  }

  const chat = (order as any).chat ?? { messages: [] };
  const msg: ChatMessage = {
    id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    from,
    text,
    at: new Date().toISOString(),
  };
  chat.messages = [...(chat.messages ?? []), msg].slice(-MAX_MESSAGES);
  // The sender has obviously read everything up to their own message
  if (from === "customer") chat.customerReadAt = msg.at;
  else chat.driverReadAt = msg.at;

  const updated = await dbUpdateOrder(params.id, { chat });
  if (!updated) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Customer → driver: web push (driver may have the app backgrounded).
  // Driver → customer: nothing to push — the tracking page polls every 5s.
  if (from === "customer") {
    sendChatPushToDriver(order.driverId, order.orderNumber, text).catch(() => {});
  }

  return NextResponse.json({ chat });
}

// Mark the conversation read for one side (clears their unread badge)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const role = body?.role;
  if (role !== "customer" && role !== "driver") {
    return NextResponse.json({ error: "role must be 'customer' or 'driver'" }, { status: 400 });
  }
  const order = await dbGetOrder(params.id);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const chat = (order as any).chat ?? { messages: [] };
  if (role === "customer") chat.customerReadAt = new Date().toISOString();
  else chat.driverReadAt = new Date().toISOString();
  await dbUpdateOrder(params.id, { chat });
  return NextResponse.json({ ok: true });
}
