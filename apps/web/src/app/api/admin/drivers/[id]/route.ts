import { NextRequest, NextResponse } from "next/server";
import { dbGetDriver, dbSaveDriver, dbDeleteDriver } from "@/lib/db";
import { dbGetAllOrders } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
const driver = await dbGetDriver(params.id);
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
    orders: orders.slice(0, 20),
    todayDeliveries: todayOrders.filter(o => o.status === "delivered").length,
    todayEarnings: todayOrders.filter(o => o.status === "delivered").reduce((a, o) => a + o.total, 0),
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
const driver = await dbGetDriver(params.id);
  if (!driver) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { name, phone, email, username, pin, active } = body;

  const updated = { ...driver };
  if (name !== undefined) updated.name = name;
  if (phone !== undefined) updated.phone = phone;
  if (email !== undefined) updated.email = email;
  if (username !== undefined) updated.username = username;
  if (active !== undefined) updated.active = active;
  if (pin !== undefined) {
    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      return NextResponse.json({ error: "PIN must be exactly 4 digits" }, { status: 400 });
    }
    updated.pin = pin;
    updated.passwordHash = Buffer.from(pin).toString("base64");
  }

  await dbSaveDriver(updated);
  const { passwordHash: _ph, ...safe } = updated;
  return NextResponse.json(safe);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
const driver = await dbGetDriver(params.id);
  if (!driver) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updated = { ...driver };
  if (body.isOnline !== undefined) updated.isOnline = Boolean(body.isOnline);
  if (body.active !== undefined) updated.active = Boolean(body.active);
  if (body.currentOrderId !== undefined) updated.currentOrderId = body.currentOrderId;
  if (body.lat !== undefined) updated.lat = body.lat;
  if (body.lng !== undefined) updated.lng = body.lng;
  if (body.locationUpdatedAt !== undefined) updated.locationUpdatedAt = body.locationUpdatedAt;

  await dbSaveDriver(updated);
  const { passwordHash: _ph, ...safe } = updated;
  return NextResponse.json(safe);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
const deleted = await dbDeleteDriver(params.id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
