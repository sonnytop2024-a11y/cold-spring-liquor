import { NextRequest, NextResponse } from "next/server";
import { dbGetUserByResetToken, dbSaveUser } from "@/lib/db";

function mockHash(s: string) { return Buffer.from(s).toString("base64"); }

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();
  if (!token || !password) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });

  const user = await dbGetUserByResetToken(token);
  if (!user) return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 });

  if (!user.resetTokenExpiry || new Date(user.resetTokenExpiry) < new Date()) {
    return NextResponse.json({ error: "Reset link has expired. Please request a new one." }, { status: 400 });
  }

  await dbSaveUser({
    ...user,
    passwordHash: mockHash(password),
    resetToken: undefined,
    resetTokenExpiry: undefined,
  });

  return NextResponse.json({ ok: true });
}
