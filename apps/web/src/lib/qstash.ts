// Delayed webhook scheduling via Upstash QStash — lets a Vercel serverless
// function "wait N seconds then call this URL" without depending on any
// client browser staying open. Requires env: QSTASH_TOKEN.
// If not configured, schedule() resolves { scheduled: false } so callers
// can degrade gracefully (missed-call escalation just won't fire).

export interface ScheduleResult {
  scheduled: boolean;
  messageId?: string;
  error?: string;
}

export async function scheduleDelayedWebhook(
  destinationUrl: string,
  body: Record<string, unknown>,
  delaySeconds: number,
): Promise<ScheduleResult> {
  const token = process.env.QSTASH_TOKEN;
  if (!token) return { scheduled: false, error: "QStash not configured" };
  const base = process.env.QSTASH_URL ?? "https://qstash.upstash.io";

  try {
    // QStash expects the raw destination URL appended after /v2/publish/ —
    // NOT percent-encoded (its router parses everything after that prefix
    // as the literal target URL, slashes included).
    const res = await fetch(`${base}/v2/publish/${destinationUrl}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Upstash-Delay": `${delaySeconds}s`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { scheduled: false, error: data.error ?? `QStash error ${res.status}` };
    }
    const data = await res.json().catch(() => ({}));
    return { scheduled: true, messageId: data.messageId };
  } catch (e) {
    return { scheduled: false, error: e instanceof Error ? e.message : String(e) };
  }
}
