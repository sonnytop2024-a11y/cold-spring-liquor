import { NextRequest, NextResponse } from "next/server";
import { store } from "../../_mock/store";

// POST /api/auth/otp/send — generate OTP
// POST /api/auth/otp/verify — verify OTP and login/register

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, phone, code, name } = body;

  if (action === "send") {
    if (!phone) return NextResponse.json({ error: "Phone required" }, { status: 400 });
    const otp = store.generateOTP(phone);
    // In production: send SMS. In mock: return the code so UI can show it.
    return NextResponse.json({ ok: true, mockOtp: otp, message: `OTP sent to ${phone}` });
  }

  if (action === "verify") {
    if (!phone || !code) return NextResponse.json({ error: "Phone and code required" }, { status: 400 });
    const valid = store.verifyOTP(phone, code);
    if (!valid) return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 401 });

    // Find or create user by phone
    let user = store.getUserByPhone(phone);
    if (!user) {
      // New user — create with minimal info
      user = store.createUser({ name: name ?? `User ${phone.slice(-4)}`, email: "", phone, dob: "", password: `otp-${Date.now()}` });
    }

    const token = store.createSession(user.id);
    const { passwordHash: _ph, ...safe } = user;
    const res = NextResponse.json({ user: safe });
    res.cookies.set("csl-session", token, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/" });
    return res;
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
