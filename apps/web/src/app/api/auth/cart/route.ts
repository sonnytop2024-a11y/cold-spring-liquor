import { NextRequest, NextResponse } from "next/server";
import { dbGetUserById, dbSaveUser } from "@/lib/db";
import { verifySessionToken } from "@/lib/session";

async function getUser(req: NextRequest) {
  const token = req.cookies.get("csl-session")?.value;
  if (!token) return null;
  const userId = verifySessionToken(token);
  if (!userId) return null;
  return dbGetUserById(userId);
}

export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ cart: null }, { status: 401 });
  return NextResponse.json({ cart: user.savedCart ?? [] });
}

export async function PUT(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { cart } = await req.json();
  await dbSaveUser({ ...user, savedCart: cart ?? [] });
  return NextResponse.json({ ok: true });
}
