import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { store } from "../../_mock/store";

const SECRET = process.env.OTP_SECRET ?? "csl-otp-secret-2024";
const WINDOW = 5 * 60 * 1000; // 5-minute windows

function generateOtp(phone: string, windowTs: number): string {
  const hash = createHmac("sha256", SECRET)
    .update(`${phone}:${windowTs}`)
    .digest("hex");
  return (parseInt(hash.slice(0, 8), 16) % 1000000).toString().padStart(6, "0");
}

function currentWindow(): number {
  return Math.floor(Date.now() / WINDOW);
}

async function sendSms(to: string, body: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) throw new Error("Twilio not configured");
  const twilio = (await import("twilio")).default;
  const client = twilio(sid, token);
  await client.messages.create({ body, from, to });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, phone, code, name } = body;

  if (action === "send") {
    if (!phone) return NextResponse.json({ error: "Phone required" }, { status: 400 });
    const normalizedPhone = phone.startsWith("+") ? phone : `+1${phone.replace(/\D/g, "")}`;
    const otp = generateOtp(normalizedPhone, currentWindow());

    if (process.env.TWILIO_ACCOUNT_SID) {
      try {
        await sendSms(normalizedPhone, `Your Cold Spring Liquor verification code is: ${otp}`);
        return NextResponse.json({ ok: true, message: `OTP sent to ${normalizedPhone}` });
      } catch {
        return NextResponse.json({ error: "Failed to send SMS. Check your phone number." }, { status: 500 });
      }
    }

    // Demo fallback
    return NextResponse.json({ ok: true, mockOtp: otp, message: `OTP sent to ${normalizedPhone}` });
  }

  if (action === "verify") {
    if (!phone || !code) return NextResponse.json({ error: "Phone and code required" }, { status: 400 });
    const normalizedPhone = phone.startsWith("+") ? phone : `+1${phone.replace(/\D/g, "")}`;

    const win = currentWindow();
    const valid = code === generateOtp(normalizedPhone, win) || code === generateOtp(normalizedPhone, win - 1);
    if (!valid) return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 401 });

    let user = store.getUserByPhone(normalizedPhone);
    if (!user) {
      user = store.createUser({
        name: name ?? `User ${normalizedPhone.slice(-4)}`,
        email: "",
        phone: normalizedPhone,
        dob: "",
        password: `otp-${Date.now()}`,
      });
    }

    const token = store.createSession(user.id);
    const { passwordHash: _ph, ...safe } = user;
    const res = NextResponse.json({ user: safe });
    res.cookies.set("csl-session", token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return res;
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
