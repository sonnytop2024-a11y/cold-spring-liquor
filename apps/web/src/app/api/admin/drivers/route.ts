import { requireAdminAuth } from "@/lib/adminAuth";
import { NextRequest, NextResponse } from "next/server";
import { store } from "../../_mock/store";
import { dbGetAllOrders } from "@/lib/db";

export async function GET() {
  const drivers = store.getAllDrivers();
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
  const authErr = requireAdminAuth(req); if (authErr) return authErr;
  const body = await req.json();
  const { name, phone, email, username, pin, active } = body;

  if (!name || !username || !pin) {
    return NextResponse.json({ error: "name, username, and pin are required" }, { status: 400 });
  }
  if (pin.length !== 4 || !/^\d+$/.test(pin)) {
    return NextResponse.json({ error: "PIN must be exactly 4 digits" }, { status: 400 });
  }
  if (store.getDriverByUsername(username)) {
    return NextResponse.json({ error: "Username already taken" }, { status: 409 });
  }

  const driver = store.createDriver({
    name, phone: phone ?? "", email: email ?? "",
    username, pin, active: active !== false,
  });
  const { passwordHash: _ph, ...safe } = driver;
  return NextResponse.json(safe, { status: 201 });
}
