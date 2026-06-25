import { NextRequest, NextResponse } from "next/server";
import { dbGetUserById, dbSaveUser } from "@/lib/db";
import { verifySessionToken } from "@/lib/session";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("csl-session")?.value;
  if (!token) return NextResponse.json({ user: null }, { status: 401 });

  const userId = verifySessionToken(token);
  if (!userId) return NextResponse.json({ user: null }, { status: 401 });

  const user = await dbGetUserById(userId);
  if (!user) return NextResponse.json({ user: null }, { status: 401 });

  const { passwordHash: _ph, ...safeUser } = user;
  return NextResponse.json({ user: safeUser });
}

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get("csl-session")?.value;
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const userId = verifySessionToken(token);
  if (!userId) return NextResponse.json({ error: "Session invalid" }, { status: 401 });

  const user = await dbGetUserById(userId);
  if (!user) return NextResponse.json({ error: "Session invalid" }, { status: 401 });

  const body = await req.json();
  const { name, phone, dob, deliveryAddress, billingAddress, billingAddressSameAsDelivery } = body;

  const updated = {
    ...user,
    ...(name !== undefined && { name }),
    ...(phone !== undefined && { phone }),
    ...(dob !== undefined && { dob }),
    ...(deliveryAddress !== undefined && { deliveryAddress }),
    ...(billingAddress !== undefined && { billingAddress }),
    ...(billingAddressSameAsDelivery !== undefined && { billingAddressSameAsDelivery }),
  };

  await dbSaveUser(updated);

  const { passwordHash: _ph, ...safe } = updated;
  return NextResponse.json({ user: safe });
}
