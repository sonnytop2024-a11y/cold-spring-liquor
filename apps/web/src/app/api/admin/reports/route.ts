import { NextRequest, NextResponse } from "next/server";
import { store } from "../../_mock/store";

function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

function getRange(period: string, from?: string, to?: string): { start: Date; end: Date } {
  const now = new Date();
  const today = startOfDay(now);

  if (period === "today") return { start: today, end: now };

  if (period === "yesterday") {
    const y = new Date(today); y.setDate(y.getDate() - 1);
    return { start: y, end: today };
  }
  if (period === "last7") {
    const s = new Date(today); s.setDate(s.getDate() - 6);
    return { start: s, end: now };
  }
  if (period === "last30") {
    const s = new Date(today); s.setDate(s.getDate() - 29);
    return { start: s, end: now };
  }
  if (period === "month") {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
  }
  if (period === "custom" && from && to) {
    return { start: new Date(from), end: new Date(to + "T23:59:59") };
  }
  // default: today
  return { start: today, end: now };
}

function buildDailyChart(orders: ReturnType<typeof store.getAllOrders>, start: Date, end: Date) {
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
  const limit = Math.min(days, 30);

  return Array.from({ length: limit }).map((_, i) => {
    const d = new Date(end);
    d.setDate(d.getDate() - (limit - 1 - i));
    const dayStart = startOfDay(d);
    const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);

    const label = days <= 7
      ? d.toLocaleDateString("en-US", { weekday: "short" })
      : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    const dayDelivered = orders.filter(o =>
      o.status === "delivered" &&
      new Date(o.updatedAt) >= dayStart &&
      new Date(o.updatedAt) < dayEnd
    );
    const dayAll = orders.filter(o =>
      new Date(o.createdAt) >= dayStart &&
      new Date(o.createdAt) < dayEnd
    );
    return {
      label,
      orders: dayAll.length,
      delivered: dayDelivered.length,
      revenue: +dayDelivered.reduce((a, o) => a + o.total, 0).toFixed(2),
    };
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const period = searchParams.get("period") ?? "today";
  const fromParam = searchParams.get("from") ?? undefined;
  const toParam = searchParams.get("to") ?? undefined;

  const allOrders = store.getAllOrders();
  const { start, end } = getRange(period, fromParam, toParam);

  const periodOrders = allOrders.filter(o => {
    const t = new Date(o.createdAt);
    return t >= start && t <= end;
  });
  const periodDelivered = periodOrders.filter(o => o.status === "delivered");

  const revenue = +periodDelivered.reduce((a, o) => a + o.total, 0).toFixed(2);
  const avgOrderValue = periodDelivered.length ? +(revenue / periodDelivered.length).toFixed(2) : 0;

  const stats = {
    totalOrders: periodOrders.length,
    completedOrders: periodDelivered.length,
    pendingOrders: periodOrders.filter(o => o.status === "pending").length,
    inDeliveryOrders: periodOrders.filter(o =>
      ["confirmed","preparing","driver_assigned","driver_at_store","out_for_delivery","driver_arriving"].includes(o.status)
    ).length,
    cancelledOrders: periodOrders.filter(o => o.status === "cancelled").length,
    revenue,
    avgOrderValue,
  };

  // Product sales aggregation
  const productSales: Record<string, { name: string; qty: number; revenue: number; category: string }> = {};
  periodDelivered.forEach(o => {
    o.items.forEach(item => {
      const key = item.productId || item.name;
      if (!productSales[key]) productSales[key] = { name: item.name, qty: 0, revenue: 0, category: "" };
      productSales[key].qty += item.quantity;
      productSales[key].revenue += item.price * item.quantity;
    });
  });
  const allProducts = store.getAllProducts();
  Object.keys(productSales).forEach(key => {
    const p = allProducts.find(p => p.id === key || p.name === productSales[key].name);
    if (p) productSales[key].category = p.category;
  });
  const topProducts = Object.values(productSales)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10)
    .map(p => ({ ...p, revenue: +p.revenue.toFixed(2) }));

  // Category breakdown
  const catRevenue: Record<string, { revenue: number; qty: number }> = {};
  Object.values(productSales).forEach(p => {
    const cat = p.category || "Other";
    if (!catRevenue[cat]) catRevenue[cat] = { revenue: 0, qty: 0 };
    catRevenue[cat].revenue += p.revenue;
    catRevenue[cat].qty += p.qty;
  });

  // Customer spend
  const customerSpend: Record<string, { name: string; orders: number; total: number }> = {};
  periodDelivered.forEach(o => {
    if (!o.customerId) return;
    if (!customerSpend[o.customerId]) customerSpend[o.customerId] = { name: o.customerName, orders: 0, total: 0 };
    customerSpend[o.customerId].orders++;
    customerSpend[o.customerId].total += o.total;
  });
  const topCustomers = Object.values(customerSpend)
    .map(v => ({ ...v, total: +v.total.toFixed(2) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Repeat customers (ordered more than once)
  const allCustomerOrders: Record<string, number> = {};
  allOrders.filter(o => o.status === "delivered").forEach(o => {
    if (o.customerId) allCustomerOrders[o.customerId] = (allCustomerOrders[o.customerId] ?? 0) + 1;
  });
  const repeatCustomers = Object.values(allCustomerOrders).filter(c => c > 1).length;

  // Driver performance
  const driverPerf: Record<string, { name: string; deliveries: number; totalSales: number }> = {};
  periodDelivered.forEach(o => {
    if (!o.driverId) return;
    if (!driverPerf[o.driverId]) {
      const d = store.getAllDrivers().find(d => d.id === o.driverId);
      driverPerf[o.driverId] = { name: d?.name ?? "Unknown", deliveries: 0, totalSales: 0 };
    }
    driverPerf[o.driverId].deliveries++;
    driverPerf[o.driverId].totalSales += o.total;
  });
  const driverPerformance = Object.values(driverPerf)
    .map(d => ({ ...d, totalSales: +d.totalSales.toFixed(2) }))
    .sort((a, b) => b.deliveries - a.deliveries);

  // Recent orders (latest 15, all statuses)
  const recentOrders = [...allOrders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 15)
    .map(o => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      customerName: o.customerName,
      total: o.total,
      items: o.items.length,
      createdAt: o.createdAt,
      driverId: o.driverId,
    }));

  return NextResponse.json({
    period,
    ...stats,
    chart: buildDailyChart(allOrders, start, end),
    topProducts,
    categoryBreakdown: Object.entries(catRevenue)
      .map(([category, v]) => ({ category, revenue: +v.revenue.toFixed(2), qty: v.qty }))
      .sort((a, b) => b.revenue - a.revenue),
    topCustomers,
    driverPerformance,
    repeatCustomers,
    uniqueCustomers: Object.keys(customerSpend).length,
    recentOrders,
    // Global totals (not period-filtered)
    allTimeOrders: allOrders.length,
    activeOrders: allOrders.filter(o =>
      !["delivered","failed_delivery","cancelled"].includes(o.status)
    ).length,
  });
}
