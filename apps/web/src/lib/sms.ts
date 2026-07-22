// SMS via Twilio REST API (no SDK — plain fetch).
// Requires env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER.
// If not configured, sendSms resolves { sent: false } without throwing so
// callers can degrade gracefully (email still goes out).

export interface SmsResult {
  sent: boolean;
  error?: string;
}

function normalizeUsPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export async function sendSms(to: string, bodyText: string): Promise<SmsResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) {
    return { sent: false, error: "SMS not configured" };
  }
  const toE164 = normalizeUsPhone(to);
  if (!toE164) return { sent: false, error: `Invalid phone number: ${to}` };

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: toE164, From: from, Body: bodyText }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { sent: false, error: data.message ?? `Twilio error ${res.status}` };
    }
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : String(e) };
  }
}
