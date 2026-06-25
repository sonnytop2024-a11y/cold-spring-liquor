import { NextRequest, NextResponse } from "next/server";
import { dbGetAllOrders } from "@/lib/db";

function startOf(period: "day" | "week" | "month"): Date {
  const now = new Date();
  if (period === "day") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "week") {
    const d = new Date(now); d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0); return d;
  }
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function GET(req: NextRequest) {
  const driverId = req.nextUrl.searchParams.get("driverId");
  if (!driverId) return NextResponse.json({ error: "driverId required" }, { status: 400 });

  const allOrders = await dbGetAllOrders();
  const myOrders = allOrders.filter(o => o.driverId === driverId);
  const delivered = myOrders.filter(o => o.status === "delivered");

  function periodStats(period: "day" | "week" | "month") {
    const start = startOf(period);
    const periodOrders = delivered.filter(o => new Date(o.updatedAt) >= start);
    return {
      deliveries: periodOrders.length,
      amount: +periodOrders.reduce((a, o) => a + o.total, 0).toFixed(2),
    };
  }

  // Mask address for driver privacy — only show street name + city, no house number
  function maskAddress(addr: typeof delivered[0]["deliveryAddress"]) {
    if (!addr) return { masked: "Address unavailable", city: "" };
    // Strip house number (leading digits + optional letter) from street
    const streetName = addr.street.replace(/^\d+[A-Za-z]?\s+/, "").replace(/\s+(Apt|Unit|#|Suite)\s*\S+/i, "");
    return { masked: `${streetName}, ${addr.city}`, city: addr.city };
  }

  return NextResponse.json({
    today: periodStats("day"),
    week: periodStats("week"),
    month: periodStats("month"),
    total: {
      deliveries: delivered.length,
      amount: +delivered.reduce((a, o) => a + o.total, 0).toFixed(2),
    },
    orders: delivered.slice(0, 50).map(o => {
      const { masked, city } = maskAddress(o.deliveryAddress);
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        deliveryAddressMasked: masked,
        deliveryCity: city,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        total: o.total,
        items: o.items,
        status: o.status,
      };
    }),
  });
}
