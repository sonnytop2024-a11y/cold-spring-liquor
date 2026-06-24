import { NextRequest, NextResponse } from "next/server";
import { store } from "../_mock/store";

export async function GET(req: NextRequest) {
  const sessionToken = req.cookies.get("csl-session")?.value;
  if (!sessionToken) return NextResponse.json([]);
  const user = store.getUserBySession(sessionToken);
  if (!user) return NextResponse.json([]);
  const notifications = store.getNotificationsForCustomer(user.id);
  return NextResponse.json(notifications);
}

export async function PATCH(req: NextRequest) {
  const sessionToken = req.cookies.get("csl-session")?.value;
  if (!sessionToken) return NextResponse.json({ ok: false });
  const user = store.getUserBySession(sessionToken);
  if (!user) return NextResponse.json({ ok: false });
  store.markNotificationsRead(user.id);
  return NextResponse.json({ ok: true });
}
