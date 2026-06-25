import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { dbGetUserByPhone } from "@/lib/db";
import { createSessionToken } from "@/lib/session";

const VERIFY_SID = process.env.TWILIO_VERIFY_SID ?? "";

function toE164(phone: string): string {
  const d = phone.replace(/\D/g, "");
  return d.startsWith("1") ? `+${d}` : `+1${d}`;
}

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token || !VERIFY_SID) return null;
  return twilio(sid, token);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, phone, code } = body;
  if (!phone) return NextResponse.json({ error: "Phone required" }, { status: 400 });

  const normalized = toE164(phone);
  const client = getClient();

  // ── SEND ────────────────────────────────────────────────────────────────────
  if (action === "send") {
    if (!client) {
      // Dev fallback — no Twilio configured
      const { createHmac } = await import("crypto");
      const otp = (parseInt(createHmac("sha256", "dev").update(`${normalized}:${Math.floor(Date.now() / 300000)}`).digest("hex").slice(0, 8), 16) % 1_000_000).toString().padStart(6, "0");
      return NextResponse.json({ ok: true, devCode: otp });
    }
    try {
      await client.verify.v2.services(VERIFY_SID).verifications.create({
        to: normalized,
        channel: "sms",
      });
      return NextResponse.json({ ok: true });
    } catch (e: any) {
      console.error("[otp] Twilio Verify send error:", e.message, e.code);
      return NextResponse.json(
        { error: "Failed to send verification code. Please check your phone number and try again." },
        { status: 500 }
      );
    }
  }

  // ── VERIFY (for login) ────────────────────────────────────────────────────
  if (action === "verify") {
    if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 });

    if (!client) {
      return NextResponse.json({ error: "Verification service not configured." }, { status: 500 });
    }

    try {
      const check = await client.verify.v2.services(VERIFY_SID).verificationChecks.create({
        to: normalized,
        code,
      });
      if (check.status !== "approved") {
        return NextResponse.json({ error: "Invalid or expired code. Please try again." }, { status: 401 });
      }
    } catch (e: any) {
      console.error("[otp] Twilio Verify check error:", e.message);
      return NextResponse.json({ error: "Invalid or expired code. Please try again." }, { status: 401 });
    }

    const user = await dbGetUserByPhone(normalized);
    if (!user) {
      return NextResponse.json({ status: "needs_registration", verifiedPhone: normalized });
    }

    const token = createSessionToken(user.id);
    const { passwordHash: _ph, ...safe } = user;
    const res = NextResponse.json({ status: "login", user: safe });
    res.cookies.set("csl-session", token, {
      httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/",
    });
    return res;
  }

  // ── VERIFY-ONLY (for register — confirms code then discards) ──────────────
  if (action === "verify-only") {
    if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 });

    if (!client) {
      return NextResponse.json({ error: "Verification service not configured." }, { status: 500 });
    }

    try {
      const check = await client.verify.v2.services(VERIFY_SID).verificationChecks.create({
        to: normalized,
        code,
      });
      if (check.status !== "approved") {
        return NextResponse.json({ error: "Invalid or expired code. Please try again." }, { status: 401 });
      }
      return NextResponse.json({ ok: true, verified: true });
    } catch (e: any) {
      console.error("[otp] Twilio Verify check error:", e.message);
      return NextResponse.json({ error: "Invalid or expired code. Please try again." }, { status: 401 });
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
