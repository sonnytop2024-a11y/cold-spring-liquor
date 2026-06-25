"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Crown, Star, Phone, MapPin, ChevronDown, ChevronUp, ShoppingBag, Package, Loader2 } from "lucide-react";
import { API } from "@/lib/api";

async function fetchCustomers(search: string) {
  const q = search ? `?search=${encodeURIComponent(search)}` : "";
  const res = await fetch(`${API}/admin/customers${q}`, { cache: "no-store" });
  return res.json();
}

async function fetchCustomerOrders(customerId: string) {
  const res = await fetch(`${API}/admin/customers/${customerId}`, { cache: "no-store" });
  return res.json();
}

function TierBadge({ tier }: { tier: string }) {
  const t = tier?.toLowerCase();
  if (t === "platinum") return <span className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium"><Crown size={10} />Platinum</span>;
  if (t === "gold") return <span className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium"><Star size={10} />Gold</span>;
  if (t === "silver") return <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">Silver</span>;
  return <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-medium">Bronze</span>;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending", confirmed: "Confirmed", preparing: "Preparing",
  driver_assigned: "Driver Assigned", driver_at_store: "At Store",
  out_for_delivery: "Out for Delivery", driver_arriving: "Arriving",
  driver_arrived: "Arrived", delivered: "Delivered",
  failed_delivery: "Failed", cancelled: "Cancelled",
};

const STATUS_COLOR: Record<string, string> = {
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  failed_delivery: "bg-red-100 text-red-700",
  pending: "bg-yellow-100 text-yellow-700",
  out_for_delivery: "bg-blue-100 text-blue-700",
  driver_arriving: "bg-blue-100 text-blue-700",
  driver_arrived: "bg-blue-100 text-blue-700",
};

function CustomerRow({ c }: { c: any }) {
  const [expanded, setExpanded] = useState(false);

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["customer-orders", c.id],
    queryFn: () => fetchCustomerOrders(c.id),
    enabled: expanded,
  });

  const addr = c.deliveryAddress;
  const addrLine = addr?.street
    ? `${addr.street}, ${addr.city}, ${addr.state} ${addr.zip}`
    : null;

  return (
    <>
      <tr
        className="hover:bg-gray-50 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm shrink-0">
              {(c.displayName || "?")[0].toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-medium text-gray-900">{c.displayName}</p>
                {c.googleId && (
                  <span className="text-blue-500 text-[10px] border border-blue-200 px-1 rounded">G</span>
                )}
              </div>
              <p className="text-xs text-gray-500">{c.email}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">
          {c.phone && c.phone !== "—" ? (
            <span className="flex items-center gap-1"><Phone size={12} />{c.phone}</span>
          ) : (
            <span className="text-gray-300">—</span>
          )}
        </td>
        <td className="px-4 py-3"><TierBadge tier={c.tier} /></td>
        <td className="px-4 py-3 font-medium text-center">{c.orderCount}</td>
        <td className="px-4 py-3 font-medium">${Number(c.totalSpend).toFixed(2)}</td>
        <td className="px-4 py-3 text-brand-600 font-medium">{c.points} pts</td>
        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
          {new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </td>
        <td className="px-4 py-3 text-gray-400">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </td>
      </tr>

      {expanded && (
        <tr className="bg-slate-50 border-b">
          <td colSpan={8} className="px-6 py-5">
            {/* ── Profile summary ─────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm mb-5">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <MapPin size={11} />Delivery Address
                </p>
                {addrLine ? (
                  <p className="text-gray-800">{addrLine}</p>
                ) : (
                  <p className="text-gray-400 italic">Not provided</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Account Info</p>
                <p className="text-gray-700">DOB: <span className="font-medium">{c.dob ? new Date(c.dob).toLocaleDateString("en-US") : "—"}</span></p>
                <p className="text-gray-700">Login: <span className="font-medium">{c.googleId ? "Google" : "Email/Password"}</span></p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <ShoppingBag size={11} />Order Summary
                </p>
                <p className="text-gray-700">Total Orders: <span className="font-medium">{c.orderCount}</span></p>
                <p className="text-gray-700">Total Spent: <span className="font-medium">${Number(c.totalSpend).toFixed(2)}</span></p>
                {c.lastOrderAt && (
                  <p className="text-gray-700">Last Order: <span className="font-medium">{new Date(c.lastOrderAt).toLocaleDateString("en-US")}</span></p>
                )}
              </div>
            </div>

            {/* ── Order history ────────────────────────────────── */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Package size={11} />Order History
              </p>

              {ordersLoading ? (
                <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
                  <Loader2 size={14} className="animate-spin" />Loading orders...
                </div>
              ) : orders.length === 0 ? (
                <p className="text-gray-400 italic text-sm">No orders yet.</p>
              ) : (
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                        <th className="text-left px-3 py-2 font-medium">Order #</th>
                        <th className="text-left px-3 py-2 font-medium">Date</th>
                        <th className="text-left px-3 py-2 font-medium">Items</th>
                        <th className="text-left px-3 py-2 font-medium">Total</th>
                        <th className="text-left px-3 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {orders.map((o: any) => (
                        <tr key={o.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2.5 font-mono text-xs text-gray-600">{o.orderNumber}</td>
                          <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                            {new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </td>
                          <td className="px-3 py-2.5 text-gray-700 max-w-[220px]">
                            <p className="truncate">
                              {o.items.slice(0, 2).map((i: any) => `${i.name} ×${i.quantity}`).join(", ")}
                              {o.items.length > 2 && ` +${o.items.length - 2} more`}
                            </p>
                          </td>
                          <td className="px-3 py-2.5 font-semibold">${Number(o.total).toFixed(2)}</td>
                          <td className="px-3 py-2.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[o.status] ?? "bg-gray-100 text-gray-600"}`}>
                              {STATUS_LABEL[o.status] ?? o.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function CustomersPage() {
  const [search, setSearch] = useState("");

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["admin-customers", search],
    queryFn: () => fetchCustomers(search),
    refetchInterval: 30_000,
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Customers</h1>
        <p className="text-gray-500 text-sm">{customers.length} registered customer{customers.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or phone..."
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading customers...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tier</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Orders</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Spent</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Points</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Joined</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                      {search ? "No customers match your search." : "No registered customers yet."}
                    </td>
                  </tr>
                ) : (
                  customers.map((c: any) => <CustomerRow key={c.id} c={c} />)
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
