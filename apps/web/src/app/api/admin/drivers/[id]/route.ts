import { requireAdminAuth } from "@/lib/adminAuth";
import { NextRequest, NextResponse } from "next/server";
import { store } from "../../../_mock/store";
import { dbGetAllOrders } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const driver = store.getDriver(params.id);
  if (!driver) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allOrders = await dbGetAllOrders();
  const orders = allOrders.filter(o => o.driverId === params.id);
  const todayOrders = orders.filter(o =>
    new Date(o.createdAt).toDateString() === new Date().toDateString()
  );
  const activeOrder = orders.find(o =>
    !["delivered", "failed_delivery", "cancelled"].includes(o.status)
  );

  const { passwordHash: _ph, ...safe } = driver;
  return NextResponse.json({
    ...safe,
    currentOrder: activeOrder ?? null,
    orders: orders.slice(0, 20), // last 20
    todayDeliveries: todayOrders.filter(o => o.status === "delivered").length,
    todayEarnings: todayOrders.filter(o => o.status === "delivered").reduce((a, o) => a + o.total, 0),
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const authErr = requireAdminAuth(req); if (authErr) return authErr;
  const driver = store.getDriver(params.id);
  if (!driver) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { name, phone, email, username, pin, active } = body;

  const fields: Partial<typeof driver> = {};
  if (name !== undefined) fields.name = name;
  if (phone !== undefined) fields.phone = phone;
  if (email !== undefined) fields.email = email;
  if (username !== undefined) fields.username = username;
  if (active !== undefined) fields.active = active;
  if (pin !== undefined) {
    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      return NextResponse.json({ error: "PIN must be exactly 4 digits" }, { status: 400 });
    }
    fields.pin = pin;
  }

  const updated = store.updateDriver(params.id, fields);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { passwordHash: _ph2, ...safe } = updated;
  return NextResponse.json(safe);
}

// PATCH: partial update — used by driver app to toggle isOnline
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const authErr = requireAdminAuth(req); if (authErr) return authErr;
  const driver = store.getDriver(params.id);
  if (!driver) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json();
  const fields: Record<string, unknown> = {};
  if (body.isOnline !== undefined) fields.isOnline = Boolean(body.isOnline);
  if (body.active !== undefined) fields.active = Boolean(body.active);
  if (body.currentOrderId !== undefined) fields.currentOrderId = body.currentOrderId;
  const updated = store.updateDriver(params.id, fields);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { passwordHash: _ph, ...safe } = updated;
  return NextResponse.json(safe);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const deleted = store.deleteDriver(params.id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
