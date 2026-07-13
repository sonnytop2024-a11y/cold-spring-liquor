// Missed Order Phone Call Alert — schedules a delayed server-side check
// (via QStash) that fires 60s after an order is placed. If the order is
// still "pending" when the check runs, it places a Twilio Voice call to
// the admin's alert phone. Runs entirely server-side so it keeps working
// even if the admin's browser/tab is closed.
import { scheduleDelayedWebhook } from "./qstash";
import type { StoreSettings } from "../app/api/_mock/store";

const CALL_DELAY_SECONDS = 60;

function webUrl(): string {
  // The bare apex domain (coldspringliquor.com) 308-redirects to www —
  // some webhook senders (Twilio included) mishandle redirects on POST,
  // so build webhook URLs against the canonical www host directly rather
  // than trusting NEXT_PUBLIC_WEB_URL (which resolves to the apex here).
  if (process.env.VERCEL_ENV === "production") return "https://www.coldspringliquor.com";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000";
}

export async function scheduleMissedCallCheck(
  orderId: string,
  attempt: number,
  settings: StoreSettings,
): Promise<void> {
  if (!settings.notifyCallEnabled || !settings.adminCallPhone) return;
  const maxAttempts = settings.callMaxAttempts ?? 3;
  if (attempt > maxAttempts) return;

  const destinationUrl = `${webUrl()}/api/admin/orders/${encodeURIComponent(orderId)}/call-check`;
  const result = await scheduleDelayedWebhook(destinationUrl, { orderId, attempt }, CALL_DELAY_SECONDS);
  if (!result.scheduled) {
    console.error("[missedCallAlert] failed to schedule call-check for", orderId, result.error);
  }
}
