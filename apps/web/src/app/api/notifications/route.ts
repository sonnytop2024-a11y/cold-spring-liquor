import { NextRequest, NextResponse } from "next/server";
import { store } from "../_mock/store";
import { dbGetUserById } from "@/lib/db";
import { verifySessionToken } from "@/lib/session";

export async function GET(req: NextRequest) {
  const sessionToken = req.cookies.get("csl-session")?.value;
  if (!sessionToken) return NextResponse.json([]);
  const userId = verifySessionToken(sessionToken);
  if (!userId) return NextResponse.json([]);
  const user = await dbGetUserById(userId);
  if (!user) return NextResponse.json([]);
  return NextResponse.json(store.getNotificationsForCustomer(user.id));
}

export async function PATCH(req: NextRequest) {
  const sessionToken = req.cookies.get("csl-session")?.value;
  if (!sessionToken) return NextResponse.json({ ok: false });
  const userId = verifySessionToken(sessionToken);
  if (!userId) return NextResponse.json({ ok: false });
  store.markNotificationsRead(userId);
  return NextResponse.json({ ok: true });
}
