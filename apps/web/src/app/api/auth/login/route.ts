import { NextRequest, NextResponse } from "next/server";
import { store } from "../../_mock/store";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const user = store.getUserByEmail(email);
  if (!user) {
    return NextResponse.json({ error: "Account not found. Please sign up first." }, { status: 404 });
  }
  if (!store.validatePassword(user, password)) {
    return NextResponse.json({ error: "Invalid password." }, { status: 401 });
  }

  const token = store.createSession(user.id);
  const { passwordHash: _ph, ...safeUser } = user;

  const res = NextResponse.json({ user: safeUser });
  res.cookies.set("csl-session", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return res;
}
