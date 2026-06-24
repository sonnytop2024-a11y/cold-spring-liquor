import { NextRequest, NextResponse } from "next/server";
import { store } from "../../_mock/store";

const ACTIVE = ["pending","confirmed","preparing","driver_assigned","driver_at_store","out_for_delivery","driver_arriving","driver_arrived"];

function stripPrivate(order: ReturnType<typeof store.getAllOrders>[0]) {
  return {
    ...order,
    billingAddress: undefined,
    customerEmail: undefined,
  };
}

export async function GET(req: NextRequest) {
  const driverId = req.nextUrl.searchParams.get("driverId");
  const orders = store.getAllOrders();

  let newOrders, activeOrders;
  if (driverId) {
    newOrders = orders.filter(o =>
      ACTIVE.includes(o.status) &&
      (!o.driverId || o.driverId === driverId) &&
      !["driver_assigned","driver_at_store","out_for_delivery","driver_arriving"].includes(o.status)
    );
    activeOrders = orders.filter(o => o.driverId === driverId && ACTIVE.includes(o.status));
  } else {
    newOrders = orders.filter(o => ["pending","confirmed","preparing"].includes(o.status));
    activeOrders = orders.filter(o => ["driver_assigned","driver_at_store","out_for_delivery","driver_arriving"].includes(o.status));
  }

  const driverOrders = driverId ? orders.filter(o => o.driverId === driverId) : activeOrders;
  const today = new Date().toDateString();
  const todayDelivered = driverOrders.filter(o => o.status === "delivered" && new Date(o.updatedAt).toDateString() === today);
  const weekDelivered = driverOrders.filter(o => {
    const diff = (Date.now() - new Date(o.updatedAt).getTime()) / 86400000;
    return o.status === "delivered" && diff < 7;
  });

  return NextResponse.json({
    newOrders: newOrders.map(stripPrivate),
    activeOrders: activeOrders.map(stripPrivate),
    completedToday: todayDelivered.map(stripPrivate),
    earnings: {
      today: +todayDelivered.reduce((a, o) => a + o.total, 0).toFixed(2),
      week: +weekDelivered.reduce((a, o) => a + o.total, 0).toFixed(2),
      deliveries: todayDelivered.length,
    },
  });
}
