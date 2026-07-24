import { NextRequest, NextResponse } from "next/server";
import { signAdminSession, timingSafeEqual, ADMIN_SESSION_COOKIE, ADMIN_SESSION_TTL_MS, ADMIN_SESSION_SECRET_FALLBACK } from "@/lib/adminSession";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json().catch(() => ({} as any));
  const U = process.env.ADMIN_LOGIN_USER;
  const P = process.env.ADMIN_LOGIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET ?? ADMIN_SESSION_SECRET_FALLBACK;

  if (!U || !P) {
    return NextResponse.json({ error: "Admin login is not configured yet. Please contact the developer." }, { status: 500 });
  }

  const ok =
    typeof username === "string" && typeof password === "string" &&
    timingSafeEqual(username, U) && timingSafeEqual(password, P);

  if (!ok) {
    // Small delay blunts rapid brute-force guessing
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ error: "Incorrect username or password." }, { status: 401 });
  }

  const token = await signAdminSession(ADMIN_SESSION_TTL_MS, secret);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(ADMIN_SESSION_TTL_MS / 1000),
  });
  return res;
}
