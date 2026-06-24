import { NextRequest, NextResponse } from "next/server";
import { store } from "../../_mock/store";

// Mock Google OAuth — in production replace with real Google OAuth flow
export async function POST(req: NextRequest) {
  const { googleId, name, email } = await req.json();
  if (!googleId || !email) return NextResponse.json({ error: "googleId and email required" }, { status: 400 });

  const user = store.createOrUpdateGoogleUser({ googleId, name: name ?? email.split("@")[0], email });
  const token = store.createSession(user.id);
  const { passwordHash: _ph, ...safe } = user;
  const res = NextResponse.json({ user: safe });
  res.cookies.set("csl-session", token, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/" });
  return res;
}
