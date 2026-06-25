import { NextRequest, NextResponse } from "next/server";
import { dbGetUserByGoogleId, dbGetUserByEmail, dbSaveUser } from "@/lib/db";
import { createSessionToken } from "@/lib/session";
import type { MockUser } from "../../_mock/store";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${WEB_URL}/auth/login?error=google_cancelled`);
  }

  const redirectUri = `${WEB_URL}/api/auth/callback`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenRes.json();
  if (!tokenRes.ok) {
    return NextResponse.redirect(`${WEB_URL}/auth/login?error=google_failed`);
  }

  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  const googleUser = await userRes.json();
  if (!userRes.ok || !googleUser.id) {
    return NextResponse.redirect(`${WEB_URL}/auth/login?error=google_failed`);
  }

  // Look up by googleId first, then email
  let existingUser =
    (await dbGetUserByGoogleId(googleUser.id)) ??
    (await dbGetUserByEmail(googleUser.email));

  if (!existingUser) {
    const params = new URLSearchParams({
      googleId: googleUser.id,
      name: googleUser.name ?? "",
      email: googleUser.email ?? "",
    });
    return NextResponse.redirect(`${WEB_URL}/auth/register?${params.toString()}`);
  }

  // Link googleId if not yet linked
  if (existingUser.googleId !== googleUser.id) {
    const linked: MockUser = { ...existingUser, googleId: googleUser.id };
    await dbSaveUser(linked);
    existingUser = linked;
  }

  const token = createSessionToken(existingUser.id);
  const res = NextResponse.redirect(`${WEB_URL}/`);
  res.cookies.set("csl-session", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return res;
}
