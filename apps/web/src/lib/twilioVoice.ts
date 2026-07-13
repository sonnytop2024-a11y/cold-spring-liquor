// Outbound phone calls via Twilio Programmable Voice REST API (no SDK — plain fetch).
// Requires env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER.
// If not configured, placeCall resolves { called: false } without throwing so
// callers can degrade gracefully (missed-call escalation just won't fire).

export interface CallResult {
  called: boolean;
  callSid?: string;
  error?: string;
}

function normalizeUsPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export async function placeCall(
  to: string,
  twimlUrl: string,
  statusCallbackUrl: string,
): Promise<CallResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) {
    return { called: false, error: "Voice calling not configured" };
  }
  const toE164 = normalizeUsPhone(to);
  if (!toE164) return { called: false, error: `Invalid phone number: ${to}` };

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: toE164,
        From: from,
        Url: twimlUrl,
        StatusCallback: statusCallbackUrl,
        StatusCallbackEvent: "completed",
        StatusCallbackMethod: "POST",
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { called: false, error: data.message ?? `Twilio error ${res.status}` };
    }
    const data = await res.json();
    return { called: true, callSid: data.sid };
  } catch (e) {
    return { called: false, error: e instanceof Error ? e.message : String(e) };
  }
}
