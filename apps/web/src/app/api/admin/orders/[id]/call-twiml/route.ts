// Twilio fetches this URL when the outbound alert call connects — the
// returned TwiML <Say> is what plays to whoever answers.
import { NextRequest, NextResponse } from "next/server";
import { dbGetOrder } from "@/lib/db";

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function respond(orderId: string) {
  const order = await dbGetOrder(orderId);
  const orderNumber = order?.orderNumber ?? "unknown";
  const total = order ? order.total.toFixed(2) : "0.00";
  const message = `You have a new order from Cold Spring Liquor. Order number ${escapeXml(orderNumber)}. Total amount ${total} dollars. Please open Admin Panel to accept the order.`;

  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">${message}</Say></Response>`;
  return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return respond(params.id);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return respond(params.id);
}
