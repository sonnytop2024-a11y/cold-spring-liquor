// QStash calls this 60s after an order is placed (and again after each
// retry). Fresh DB read each time — if the order was accepted/cancelled
// in the meantime, this is a no-op. Runs server-side only, independent
// of whether the admin's browser is open.
import { NextRequest, NextResponse } from "next/server";
import { dbGetOrder, dbUpdateOrder, dbGetSettings } from "@/lib/db";
import { placeCall } from "@/lib/twilioVoice";
import { scheduleMissedCallCheck } from "@/lib/missedCallAlert";
import type { MissedCallAlert } from "../../../../_mock/store";

function webUrl(): string {
  if (process.env.VERCEL_ENV === "production") return "https://www.coldspringliquor.com";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000";
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const attempt: number = body.attempt ?? 1;

  const order = await dbGetOrder(params.id);
  if (!order) return NextResponse.json({ ok: true, skipped: "not_found" });
  if (order.status !== "pending") return NextResponse.json({ ok: true, skipped: "no_longer_pending" });

  const settings = await dbGetSettings();
  if (!settings.notifyCallEnabled || !settings.adminCallPhone) {
    return NextResponse.json({ ok: true, skipped: "not_configured" });
  }

  const twimlUrl = `${webUrl()}/api/admin/orders/${encodeURIComponent(params.id)}/call-twiml`;
  const statusCallbackUrl = `${webUrl()}/api/admin/orders/${encodeURIComponent(params.id)}/call-status?attempt=${attempt}`;

  const result = await placeCall(settings.adminCallPhone, twimlUrl, statusCallbackUrl);

  if (result.called) {
    const entry: MissedCallAlert = {
      attempt,
      calledAt: new Date().toISOString(),
      status: "sent",
      callSid: result.callSid,
    };
    await dbUpdateOrder(params.id, {
      missedCallAlerts: [...(order.missedCallAlerts ?? []), entry],
    });
  } else {
    console.error("[call-check] placeCall failed for order", params.id, result.error);
  }

  const maxAttempts = settings.callMaxAttempts ?? 3;
  if (attempt < maxAttempts) {
    await scheduleMissedCallCheck(params.id, attempt + 1, settings);
  }

  return NextResponse.json({ ok: true, called: result.called });
}
