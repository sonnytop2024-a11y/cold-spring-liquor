import { NextRequest, NextResponse } from "next/server";
import { dbGetUserByEmail, dbCreateUser } from "@/lib/db";
import { createSessionToken } from "@/lib/session";
import type { MockUser } from "../../_mock/store";

function calcAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function mockHash(s: string) { return Buffer.from(s).toString("base64"); }

export async function POST(req: NextRequest) {
  const { name, email, phone, dob, password, googleId } = await req.json();

  if (!name || !email || !dob) {
    return NextResponse.json({ error: "Name, email, and date of birth are required." }, { status: 400 });
  }
  if (!googleId && !phone) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }
  if (!googleId && !password) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }
  if (!googleId && password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const age = calcAge(dob);
  if (age < 21) {
    return NextResponse.json({ error: `You must be 21 or older to create an account. Your age: ${age}.` }, { status: 403 });
  }

  const existing = await dbGetUserByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const id = `u${Date.now()}`;
  const user: MockUser = {
    id,
    name,
    email,
    phone: phone ?? "",
    dob,
    passwordHash: googleId ? "" : mockHash(password),
    points: 50,
    tier: "Bronze",
    createdAt: new Date().toISOString(),
    ...(googleId ? { googleId } : {}),
  };

  await dbCreateUser(user);

  const token = createSessionToken(user.id);
  const { passwordHash: _ph, ...safeUser } = user;

  const res = NextResponse.json({ user: safeUser, message: "Account created successfully!" }, { status: 201 });
  res.cookies.set("csl-session", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return res;
}
