// Twilio status callback — fired when the call ends. Updates the matching
// missedCallAlerts entry (by CallSid) so Admin can see answered vs missed.
import { NextRequest, NextResponse } from "next/server";
import { dbGetOrder, dbUpdateOrder } from "@/lib/db";
import type { MissedCallAlert } from "../../../../_mock/store";

function mapCallStatus(twilioStatus: string): MissedCallAlert["status"] {
  switch (twilioStatus) {
    case "completed": return "answered";
    case "no-answer": return "no-answer";
    case "busy": return "busy";
    default: return "failed"; // failed, canceled
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const form = await req.formData();
  const callSid = form.get("CallSid")?.toString();
  const callStatus = form.get("CallStatus")?.toString() ?? "";

  const order = await dbGetOrder(params.id);
  if (!order || !callSid) return NextResponse.json({ ok: true });

  const alerts = order.missedCallAlerts ?? [];
  const idx = alerts.findIndex(a => a.callSid === callSid);
  if (idx === -1) return NextResponse.json({ ok: true });

  const status = mapCallStatus(callStatus);
  const updated: MissedCallAlert = {
    ...alerts[idx],
    status,
    answeredAt: status === "answered" ? new Date().toISOString() : alerts[idx].answeredAt,
  };
  const newAlerts = [...alerts];
  newAlerts[idx] = updated;

  await dbUpdateOrder(params.id, { missedCallAlerts: newAlerts });
  return NextResponse.json({ ok: true });
}
