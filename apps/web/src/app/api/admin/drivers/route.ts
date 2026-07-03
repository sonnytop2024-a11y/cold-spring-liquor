import { NextRequest, NextResponse } from "next/server";
import { dbGetAllDrivers, dbSaveDriver, dbGetDriverByUsername } from "@/lib/db";
import { dbGetAllOrders } from "@/lib/db";

export async function GET(req: NextRequest) {
const drivers = await dbGetAllDrivers();
  const orders = await dbGetAllOrders();

  const enriched = drivers.map(d => {
    const activeOrder = orders.find(o =>
      o.driverId === d.id &&
      !["delivered", "failed_delivery", "cancelled"].includes(o.status)
    );
    const todayDeliveries = orders.filter(o =>
      o.driverId === d.id &&
      o.status === "delivered" &&
      new Date(o.updatedAt).toDateString() === new Date().toDateString()
    );
    const { passwordHash: _ph, ...safe } = d;
    return {
      ...safe,
      currentOrder: activeOrder ?? null,
      todayDeliveries: todayDeliveries.length,
      todayEarnings: todayDeliveries.reduce((acc, o) => acc + o.total, 0),
    };
  });

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
const body = await req.json();
  const { name, phone, email, username, pin, active } = body;

  if (!name || !username || !pin) {
    return NextResponse.json({ error: "name, username, and pin are required" }, { status: 400 });
  }
  if (pin.length !== 4 || !/^\d+$/.test(pin)) {
    return NextResponse.json({ error: "PIN must be exactly 4 digits" }, { status: 400 });
  }
  const existing = await dbGetDriverByUsername(username);
  if (existing) {
    return NextResponse.json({ error: "Username already taken" }, { status: 409 });
  }

  const id = `d${Date.now()}`;
  const driver = {
    id, name, phone: phone ?? "", email: email ?? "",
    username, pin, active: active !== false,
    passwordHash: Buffer.from(pin).toString("base64"),
    isOnline: false, lat: null, lng: null, locationUpdatedAt: null,
    currentOrderId: null, totalDeliveries: 0, totalEarnings: 0, rating: 5.0,
    createdAt: new Date().toISOString(),
  };
  await dbSaveDriver(driver);
  const { passwordHash: _ph, ...safe } = driver;
  return NextResponse.json(safe, { status: 201 });
}
