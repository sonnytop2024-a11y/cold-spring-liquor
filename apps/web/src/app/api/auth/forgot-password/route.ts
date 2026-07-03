import { NextRequest, NextResponse } from "next/server";
import { dbGetUserByEmail, dbSaveUser } from "@/lib/db";
import { Resend } from "resend";
import crypto from "crypto";

const resend = () => new Resend(process.env.RESEND_API_KEY ?? "");
const STORE_URL = "https://coldspringliquor.com";
const LOGO_URL = "https://coldspringliquor.com/Logo.PNG";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });

  const user = await dbGetUserByEmail(email);
  if (!user) {
    // Don't reveal if email exists or not
    return NextResponse.json({ ok: true });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes

  await dbSaveUser({ ...user, resetToken: token, resetTokenExpiry: expiry });

  const resetLink = `${STORE_URL}/auth/reset?token=${token}`;
  const firstName = user.name.split(" ")[0];

  if (process.env.RESEND_API_KEY) {
    await resend().emails.send({
      from: "Cold Spring Liquor <orders@coldspringliquor.com>",
      to: email,
      subject: "Reset Your Password — Cold Spring Liquor",
      html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:24px 12px;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
  <tr><td style="background:#ffffff;border-radius:20px 20px 0 0;padding:32px 40px 20px;text-align:center;border-bottom:1px solid #f3f4f6;">
    <img src="${LOGO_URL}" alt="Cold Spring Liquor" width="120" style="display:block;margin:0 auto 16px;max-width:120px;" />
    <div style="background:#0a0a0a;border-radius:14px;padding:18px 28px;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;">Reset Your Password</h1>
    </div>
  </td></tr>
  <tr><td style="background:#f97316;height:4px;"></td></tr>
  <tr><td style="background:#ffffff;padding:32px 40px;">
    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
      Hi <strong style="color:#0a0a0a;">${firstName}</strong>, we received a request to reset your password.
      Click the button below — this link expires in <strong>30 minutes</strong>.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr><td align="center">
      <a href="${resetLink}" style="display:inline-block;background:#f97316;color:#ffffff;font-weight:800;font-size:16px;padding:14px 40px;border-radius:12px;text-decoration:none;">Reset Password →</a>
    </td></tr></table>
    <p style="margin:20px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
      If you didn't request this, you can safely ignore this email. Your password won't change.
    </p>
    <p style="margin:12px 0 0;font-size:12px;color:#d1d5db;word-break:break-all;">
      Or copy this link: ${resetLink}
    </p>
  </td></tr>
  <tr><td style="background:#0a0a0a;border-radius:0 0 20px 20px;padding:20px 40px;text-align:center;">
    <p style="margin:0;font-size:13px;color:#f97316;font-weight:700;">Cold Spring Liquor</p>
    <p style="margin:4px 0 0;font-size:11px;color:#4b5563;">15609 Ronald Reagan Blvd Ste B100, Leander, TX 78641</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`,
    });
  }

  return NextResponse.json({ ok: true });
}
