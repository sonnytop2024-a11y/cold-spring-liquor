"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, MapPin, User, ChevronRight, Package, X, Edit2, XCircle, RefreshCw, Loader2, Plus, Minus } from "lucide-react";
import { API } from "@/lib/api";

const STATUS_COLORS: Record<string, string> = {
  pending:           "bg-yellow-100 text-yellow-700",
  confirmed:         "bg-blue-100 text-blue-700",
  preparing:         "bg-purple-100 text-purple-700",
  driver_assigned:   "bg-indigo-100 text-indigo-700",
  driver_at_store:   "bg-orange-100 text-orange-700",
  out_for_delivery:  "bg-orange-100 text-orange-700",
  driver_arriving:   "bg-yellow-100 text-yellow-800",
  driver_arrived:    "bg-amber-100 text-amber-800",
  delivered:         "bg-green-100 text-green-700",
  failed_delivery:   "bg-red-100 text-red-700",
  cancelled:         "bg-red-100 text-red-700",
  refunded:          "bg-gray-100 text-gray-700",
};

const NEXT_STATUS: Record<string, string> = {
  pending:          "confirmed",
  confirmed:        "preparing",
  preparing:        "driver_assigned",
  driver_assigned:  "driver_at_store",
  driver_at_store:  "out_for_delivery",
  out_for_delivery: "driver_arriving",
  driver_arriving:  "driver_arrived",
  driver_arrived:   "delivered",
};

const ALL_STATUSES = ["pending","confirmed","preparing","driver_assigned","driver_at_store","out_for_delivery","driver_arriving","driver_arrived","delivered","failed_delivery","cancelled","refunded"];

async function patchOrderStatus(orderId: string, status: string) {
  await fetch(`${API}/orders/${orderId}/status`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

async function adminUpdateOrder(orderId: string, data: Record<string, unknown>) {
  const r = await fetch(`${API}/admin/orders/${orderId}`, {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return r.json();
}

// ── Cancel/Refund Modal ──────────────────────────────────────────────────────
function CancelModal({ order, onClose, onConfirm }: { order: any; onClose: () => void; onConfirm: (data: any) => void }) {
  const [reason, setReason] = useState("");
  const [refund, setRefund] = useState<"none"|"full"|"partial">("full");
  const [partial, setPartial] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    await onConfirm({ status: "cancelled", cancelReason: reason, refundType: refund, refundAmount: refund === "partial" ? Number(partial) : refund === "full" ? order.total : 0 });
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-lg text-red-600 flex items-center gap-2"><XCircle size={18} /> Cancel Order</h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-gray-50 rounded-xl p-3 text-sm">
            <p className="font-bold">#{order.orderNumber}</p>
            <p className="text-gray-500">{order.customerName} · ${Number(order.total).toFixed(2)}</p>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5">Cancellation Reason</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Reason for cancellation..."
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Refund</label>
            <div className="flex gap-2">
              {[["none","No Refund"],["full","Full Refund"],["partial","Partial Refund"]].map(([v,l]) => (
                <button key={v} onClick={() => setRefund(v as any)}
                  className={`flex-1 text-sm py-2 rounded-xl border font-medium transition-colors ${refund === v ? "bg-brand-500 text-white border-brand-500" : "hover:bg-gray-50"}`}>
                  {l}
                </button>
              ))}
            </div>
            {refund === "full" && <p className="text-xs text-green-600 mt-2">Refund ${Number(order.total).toFixed(2)} to customer</p>}
            {refund === "partial" && (
              <input type="text" inputMode="decimal" min="0" max={order.total} value={partial} onChange={e => setPartial(e.target.value)}
                placeholder={`Amount (max $${Number(order.total).toFixed(2)})`}
                className="mt-2 w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            )}
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t">
          <button onClick={onClose} className="flex-1 border rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">Back</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />} Confirm Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Order Modal ──────────────────────────────────────────────────────────
function EditOrderModal({ order, onClose, onSave }: { order: any; onClose: () => void; onSave: (data: any) => void }) {
  const [items, setItems] = useState<any[]>(order.items?.map((i: any) => ({ ...i })) ?? []);
  const [addr, setAddr] = useState<Record<string, string>>({ ...order.deliveryAddress });
  const [saving, setSaving] = useState(false);

  function updateQty(idx: number, delta: number) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item));
  }
  function removeItem(idx: number) { setItems(prev => prev.filter((_, i) => i !== idx)); }

  const subtotal = items.reduce((a: number, i: any) => a + i.price * i.quantity, 0);

  async function handleSave() {
    setSaving(true);
    await onSave({ items, deliveryAddress: addr });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-lg flex items-center gap-2"><Edit2 size={17} /> Edit Order #{order.orderNumber}</h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="p-5 space-y-5">
          {/* Items */}
          <div>
            <p className="text-sm font-semibold mb-2">Order Items</p>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex items-center justify-between border rounded-xl px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">${Number(item.price).toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(i, -1)} className="w-6 h-6 rounded-full border flex items-center justify-center hover:bg-gray-100"><Minus size={12} /></button>
                    <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                    <button onClick={() => updateQty(i, 1)} className="w-6 h-6 rounded-full border flex items-center justify-center hover:bg-gray-100"><Plus size={12} /></button>
                    <button onClick={() => removeItem(i)} className="ml-1 text-red-400 hover:text-red-600"><X size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 text-right text-sm font-bold">New subtotal: ${subtotal.toFixed(2)}</div>
          </div>

          {/* Delivery address */}
          <div>
            <p className="text-sm font-semibold mb-2">Delivery Address</p>
            <div className="space-y-2">
              <input value={addr.street ?? ""} onChange={e => setAddr(a => ({ ...a, street: e.target.value }))} placeholder="Street address"
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <div className="grid grid-cols-3 gap-2">
                <input value={addr.city ?? ""} onChange={e => setAddr(a => ({ ...a, city: e.target.value }))} placeholder="City"
                  className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                <input value={addr.state ?? ""} onChange={e => setAddr(a => ({ ...a, state: e.target.value }))} placeholder="State"
                  className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                <input value={addr.zip ?? ""} onChange={e => setAddr(a => ({ ...a, zip: e.target.value }))} placeholder="ZIP"
                  className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t">
          <button onClick={onClose} className="flex-1 border rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving || items.length === 0}
            className="flex-1 flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm">
            {saving ? <Loader2 size={15} className="animate-spin" /> : null} Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cancelOrder, setCancelOrder] = useState<any>(null);
  const [editOrder, setEditOrder] = useState<any>(null);
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-orders"] });

  const { data: driversData = [] } = useQuery({
    queryKey: ["admin-drivers"],
    queryFn: async () => { const r = await fetch(`${API}/admin/drivers`); return r.json(); },
    refetchInterval: 5_000,
  });
  const DRIVERS = driversData.map((d: any) => ({ id: d.id, name: d.name, isOnline: d.isOnline, active: d.active }));

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-orders", statusFilter],
    queryFn: async () => {
      const q = statusFilter ? `?status=${statusFilter}` : "";
      const r = await fetch(`${API}/admin/orders${q}`);
      return r.json();
    },
    refetchInterval: 5_000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => patchOrderStatus(id, status),
    onSuccess: invalidate,
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, driverId }: { id: string; driverId: string }) =>
      adminUpdateOrder(id, { status: "driver_assigned", driverId }),
    onSuccess: invalidate,
  });

  const adminUpdateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminUpdateOrder(id, data),
    onSuccess: () => { invalidate(); setCancelOrder(null); setEditOrder(null); },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminUpdateOrder(id, { status }),
    onSuccess: invalidate,
  });

  const today = new Date().toDateString();
  const onlineDrivers = DRIVERS.filter((d: any) => d.isOnline && d.active);
  const pendingOrders = orders.filter((o: any) => o.status === "pending");

  const SECTIONS = [
    {
      key: "new",
      label: "New Orders",
      emoji: "🔴",
      headerStyle: { background: "#fef2f2", borderColor: "#fca5a5", color: "#dc2626" },
      orders: orders.filter((o: any) => o.status === "pending"),
    },
    {
      key: "confirmed",
      label: "Confirmed & Preparing",
      emoji: "🔵",
      headerStyle: { background: "#eff6ff", borderColor: "#93c5fd", color: "#2563eb" },
      orders: orders.filter((o: any) => ["confirmed","preparing"].includes(o.status)),
    },
    {
      key: "delivery",
      label: "Out for Delivery",
      emoji: "🚗",
      headerStyle: { background: "#fff7ed", borderColor: "#fdba74", color: "#ea580c" },
      orders: orders.filter((o: any) => ["driver_assigned","driver_at_store","out_for_delivery","driver_arriving","driver_arrived"].includes(o.status)),
    },
    {
      key: "done",
      label: "Completed Today",
      emoji: "✅",
      headerStyle: { background: "#f0fdf4", borderColor: "#86efac", color: "#16a34a" },
      orders: orders.filter((o: any) => o.status === "delivered" && new Date(o.updatedAt).toDateString() === today),
    },
    {
      key: "cancelled",
      label: "Cancelled / Failed",
      emoji: "❌",
      headerStyle: { background: "#f9fafb", borderColor: "#d1d5db", color: "#6b7280" },
      orders: orders.filter((o: any) => ["cancelled","failed_delivery","refunded"].includes(o.status)),
    },
  ];

  const todayCompleted = orders.filter((o: any) => o.status === "delivered" && new Date(o.updatedAt).toDateString() === today);
  const inDelivery = orders.filter((o: any) => ["driver_assigned","driver_at_store","out_for_delivery","driver_arriving","driver_arrived"].includes(o.status));

  function renderOrder(order: any) {
    const isExpanded = expandedId === order.id;
    const nextStatus = NEXT_STATUS[order.status];
    const isDone = ["delivered","failed_delivery","cancelled","refunded"].includes(order.status);

    return (
      <div key={order.id} className={`bg-white rounded-xl border transition-all ${isDone ? "opacity-75" : ""}`}>
        <div className="p-4 flex items-start justify-between gap-4 cursor-pointer hover:bg-gray-50 rounded-xl"
          onClick={() => setExpandedId(isExpanded ? null : order.id)}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-1 flex-wrap">
              <p className="font-bold text-sm">{order.orderNumber}</p>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize ${STATUS_COLORS[order.status] ?? "bg-gray-100"}`}>
                {order.status.replace(/_/g, " ")}
              </span>
              {order.deliveryType === "next-morning" ? (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                  🌅 Next Morning
                </span>
              ) : (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-green-100 text-green-700 border border-green-200">
                  ⚡ Same-Day
                </span>
              )}
              {order.driverId && (
                <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full font-medium">
                  🚗 {DRIVERS.find((d: any) => d.id === order.driverId)?.name ?? order.driverId}
                </span>
              )}
              {order.refundType && order.refundType !== "none" && (
                <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                  💰 {order.refundType} refund
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-gray-500">
              <span className="flex items-center gap-1"><User size={11} /> {order.customerName}</span>
              <span className="flex items-center gap-1"><Clock size={11} /> {new Date(order.createdAt).toLocaleString()}</span>
              {order.deliveryAddress && (
                <span className="flex items-center gap-1">
                  <MapPin size={11} /> {order.deliveryAddress.city}, {order.deliveryAddress.state}
                </span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
            <p className="font-bold">${Number(order.total).toFixed(2)}</p>
            <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
              {nextStatus && !isDone && (
                <button onClick={() => updateMutation.mutate({ id: order.id, status: nextStatus })}
                  className="text-xs bg-brand-500 hover:bg-brand-600 text-white px-2.5 py-1 rounded-lg font-medium transition-colors">
                  → {nextStatus.replace(/_/g, " ")}
                </button>
              )}
              {!isDone && (
                <button onClick={() => setCancelOrder(order)}
                  className="text-xs text-red-600 border border-red-200 hover:bg-red-50 px-2 py-1 rounded-lg font-medium">
                  Cancel
                </button>
              )}
              <ChevronRight size={14} className={`text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="border-t px-4 py-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              {!isDone && (
                <button onClick={() => setEditOrder(order)}
                  className="flex items-center gap-1.5 text-xs border rounded-lg px-3 py-1.5 hover:bg-gray-50 font-medium">
                  <Edit2 size={12} /> Edit Order
                </button>
              )}
              {!isDone && (
                <select onChange={e => { if (e.target.value) statusMutation.mutate({ id: order.id, status: e.target.value }); }}
                  defaultValue=""
                  className="text-xs border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">Set Status…</option>
                  {ALL_STATUSES.filter(s => s !== order.status).map(s => (
                    <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                  ))}
                </select>
              )}
              {order.status === "cancelled" && (
                <button onClick={() => adminUpdateMutation.mutate({ id: order.id, data: { status: "pending", refundType: "full" } })}
                  className="flex items-center gap-1.5 text-xs border border-green-200 text-green-700 rounded-lg px-3 py-1.5 hover:bg-green-50 font-medium">
                  <RefreshCw size={12} /> Restore Order
                </button>
              )}
            </div>

            {order.cancelReason && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
                <p className="font-semibold">Cancelled</p>
                <p>{order.cancelReason}</p>
                {order.refundType && order.refundType !== "none" && (
                  <p className="mt-1 font-medium">
                    {order.refundType === "full" ? `Full refund: $${Number(order.total).toFixed(2)}` : `Partial refund: $${Number(order.refundAmount ?? 0).toFixed(2)}`}
                  </p>
                )}
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Items</p>
              <div className="space-y-1">
                {order.items?.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{item.name} ×{item.quantity}</span>
                    <span className="text-gray-600">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 border rounded-xl p-3 space-y-1.5 text-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Financial Breakdown</p>
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>${Number(order.subtotal).toFixed(2)}</span></div>
              {Number(order.bundleDiscount) > 0 && <div className="flex justify-between text-blue-600"><span>Bundle Discount</span><span>-${Number(order.bundleDiscount).toFixed(2)}</span></div>}
              {Number(order.couponDiscount) > 0 && <div className="flex justify-between text-green-600"><span>Promo ({order.couponCode})</span><span>-${Number(order.couponDiscount).toFixed(2)}</span></div>}
              <div className="flex justify-between text-green-600"><span>Delivery Fee</span><span>FREE</span></div>
              <div className="flex justify-between text-gray-600"><span>Tax (8.25%)</span><span>${Number(order.tax).toFixed(2)}</span></div>
              <div className="flex justify-between font-bold border-t pt-1.5"><span>Order Total</span><span>${Number(order.total).toFixed(2)}</span></div>
            </div>

            {order.deliveryAddress && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Delivery Address</p>
                <p className="text-sm">{order.deliveryAddress.street}</p>
                <p className="text-sm text-gray-500">{order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.zip}</p>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Customer</p>
              <p className="text-sm">{order.customerName}</p>
              <p className="text-sm text-gray-500">{order.customerEmail} · {order.customerPhone}</p>
            </div>

            {!isDone && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  Assign Driver
                  <span className="ml-2 normal-case font-normal text-gray-400">(Only online drivers shown)</span>
                </p>
                {onlineDrivers.length === 0 ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 font-medium">
                    🚨 No drivers online — cannot assign this order. Ask a driver to go online first.
                  </div>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    {onlineDrivers.map((d: any) => (
                      <button key={d.id} onClick={() => assignMutation.mutate({ id: order.id, driverId: d.id })}
                        className={`text-sm px-3 py-1.5 rounded-lg border transition-colors font-medium flex items-center gap-1.5 ${
                          order.driverId === d.id ? "bg-purple-500 text-white border-purple-500" : "hover:bg-purple-50 hover:border-purple-300"
                        }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        {d.name}{order.driverId === d.id && " ✓"}
                      </button>
                    ))}
                  </div>
                )}
                {DRIVERS.filter((d: any) => d.active && !d.isOnline).length > 0 && (
                  <p className="text-xs text-gray-400 mt-2">
                    Offline: {DRIVERS.filter((d: any) => d.active && !d.isOnline).map((d: any) => d.name).join(", ")}
                  </p>
                )}
              </div>
            )}

            {/* Status timestamps */}
            {order.statusTimestamps && Object.keys(order.statusTimestamps).length > 0 && (
              <div className="bg-gray-50 border rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Delivery Timeline</p>
                <div className="space-y-1">
                  {(["out_for_delivery","driver_arriving","driver_arrived","delivered","failed_delivery"] as const).map(s => {
                    const ts = order.statusTimestamps?.[s];
                    if (!ts) return null;
                    const label: Record<string, string> = {
                      out_for_delivery: "Driver on the way",
                      driver_arriving: "Driver arriving soon",
                      driver_arrived: "Driver arrived",
                      delivered: "Delivered",
                      failed_delivery: "Failed delivery",
                    };
                    return (
                      <div key={s} className="flex justify-between text-xs text-gray-600">
                        <span>{label[s]}</span>
                        <span className="font-mono text-gray-400">{new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                      </div>
                    );
                  })}
                  {/* Wait time */}
                  {order.statusTimestamps?.["driver_arrived"] && order.statusTimestamps?.["delivered"] && (
                    <div className="flex justify-between text-xs font-medium text-gray-700 border-t pt-1 mt-1">
                      <span>Wait time at door</span>
                      <span>{Math.round((new Date(order.statusTimestamps["delivered"]).getTime() - new Date(order.statusTimestamps["driver_arrived"]).getTime()) / 1000 / 60)} min</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Delivery confirmations (ID check checklist) */}
            {order.deliveryConfirmations && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Delivery Verification Details</p>
                <div className="space-y-1.5 text-xs">
                  {order.deliveryConfirmations.customerAge !== undefined && (
                    <div className={`flex items-center gap-2 font-semibold ${order.deliveryConfirmations.customerAge >= 21 ? "text-green-700" : "text-red-600"}`}>
                      <span>{order.deliveryConfirmations.customerAge >= 21 ? "✅" : "❌"}</span>
                      <span>Customer age: {order.deliveryConfirmations.customerAge} years old</span>
                      {order.deliveryConfirmations.customerDob && (
                        <span className="text-gray-400 font-normal">(DOB: {order.deliveryConfirmations.customerDob})</span>
                      )}
                    </div>
                  )}
                  <div className={`flex items-center gap-2 ${order.deliveryConfirmations.ageVerified ? "text-green-700" : "text-red-600"}`}>
                    <span>{order.deliveryConfirmations.ageVerified ? "✅" : "❌"}</span>
                    <span>Driver confirmed customer is 21+</span>
                  </div>
                  <div className={`flex items-center gap-2 ${order.deliveryConfirmations.idChecked ? "text-green-700" : "text-red-600"}`}>
                    <span>{order.deliveryConfirmations.idChecked ? "✅" : "❌"}</span>
                    <span>Valid government-issued photo ID checked</span>
                  </div>
                  {"nameMatched" in order.deliveryConfirmations && (
                    <div className={`flex items-center gap-2 ${order.deliveryConfirmations.nameMatched ? "text-green-700" : "text-red-600"}`}>
                      <span>{order.deliveryConfirmations.nameMatched ? "✅" : "❌"}</span>
                      <span>ID name matches order name</span>
                    </div>
                  )}
                  <div className={`flex items-center gap-2 ${order.deliveryConfirmations.handedToCustomer ? "text-green-700" : "text-red-600"}`}>
                    <span>{order.deliveryConfirmations.handedToCustomer ? "✅" : "❌"}</span>
                    <span>Order handed directly to customer</span>
                  </div>
                </div>
              </div>
            )}

            {/* Delivery evidence — shown whenever present, independent of deliveryConfirmations */}
            {(order.signatureUrl || order.deliveryProof) && (
              <div className="border border-gray-200 rounded-xl p-3 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase">Delivery Evidence</p>
                {order.signatureUrl && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1.5">✍️ Customer Signature</p>
                    <div className="border rounded-xl overflow-hidden bg-gray-50 p-2">
                      <img
                        src={order.signatureUrl}
                        alt="Customer signature"
                        className="w-full max-h-28 object-contain"
                      />
                    </div>
                  </div>
                )}
                {order.deliveryProof && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1.5">📷 Proof of Delivery Photo</p>
                    <div className="rounded-xl overflow-hidden">
                      <img
                        src={order.deliveryProof}
                        alt="Proof of delivery"
                        className="w-full max-h-56 object-cover rounded-xl"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
            {order.failReason && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
                ❌ {order.failReason}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {cancelOrder && (
        <CancelModal order={cancelOrder} onClose={() => setCancelOrder(null)}
          onConfirm={data => adminUpdateMutation.mutateAsync({ id: cancelOrder.id, data })} />
      )}
      {editOrder && (
        <EditOrderModal order={editOrder} onClose={() => setEditOrder(null)}
          onSave={data => adminUpdateMutation.mutateAsync({ id: editOrder.id, data })} />
      )}

      {/* No drivers + pending orders alert */}
      {pendingOrders.length > 0 && onlineDrivers.length === 0 && (
        <div className="mb-4 bg-red-50 border border-red-300 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-red-500 text-xl">🚨</span>
          <div>
            <p className="font-bold text-sm text-red-700">
              {pendingOrders.length} pending order{pendingOrders.length > 1 ? "s" : ""} — No drivers online!
            </p>
            <p className="text-xs text-red-600">Ask a driver to go online to accept deliveries.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Orders & Deliveries</h1>
          <p className="text-gray-500 text-sm">
            {orders.length} total ·{" "}
            <span className={onlineDrivers.length > 0 ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
              {onlineDrivers.length} driver{onlineDrivers.length !== 1 ? "s" : ""} online
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="flex items-center gap-1.5 text-sm text-gray-500 border rounded-lg px-3 py-2 hover:bg-gray-50">
            <RefreshCw size={14} />
          </button>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="">All Sections</option>
            {Object.keys(STATUS_COLORS).map(s => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Today's Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: "New Orders", value: pendingOrders.length, color: "#dc2626", bg: "#fef2f2", emoji: "🔴" },
          { label: "In Delivery", value: inDelivery.length, color: "#ea580c", bg: "#fff7ed", emoji: "🚗" },
          { label: "Completed Today", value: todayCompleted.length, color: "#16a34a", bg: "#f0fdf4", emoji: "✅" },
          { label: "Drivers Online", value: onlineDrivers.length, color: onlineDrivers.length > 0 ? "#2563eb" : "#dc2626", bg: onlineDrivers.length > 0 ? "#eff6ff" : "#fef2f2", emoji: "👤" },
        ].map(({ label, value, color, bg, emoji }) => (
          <div key={label} className="rounded-xl border p-4 text-center" style={{ background: bg, borderColor: `${color}40` }}>
            <p className="text-2xl font-black" style={{ color }}>{emoji} {value}</p>
            <p className="text-xs text-gray-500 font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
          <Loader2 size={24} className="animate-spin mx-auto mb-2" /> Loading orders…
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl border p-10 text-center text-gray-400">
          <Package size={36} className="mx-auto mb-2 opacity-30" />
          <p>No orders yet</p>
        </div>
      ) : (
        <div className="space-y-1">
          {SECTIONS.map(section => {
            if (section.orders.length === 0) return null;
            return (
              <div key={section.key} className="mb-4">
                {/* Section header */}
                <div className="flex items-center gap-2 rounded-xl border px-4 py-2.5 mb-2" style={section.headerStyle}>
                  <span className="font-bold text-sm">{section.emoji} {section.label}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/60">
                    {section.orders.length}
                  </span>
                </div>
                {/* Section orders */}
                <div className="space-y-2 pl-2 border-l-2 ml-2" style={{ borderColor: section.headerStyle.borderColor }}>
                  {section.orders.map((order: any) => renderOrder(order))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
