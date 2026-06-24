import { NextRequest, NextResponse } from "next/server";
import { store } from "../../_mock/store";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("csl-session")?.value;
  if (!token) return NextResponse.json({ user: null }, { status: 401 });
  const user = store.getUserBySession(token);
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  const { passwordHash: _ph, ...safeUser } = user;
  return NextResponse.json({ user: safeUser });
}

// PATCH /api/auth/me — update profile + saved addresses
export async function PATCH(req: NextRequest) {
  const token = req.cookies.get("csl-session")?.value;
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const user = store.getUserBySession(token);
  if (!user) return NextResponse.json({ error: "Session invalid" }, { status: 401 });

  const body = await req.json();
  const { name, phone, dob, deliveryAddress, billingAddress, billingAddressSameAsDelivery } = body;

  const updated = store.updateUserProfile(user.id, {
    ...(name !== undefined && { name }),
    ...(phone !== undefined && { phone }),
    ...(dob !== undefined && { dob }),
    ...(deliveryAddress !== undefined && { deliveryAddress }),
    ...(billingAddress !== undefined && { billingAddress }),
    ...(billingAddressSameAsDelivery !== undefined && { billingAddressSameAsDelivery }),
  });

  if (!updated) return NextResponse.json({ error: "Update failed" }, { status: 500 });
  const { passwordHash: _ph, ...safe } = updated;
  return NextResponse.json({ user: safe });
}
