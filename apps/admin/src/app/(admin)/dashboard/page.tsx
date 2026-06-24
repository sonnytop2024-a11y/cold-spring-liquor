"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  DollarSign, ShoppingBag, CheckCircle, Clock, Truck, XCircle,
  TrendingUp, Users, Star, Car, RefreshCw, Calendar, AlertCircle,
  ChevronDown, ChevronUp,
} from "lucide-react";

type Period = "today" | "yesterday" | "last7" | "last30" | "month" | "custom";

const PERIOD_LABELS: Record<Period, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last7: "Last 7 Days",
  last30: "Last 30 Days",
  month: "This Month",
  custom: "Custom",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  preparing: "bg-blue-100 text-blue-700",
  driver_assigned: "bg-purple-100 text-purple-700",
  driver_at_store: "bg-orange-100 text-orange-700",
  out_for_delivery: "bg-orange-100 text-orange-700",
  driver_arriving: "bg-yellow-100 text-yellow-800",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  failed_delivery: "bg-red-100 text-red-700",
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}
function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function BarChart({ data, valueKey, color = "bg-brand-400" }: {
  data: { label: string; [k: string]: any }[];
  valueKey: string;
  color?: string;
}) {
  const max = Math.max(...data.map(d => d[valueKey] ?? 0), 1);
  return (
    <div className="flex items-end gap-1 h-28">
      {data.map((d, i) => {
        const pct = ((d[valueKey] ?? 0) / max) * 100;
        const val = d[valueKey] ?? 0;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-1.5 py-0.5 rounded hidden group-hover:block whitespace-nowrap z-10">
              {valueKey === "revenue" ? fmt(val) : val}
            </span>
            <div className={`w-full rounded-t ${color} transition-all`} style={{ height: `${Math.max(pct, 2)}%` }} />
            <span className="text-xs text-gray-400 truncate w-full text-center leading-tight">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, bg, sub }: {
  label: string; value: string | number; icon: any; bg: string; sub?: string;
}) {
  return (
    <div className="bg-white border rounded-xl p-4 flex items-start gap-3">
      <div className={`${bg} p-2.5 rounded-lg shrink-0`}><Icon size={17} /></div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold mt-0.5 truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function OrderRow({ order }: { order: any }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr onClick={() => setOpen(v => !v)} className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer">
        <td className="px-4 py-3">
          <Link href="/orders" onClick={e => e.stopPropagation()}
            className="font-mono text-xs font-bold text-brand-600 hover:underline">#{order.orderNumber}</Link>
        </td>
        <td className="px-4 py-3 text-sm max-w-[120px] truncate">{order.customerName}</td>
        <td className="px-4 py-3">
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLOR[order.status] ?? "bg-gray-100 text-gray-600"}`}>
            {order.status.replace(/_/g, " ")}
          </span>
        </td>
        <td className="px-4 py-3 text-sm font-bold">{fmt(order.total)}</td>
        <td className="px-4 py-3 text-xs text-gray-400">{timeAgo(order.createdAt)}</td>
        <td className="px-4 py-3 text-gray-300">{open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}</td>
      </tr>
      {open && (
        <tr className="bg-blue-50 border-t border-blue-100">
          <td colSpan={6} className="px-4 py-3 text-xs space-x-4">
            <span className="text-gray-500">Items: <strong>{order.items}</strong></span>
            <span className="text-gray-500">Driver: <strong>{order.driverId ?? "Unassigned"}</strong></span>
            <span className="text-gray-500">{new Date(order.createdAt).toLocaleString()}</span>
            <Link href="/orders" className="text-brand-600 font-semibold hover:underline">Manage →</Link>
          </td>
        </tr>
      )}
    </>
  );
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>("today");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const apiUrl = period === "custom" && from && to
    ? `/api/admin/reports?period=custom&from=${from}&to=${to}`
    : `/api/admin/reports?period=${period}`;

  const { data: d = {}, isLoading, dataUpdatedAt, refetch } = useQuery({
    queryKey: ["admin-dashboard", period, from, to],
    queryFn: () => fetch(apiUrl).then(r => r.json()),
    refetchInterval: 10_000,
    staleTime: 5_000,
  });

  const kpis = [
    { label: "Total Orders", value: d.totalOrders ?? 0, icon: ShoppingBag, bg: "bg-blue-50 text-blue-700" },
    { label: "Completed", value: d.completedOrders ?? 0, icon: CheckCircle, bg: "bg-green-50 text-green-700", sub: d.revenue ? `Revenue: ${fmt(d.revenue)}` : undefined },
    { label: "Pending", value: d.pendingOrders ?? 0, icon: Clock, bg: "bg-yellow-50 text-yellow-700" },
    { label: "In Delivery", value: d.inDeliveryOrders ?? 0, icon: Truck, bg: "bg-orange-50 text-orange-700" },
    { label: "Cancelled", value: d.cancelledOrders ?? 0, icon: XCircle, bg: "bg-red-50 text-red-700" },
    { label: "Revenue", value: d.revenue != null ? fmt(d.revenue) : "$0.00", icon: DollarSign, bg: "bg-emerald-50 text-emerald-700" },
    { label: "Avg Order", value: d.avgOrderValue != null ? fmt(d.avgOrderValue) : "$0.00", icon: TrendingUp, bg: "bg-purple-50 text-purple-700" },
    { label: "Active Now", value: d.activeOrders ?? 0, icon: AlertCircle, bg: "bg-brand-50 text-brand-700", sub: `All time: ${d.allTimeOrders ?? 0}` },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Auto-refresh every 10s · Last updated: {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : "—"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${period === p ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
          <button onClick={() => refetch()}
            className="flex items-center gap-1 border rounded-lg px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
            <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Custom date range */}
      {period === "custom" && (
        <div className="flex flex-wrap items-center gap-3 bg-white border rounded-xl px-4 py-3">
          <Calendar size={14} className="text-gray-400" />
          <span className="text-sm">From</span>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <span className="text-sm">To</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
      )}

      {/* 9 KPI cards — 3×3 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {kpis.map(c => <KpiCard key={c.label} {...c} />)}
      </div>

      {/* Revenue + Orders charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-xl p-5">
          <p className="font-semibold mb-1 flex items-center gap-2">
            <TrendingUp size={15} className="text-brand-500" /> Revenue Trend
            <span className="text-xs font-normal text-gray-400">({PERIOD_LABELS[period]})</span>
          </p>
          <p className="text-2xl font-bold text-brand-600 mb-4">{fmt(d.revenue ?? 0)}</p>
          {(d.chart ?? []).length > 0
            ? <BarChart data={d.chart} valueKey="revenue" color="bg-brand-400" />
            : <div className="h-28 flex items-center justify-center text-gray-200 text-sm">No data yet</div>}
        </div>

        <div className="bg-white border rounded-xl p-5">
          <p className="font-semibold mb-1 flex items-center gap-2">
            <ShoppingBag size={15} className="text-blue-500" /> Orders Trend
            <span className="text-xs font-normal text-gray-400">({PERIOD_LABELS[period]})</span>
          </p>
          <p className="text-2xl font-bold text-blue-600 mb-4">{d.totalOrders ?? 0} orders</p>
          {(d.chart ?? []).length > 0
            ? <BarChart data={d.chart} valueKey="orders" color="bg-blue-400" />
            : <div className="h-28 flex items-center justify-center text-gray-200 text-sm">No data yet</div>}
        </div>
      </div>

      {/* Top products + Top customers + Driver performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top products */}
        <div className="bg-white border rounded-xl p-5">
          <p className="font-semibold mb-3 flex items-center gap-2"><Star size={14} className="text-yellow-500" /> Top Selling Products</p>
          {(d.topProducts ?? []).length === 0
            ? <p className="text-sm text-gray-300 text-center py-4">No sales yet</p>
            : <div className="space-y-2.5">
              {(d.topProducts ?? []).slice(0, 7).map((p: any, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm w-5 shrink-0 text-center">{["🥇","🥈","🥉"][i] ?? `${i+1}.`}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{p.name}</p>
                    <div className="bg-gray-100 rounded-full h-1 mt-1">
                      <div className="bg-yellow-400 h-1 rounded-full"
                        style={{ width: `${Math.min(100, (p.qty / (d.topProducts[0]?.qty || 1)) * 100)}%` }} />
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{p.qty} sold</span>
                </div>
              ))}
            </div>}
        </div>

        {/* Top customers */}
        <div className="bg-white border rounded-xl p-5">
          <p className="font-semibold mb-3 flex items-center gap-2">
            <Users size={14} className="text-purple-500" /> Top Customers
            {d.repeatCustomers != null && <span className="ml-auto text-xs font-normal text-gray-400">{d.repeatCustomers} repeat</span>}
          </p>
          {(d.topCustomers ?? []).length === 0
            ? <p className="text-sm text-gray-300 text-center py-4">No data</p>
            : <div className="space-y-2.5">
              {(d.topCustomers ?? []).map((c: any, i: number) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 bg-purple-100 rounded-full flex items-center justify-center text-xs font-bold text-purple-600 shrink-0">
                      {c.name?.charAt(0) ?? "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.orders} orders</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold shrink-0">{fmt(c.total)}</span>
                </div>
              ))}
            </div>}
        </div>

        {/* Driver performance */}
        <div className="bg-white border rounded-xl p-5">
          <p className="font-semibold mb-3 flex items-center gap-2"><Car size={14} className="text-blue-500" /> Driver Performance</p>
          {(d.driverPerformance ?? []).length === 0
            ? <p className="text-sm text-gray-300 text-center py-4">No deliveries</p>
            : <div className="space-y-2.5">
              {(d.driverPerformance ?? []).slice(0, 5).map((dr: any, i: number) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600 shrink-0">
                      {dr.name?.charAt(0) ?? "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{dr.name}</p>
                      <p className="text-xs text-gray-400">{dr.deliveries} deliveries</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-green-600 shrink-0">{fmt(dr.earnings)}</span>
                </div>
              ))}
            </div>}
        </div>
      </div>

      {/* Category breakdown */}
      {(d.categoryBreakdown ?? []).length > 0 && (
        <div className="bg-white border rounded-xl p-5">
          <p className="font-semibold mb-4">Sales by Category</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {(d.categoryBreakdown ?? []).slice(0, 6).map((c: any) => {
              const pct = d.revenue ? Math.round((c.revenue / d.revenue) * 100) : 0;
              const colors: Record<string, string> = {
                Whiskey: "bg-amber-100 text-amber-800", Tequila: "bg-orange-100 text-orange-800",
                Vodka: "bg-blue-100 text-blue-800", Beer: "bg-yellow-100 text-yellow-800",
                Wine: "bg-purple-100 text-purple-800", Cognac: "bg-red-100 text-red-800",
              };
              return (
                <div key={c.category} className={`rounded-xl px-3 py-4 text-center ${colors[c.category] ?? "bg-gray-100 text-gray-700"}`}>
                  <p className="text-lg font-bold">{pct}%</p>
                  <p className="text-xs font-semibold mt-0.5">{c.category}</p>
                  <p className="text-xs opacity-60">{c.qty} units · {fmt(c.revenue)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Orders */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <p className="font-semibold">Recent Orders</p>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">Click row to expand details</span>
            <Link href="/orders" className="text-xs font-semibold text-brand-600 hover:underline">View all →</Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-400 text-xs uppercase">
                <th className="px-4 py-3 text-left">Order</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Total</th>
                <th className="px-4 py-3 text-left">Time</th>
                <th className="px-4 py-3 w-8" />
              </tr>
            </thead>
            <tbody>
              {(d.recentOrders ?? []).length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-300 text-sm">No orders yet</td></tr>
              )}
              {(d.recentOrders ?? []).map((o: any) => <OrderRow key={o.id} order={o} />)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
