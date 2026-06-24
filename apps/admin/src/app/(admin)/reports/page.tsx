"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, ShoppingBag, Users, TrendingUp, Package, Star, BarChart2, RefreshCw } from "lucide-react";
import { API } from "@/lib/api";

const PERIOD_LABELS = { today: "Today", week: "This Week", month: "This Month", year: "This Year" } as const;
type Period = keyof typeof PERIOD_LABELS;

const CAT_COLORS: Record<string, string> = {
  Whiskey: "bg-amber-500", Tequila: "bg-orange-500", Wine: "bg-red-500",
  Beer: "bg-yellow-500", Vodka: "bg-blue-500", Rum: "bg-purple-500",
  Gin: "bg-green-500", "Ready-To-Drink": "bg-pink-500", Other: "bg-gray-400",
};

function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: string | number; sub?: string; icon: any; color: string }) {
  return (
    <div className="bg-white rounded-xl border p-5">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${color}`}>
        <Icon size={20} />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>("today");

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => { const r = await fetch(`${API}/admin/reports`); return r.json(); },
    refetchInterval: 30_000,
  });

  const p = stats?.[period] ?? { orders: 0, delivered: 0, revenue: 0, avgOrder: 0 };
  const catMax = Math.max(...(stats?.categoryBreakdown ?? []).map((c: any) => c.revenue), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-gray-500 text-sm">Real-time business performance</p>
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 border rounded-lg px-3 py-2 hover:bg-gray-50">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Period selector */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
        {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${period === p ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Revenue" value={`$${Number(p.revenue).toFixed(2)}`} icon={DollarSign} color="text-green-600 bg-green-50"
          sub={`${p.delivered} orders delivered`} />
        <StatCard label="Total Orders" value={p.orders} icon={ShoppingBag} color="text-blue-600 bg-blue-50"
          sub={`${stats?.pendingOrders ?? 0} pending`} />
        <StatCard label="Avg Order" value={`$${Number(p.avgOrder).toFixed(2)}`} icon={TrendingUp} color="text-brand-600 bg-brand-50" />
        <StatCard label="Active Orders" value={stats?.activeOrders ?? 0} icon={Package} color="text-orange-600 bg-orange-50"
          sub="In progress right now" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 7-day chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><BarChart2 size={16} /> Last 7 Days Revenue</h2>
          {isLoading ? (
            <div className="h-36 flex items-center justify-center text-gray-400 text-sm">Loading...</div>
          ) : (
            <div className="flex items-end gap-2 h-36">
              {(stats?.dailyChart ?? []).map((d: any) => {
                const maxRev = Math.max(...(stats?.dailyChart ?? []).map((x: any) => x.revenue), 1);
                const pct = Math.max((d.revenue / maxRev) * 100, 4);
                return (
                  <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-500">${d.revenue > 0 ? d.revenue.toFixed(0) : ""}</span>
                    <div className="w-full bg-brand-100 rounded-t-md relative" style={{ height: `${pct}%` }}>
                      <div className="absolute inset-0 bg-brand-500 rounded-t-md" />
                    </div>
                    <span className="text-xs text-gray-500">{d.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Category breakdown */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold mb-4">Sales by Category</h2>
          {isLoading ? <p className="text-gray-400 text-sm">Loading...</p> : (
            <div className="space-y-3">
              {(stats?.categoryBreakdown ?? []).slice(0, 8).map((cat: any) => (
                <div key={cat.category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{cat.category}</span>
                    <span className="text-gray-500">${Number(cat.revenue).toFixed(0)} · {cat.qty} btl</span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${CAT_COLORS[cat.category] ?? "bg-gray-500"}`}
                      style={{ width: `${(cat.revenue / catMax) * 100}%` }} />
                  </div>
                </div>
              ))}
              {(stats?.categoryBreakdown ?? []).length === 0 && (
                <p className="text-gray-400 text-sm text-center py-4">No delivered orders yet</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Best selling products */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><Star size={16} className="text-yellow-500" /> Best Selling Products</h2>
          {isLoading ? <p className="text-gray-400 text-sm">Loading...</p> : (
            <div className="space-y-2">
              {(stats?.topProducts ?? []).map((p: any, i: number) => (
                <div key={p.name} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-yellow-100 text-yellow-700" : i === 1 ? "bg-gray-100 text-gray-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-gray-50 text-gray-500"}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{p.qty} sold</p>
                    <p className="text-xs text-green-600">${Number(p.revenue).toFixed(0)}</p>
                  </div>
                </div>
              ))}
              {(stats?.topProducts ?? []).length === 0 && (
                <p className="text-gray-400 text-sm text-center py-4">No delivered orders yet</p>
              )}
            </div>
          )}
        </div>

        {/* Top customers */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><Users size={16} /> Top Customers by Spend</h2>
          <p className="text-xs text-gray-400 mb-3">{stats?.uniqueCustomers ?? 0} unique customers · all time</p>
          {isLoading ? <p className="text-gray-400 text-sm">Loading...</p> : (
            <div className="space-y-2">
              {(stats?.topCustomers ?? []).map((c: any, i: number) => (
                <div key={c.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-xs text-gray-400 truncate">{c.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">${Number(c.total).toFixed(2)}</p>
                    <p className="text-xs text-gray-400">{c.orders} orders</p>
                  </div>
                </div>
              ))}
              {(stats?.topCustomers ?? []).length === 0 && (
                <p className="text-gray-400 text-sm text-center py-4">No customer data yet</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
