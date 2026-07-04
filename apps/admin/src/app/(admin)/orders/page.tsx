"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, MapPin, User, ChevronRight, Package, X, Edit2, XCircle, RefreshCw, Loader2, Plus, Minus, FlaskConical , Search } from "lucide-react";
import { API } from "@/lib/api";

// ─── Audio alert (persistent ctx — required by iOS/Safari) ───────────────────
let _adminAudioCtx: AudioContext | null = null;
function getAdminAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const ACtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!ACtx) return null;
  if (!_adminAudioCtx) _adminAudioCtx = new ACtx();
  return _adminAudioCtx;
}
function unlockAdminAudio() {
  const ctx = getAdminAudioCtx();
  if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
}
async function playAdminAlertSound() {
  try {
    const ctx = getAdminAudioCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") await ctx.resume();
    const freqs = [660, 880, 1100];
    freqs.forEach((freq, i) => {
      const t = i * 0.28;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const comp = ctx.createDynamicsCompressor();
      osc.connect(gain); gain.connect(comp); comp.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      gain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + t + 0.02);
      gain.gain.setValueAtTime(1.0, ctx.currentTime + t + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.26);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.28);
    });
  } catch {}
}

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
  ready_for_pickup:  "bg-amber-100 text-amber-800",
  picked_up:         "bg-green-100 text-green-700",
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

// Pick Up orders have their own flow: New → Preparing → Ready for Pick Up → Picked Up
const PICKUP_NEXT_STATUS: Record<string, string> = {
  pending:          "preparing",
  confirmed:        "preparing",
  preparing:        "ready_for_pickup",
  ready_for_pickup: "picked_up",
};
const PICKUP_STATUSES = ["pending","preparing","ready_for_pickup","picked_up","cancelled"];

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

// ── Read-only Order Detail Modal — viewable at ANY status ───────────────────
function DetailModal({ order, onClose }: { order: any; onClose: () => void }) {
  const isPickup = order.orderType === "pickup";
  const addr = order.deliveryAddress;
  const paid = !!(order.stripePaymentIntentId || order.paypalOrderId) || order.paymentMethod === "gift_card";
  const money = (n: any) => `$${Number(n ?? 0).toFixed(2)}`;
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b px-5 py-4 flex items-center justify-between">
          <div>
            <p className="font-bold">Order {order.orderNumber}</p>
            <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleString()}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none px-2">×</button>
        </div>
        <div className="px-5 py-4 space-y-4 text-sm">
          <div className="flex flex-wrap gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_COLORS[order.status] ?? "bg-gray-100"}`}>{String(order.status).replace(/_/g, " ")}</span>
            {isPickup
              ? <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-orange-100 text-orange-700">🏬 Pick Up In Store</span>
              : <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-green-100 text-green-700">🚚 {order.deliveryType === "next-morning" ? "Next Morning" : "Same-Day"}</span>}
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${paid ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
              {paid ? "💳 Paid" : "💳 Unpaid"}{order.paymentMethod ? ` · ${order.paymentMethod}` : ""}
            </span>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Customer</p>
            <p className="font-medium">{order.customerName}</p>
            <p className="text-gray-500">{order.customerEmail}</p>
            {order.customerPhone && <a href={`tel:${order.customerPhone}`} className="text-brand-600 font-semibold">📞 {order.customerPhone}</a>}
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{isPickup ? "Pick Up" : "Delivery Address"}</p>
            {isPickup ? (
              <>
                {order.pickupWindow && <p className="font-medium text-orange-700">🕐 {order.pickupWindow.dateLabel} · {order.pickupWindow.label}</p>}
                <p className="text-gray-500">Store: 15609 Ronald Reagan Blvd Suite B-100, Leander, TX 78641</p>
                {order.pickedUpAt && <p className="text-green-600 text-xs mt-0.5">✅ Picked up {new Date(order.pickedUpAt).toLocaleString()}</p>}
              </>
            ) : addr ? (
              <p>{addr.street}, {addr.city}, {addr.state} {addr.zip}</p>
            ) : <p className="text-gray-400">—</p>}
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Items ({order.items?.length ?? 0})</p>
            <div className="space-y-1.5">
              {order.items?.map((it: any, i: number) => (
                <div key={i} className="flex justify-between gap-3">
                  <span className="text-gray-700">{it.name} <span className="text-gray-400">×{it.quantity}</span></span>
                  <span className="font-medium shrink-0">{money(it.price * it.quantity)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-3.5 space-y-1">
            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{money(order.subtotal)}</span></div>
            {Number(order.bundleDiscount) > 0 && <div className="flex justify-between text-purple-600"><span>📦 Bundle</span><span>-{money(order.bundleDiscount)}</span></div>}
            {Number(order.couponDiscount) > 0 && <div className="flex justify-between text-green-600"><span>🏷️ Coupon{order.couponCode ? ` (${order.couponCode})` : ""}</span><span>-{money(order.couponDiscount)}</span></div>}
            {Number(order.rewardsDiscount) > 0 && <div className="flex justify-between text-purple-600"><span>🏆 Rewards</span><span>-{money(order.rewardsDiscount)}</span></div>}
            {Number(order.giftCardAmount) > 0 && <div className="flex justify-between text-green-600"><span>🎁 Gift Card</span><span>-{money(order.giftCardAmount)}</span></div>}
            {Number(order.pickupDiscount) > 0 && <div className="flex justify-between text-green-600 font-medium"><span>💚 Pick Up Discount</span><span>-{money(order.pickupDiscount)}</span></div>}
            <div className="flex justify-between text-gray-500"><span>Tax</span><span>{money(order.tax)}</span></div>
            <div className="flex justify-between font-bold text-base border-t pt-1.5 mt-1"><span>Total</span><span>{money(order.total)}</span></div>
            {order.refundedAmount != null && <div className="flex justify-between text-red-600 font-medium"><span>↩️ Refunded</span><span>{money(order.refundedAmount)}</span></div>}
          </div>

          {order.adminNote && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-800">📝 {order.adminNote}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Cancel/Refund Modal ──────────────────────────────────────────────────────
function CancelModal({ order, onClose, onConfirm }: { order: any; onClose: () => void; onConfirm: (data: any) => Promise<any> }) {
  const [reason, setReason] = useState("");
  const [refund, setRefund] = useState<"none"|"full"|"partial">("full");
  const [partial, setPartial] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      const result = await onConfirm({ status: "cancelled", cancelReason: reason, refundType: refund, refundAmount: refund === "partial" ? Number(partial) : refund === "full" ? order.total : 0 });
      if (result?.error) setError(result.error);
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
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
        {error && (
          <div className="mx-5 mb-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2">
            ⚠️ {error}
          </div>
        )}
        <div className="flex gap-3 p-5 border-t">
          <button onClick={onClose} className="flex-1 border rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">Back</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
            {loading ? (refund !== "none" ? "Processing Refund…" : "Cancelling…") : "Confirm Cancel"}
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
  const [dateFilter, setDateFilter] = useState("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(30);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cancelOrder, setCancelOrder] = useState<any>(null);
  const [detailOrder, setDetailOrder] = useState<any>(null);
  const [editOrder, setEditOrder] = useState<any>(null);
  const [creatingTest, setCreatingTest] = useState(false);
  const [showTestOrders, setShowTestOrders] = useState(false);
  const prevPendingIdsRef = useRef<Set<string>>(new Set<string>());
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-orders"] });

  // Unlock AudioContext on first interaction (required by iOS Safari)
  useEffect(() => {
    const unlock = () => { unlockAdminAudio(); document.removeEventListener("touchstart", unlock); document.removeEventListener("click", unlock); };
    document.addEventListener("touchstart", unlock, { once: true, passive: true });
    document.addEventListener("click", unlock, { once: true });
    return () => { document.removeEventListener("touchstart", unlock); document.removeEventListener("click", unlock); };
  }, []);

  async function createTestOrder() {
    setCreatingTest(true);
    try {
      const r = await fetch(`${API}/admin/test-order`, { method: "POST" });
      if (!r.ok) throw new Error("Failed");
      invalidate();
    } finally {
      setCreatingTest(false);
    }
  }

  const { data: driversData = [] } = useQuery({
    queryKey: ["admin-drivers"],
    queryFn: async () => { const r = await fetch(`${API}/admin/drivers`); return r.json(); },
    refetchInterval: 5_000,
  });
  const DRIVERS = (Array.isArray(driversData) ? driversData : []).map((d: any) => ({ id: d.id, name: d.name, isOnline: d.isOnline, active: d.active }));

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const r = await fetch(`${API}/admin/orders`);
      if (!r.ok) throw new Error(`Failed to load orders (${r.status})`);
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

  const isTest = (o: any) => String(o.orderNumber ?? "").startsWith("TEST-");
  const liveOrders = orders.filter((o: any) => !isTest(o));
  const testOrders = orders.filter(isTest);

  const pendingOrders = liveOrders.filter((o: any) => o.status === "pending");

  // Play alert when a genuinely new live pending order arrives
  useEffect(() => {
    const currentIds = new Set<string>(pendingOrders.map((o: any) => String(o.id)));
    if (prevPendingIdsRef.current.size > 0) {
      for (const id of currentIds) {
        if (!prevPendingIdsRef.current.has(id)) { playAdminAlertSound(); break; }
      }
    }
    prevPendingIdsRef.current = currentIds;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingOrders.map((o: any) => o.id).join(",")]);

  // ── POS-style filtering ─────────────────────────────────────────────
  const DATE_FILTERS = [
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "7d", label: "Last 7 Days" },
    { key: "week", label: "This Week" },
    { key: "month", label: "This Month" },
    { key: "lastmonth", label: "Last Month" },
    { key: "custom", label: "📅 Custom" },
    { key: "all", label: "All Orders" },
  ];
  const TYPE_FILTERS = [
    { key: "all", label: "All" },
    { key: "delivery", label: "🚚 Delivery" },
    { key: "pickup", label: "🏬 Pick Up" },
    { key: "new", label: "New" },
    { key: "preparing", label: "Preparing" },
    { key: "delivering", label: "Delivering" },
    { key: "ready", label: "Ready for Pick Up" },
    { key: "completed", label: "Completed" },
    { key: "cancelled", label: "Cancelled" },
    { key: "refunded", label: "Refunded" },
  ];

  const DAY_MS = 86_400_000;
  function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); }
  function inDateRange(o: any): boolean {
    const t = new Date(o.createdAt).getTime();
    const now = new Date();
    const todayStart = startOfDay(now);
    switch (dateFilter) {
      case "today":     return t >= todayStart;
      case "yesterday": return t >= todayStart - DAY_MS && t < todayStart;
      case "7d":        return t >= todayStart - 6 * DAY_MS;
      case "week": {    const dow = (now.getDay() + 6) % 7; return t >= todayStart - dow * DAY_MS; }
      case "month":     return t >= new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      case "lastmonth": {
        const s0 = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
        const e0 = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        return t >= s0 && t < e0;
      }
      case "custom": {
        const s0 = customFrom ? new Date(`${customFrom}T00:00:00`).getTime() : 0;
        const e0 = customTo ? new Date(`${customTo}T23:59:59`).getTime() : Infinity;
        return t >= s0 && t <= e0;
      }
      default: return true;
    }
  }
  function matchTypeFilter(o: any): boolean {
    switch (typeFilter) {
      case "delivery":   return o.orderType !== "pickup";
      case "pickup":     return o.orderType === "pickup";
      case "new":        return o.status === "pending";
      case "preparing":  return ["confirmed", "preparing"].includes(o.status);
      case "delivering": return ["driver_assigned", "driver_at_store", "out_for_delivery", "driver_arriving", "driver_arrived"].includes(o.status);
      case "ready":      return o.status === "ready_for_pickup";
      case "completed":  return ["delivered", "picked_up"].includes(o.status);
      case "cancelled":  return ["cancelled", "failed_delivery"].includes(o.status);
      case "refunded":   return o.status === "refunded" || o.refundStatus === "succeeded";
      default: return true;
    }
  }
  function matchSearch(o: any): boolean {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const driverName = DRIVERS.find((d: any) => d.id === o.driverId)?.name ?? "";
    return [o.orderNumber, o.customerName, o.customerPhone, driverName]
      .some((v) => String(v ?? "").toLowerCase().includes(q));
  }

  const filtered = liveOrders
    .filter((o: any) => inDateRange(o) && matchTypeFilter(o) && matchSearch(o))
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const revenue = filtered
    .filter((o: any) => !["cancelled", "failed_delivery", "refunded"].includes(o.status))
    .reduce((a: number, o: any) => a + Number(o.total ?? 0), 0);
  const visible = filtered.slice(0, visibleCount);

  // Reset pagination when filters change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setVisibleCount(30); }, [dateFilter, typeFilter, search, customFrom, customTo]);

  function dayLabel(dateStr: string): string {
    const t = startOfDay(new Date(dateStr));
    const today = startOfDay(new Date());
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    const d = new Date(dateStr);
    if (t === today) return `Today — ${d.toLocaleDateString("en-US", opts)}`;
    if (t === today - DAY_MS) return `Yesterday — ${d.toLocaleDateString("en-US", opts)}`;
    const withYear = d.getFullYear() !== new Date().getFullYear();
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", ...(withYear ? { year: "numeric" } : {}) });
  }
  // Group visible orders by day (list is already newest-first)
  const groups: { label: string; orders: any[] }[] = [];
  for (const o of visible) {
    const label = dayLabel(o.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.orders.push(o);
    else groups.push({ label, orders: [o] });
  }


  function renderOrder(order: any) {
    const isExpanded = expandedId === order.id;
    const isPickupOrder = order.orderType === "pickup";
    const nextStatus = isPickupOrder ? PICKUP_NEXT_STATUS[order.status] : NEXT_STATUS[order.status];
    const isDone = ["delivered","failed_delivery","cancelled","refunded","picked_up"].includes(order.status);

    const STATUS_LABELS: Record<string, string> = {
      pending: "New", confirmed: "Confirmed", preparing: "Preparing",
      driver_assigned: "Driver Assigned", driver_at_store: "At Store",
      out_for_delivery: "On the Way", driver_arriving: "Arriving",
      driver_arrived: "Arrived", delivered: "Delivered",
      failed_delivery: "Failed", cancelled: "Cancelled", refunded: "Refunded",
      ready_for_pickup: "Ready for Pick Up", picked_up: "Picked Up",
    };

    return (
      <div key={order.id} className={`bg-white rounded-xl border transition-all ${isDone ? "opacity-60" : ""}`}>
        <div className="p-3 sm:p-4 flex items-start justify-between gap-3 cursor-pointer hover:bg-gray-50 rounded-xl"
          onClick={() => setExpandedId(isExpanded ? null : order.id)}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="font-bold text-sm">{order.orderNumber}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[order.status] ?? "bg-gray-100"}`}>
                {STATUS_LABELS[order.status] ?? order.status}
              </span>
              {isPickupOrder ? (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-orange-100 text-orange-700 border border-orange-200">
                  🏬 Pick Up In Store
                </span>
              ) : order.deliveryType === "next-morning" ? (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                  🌅 Next Morning
                </span>
              ) : (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-green-100 text-green-700 border border-green-200">
                  ⚡ Same-Day
                </span>
              )}
              {isPickupOrder && (order.readyEmailSent || order.readySmsSent) && (
                <>
                  {order.readyEmailSent && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-50 text-green-700 border border-green-200">✉️ Email Sent ✓</span>}
                  {order.readySmsSent && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-50 text-green-700 border border-green-200">📱 SMS Sent ✓</span>}
                </>
              )}
              {(() => {
                const paid = !!(order.stripePaymentIntentId || order.paypalOrderId) || order.paymentMethod === "gift_card";
                if (order.status === "refunded" || order.refundStatus === "succeeded") return <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-red-100 text-red-700">↩ Refunded</span>;
                return <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${paid ? "bg-green-50 text-green-700 border border-green-200" : "bg-yellow-50 text-yellow-700 border border-yellow-200"}`}>{paid ? "💳 Paid" : "Unpaid"}</span>;
              })()}
              {order.driverId && (
                <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full font-medium">
                  🚗 {DRIVERS.find((d: any) => d.id === order.driverId)?.name ?? order.driverId}
                </span>
              )}
              {order.refundType && order.refundType !== "none" && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  order.refundStatus === "succeeded" ? "bg-green-100 text-green-700" :
                  order.refundStatus === "failed"    ? "bg-red-100 text-red-700" :
                  order.refundStatus === "pending"   ? "bg-yellow-100 text-yellow-700" :
                  "bg-gray-100 text-gray-600"
                }`}>
                  💰 {order.refundType} refund
                  {order.refundStatus === "succeeded" && order.refundedAmount != null && ` · $${Number(order.refundedAmount).toFixed(2)} refunded`}
                  {order.refundStatus === "failed"    && " · FAILED"}
                  {order.refundStatus === "pending"   && " · pending"}
                  {!order.refundStatus && " · pending"}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-gray-500">
              <span className="flex items-center gap-1"><User size={11} /> {order.customerName}</span>
              {order.customerPhone && <span className="flex items-center gap-1">📞 {order.customerPhone}</span>}
              <span className="flex items-center gap-1"><Clock size={11} /> {new Date(order.createdAt).toLocaleString()}</span>
              {isPickupOrder && order.pickupWindow ? (
                <span className="flex items-center gap-1 font-semibold text-orange-600">
                  🕐 {order.pickupWindow.dateLabel} · {order.pickupWindow.label}
                </span>
              ) : order.deliveryAddress ? (
                <span className="flex items-center gap-1">
                  <MapPin size={11} /> {order.deliveryAddress.city}, {order.deliveryAddress.state}
                </span>
              ) : null}
              {(order.pickupDiscount ?? 0) > 0 && (
                <span className="text-green-600 font-medium">💚 -${Number(order.pickupDiscount).toFixed(2)} pickup discount</span>
              )}
            </div>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-1.5">
            <p className="font-bold text-sm">${Number(order.total).toFixed(2)}</p>
            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
              <button onClick={() => setDetailOrder(order)} title="View full details"
                className="text-[13px] border border-gray-200 hover:bg-gray-50 text-gray-500 px-2 py-1 rounded-lg">
                👁
              </button>
              {nextStatus && !isDone && (
                <button onClick={() => updateMutation.mutate({ id: order.id, status: nextStatus })}
                  className="text-[11px] bg-brand-500 hover:bg-brand-600 text-white px-2 py-1 rounded-lg font-semibold transition-colors whitespace-nowrap">
                  {STATUS_LABELS[nextStatus] ?? nextStatus} →
                </button>
              )}
              {!isDone && (
                <button onClick={() => setCancelOrder(order)}
                  className="text-[11px] text-red-500 border border-red-200 hover:bg-red-50 px-1.5 py-1 rounded-lg">
                  ✕
                </button>
              )}
              <ChevronRight size={13} className={`text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
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
                  {(isPickupOrder ? PICKUP_STATUSES : ALL_STATUSES).filter(s => s !== order.status).map(s => (
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
              {Number(order.bundleDiscount) > 0 && <div className="flex justify-between text-blue-600"><span>📦 Bundle Discount</span><span>-${Number(order.bundleDiscount).toFixed(2)}</span></div>}
              {Number(order.couponDiscount) > 0 && <div className="flex justify-between text-green-600"><span>🏷️ Promo ({order.couponCode})</span><span>-${Number(order.couponDiscount).toFixed(2)}</span></div>}
              {Number(order.rewardsDiscount) > 0 && <div className="flex justify-between text-purple-600"><span>🏆 Rewards ({order.rewardsPointsToRedeem} pts)</span><span>-${Number(order.rewardsDiscount).toFixed(2)}</span></div>}
              {Number(order.giftCardAmount) > 0 && <div className="flex justify-between text-emerald-600"><span>🎁 Gift Card ({order.giftCardCode})</span><span>-${Number(order.giftCardAmount).toFixed(2)}</span></div>}
              <div className="flex justify-between text-green-600"><span>Delivery Fee</span><span>FREE</span></div>
              <div className="flex justify-between text-gray-600"><span>Tax (8.25%)</span><span>${Number(order.tax).toFixed(2)}</span></div>
              <div className="flex justify-between font-bold border-t pt-1.5"><span>Order Total</span><span>${Number(order.total).toFixed(2)}</span></div>
              {/* Payment method */}
              <div className="border-t pt-2 mt-1">
                <div className="flex justify-between text-gray-500 text-xs">
                  <span className="font-semibold uppercase tracking-wide">Payment</span>
                  <span className="font-medium text-gray-700 text-right">
                    {(() => {
                      const gc = Number(order.giftCardAmount) > 0;
                      const fullGift = order.paymentMethod === "gift_card" || (gc && Number(order.total) === 0);
                      const partialGift = gc && Number(order.total) > 0;
                      if (order.paymentMethod === "paypal") {
                        return "🅿️ PayPal" + (order.paypalOrderId ? ` · ${order.paypalOrderId.slice(0,12)}…` : "");
                      }
                      if (fullGift) {
                        return `🎁 Gift Card · $${Number(order.giftCardAmount).toFixed(2)} (full)`;
                      }
                      if (partialGift) {
                        const cardAmt = Number(order.total);
                        return (
                          <span className="flex flex-col items-end gap-0.5">
                            <span>🎁 Gift Card · ${Number(order.giftCardAmount).toFixed(2)}</span>
                            <span>💳 Card (Stripe) · ${cardAmt.toFixed(2)}</span>
                          </span>
                        );
                      }
                      if (order.paymentMethod === "stripe" || !order.paymentMethod) {
                        return "💳 Card (Stripe)" + (order.stripePaymentIntentId ? ` · ${order.stripePaymentIntentId.slice(3,15)}…` : "");
                      }
                      return order.paymentMethod;
                    })()}
                  </span>
                </div>
              </div>
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

            {isPickupOrder && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-gray-700 space-y-1">
                <p className="font-semibold text-gray-500 uppercase">🏬 Pick Up Details</p>
                {order.pickupWindow && <p>🕐 Window: <b>{order.pickupWindow.dateLabel} · {order.pickupWindow.label}</b></p>}
                <p>💳 Payment: <b>{order.stripePaymentIntentId || order.paypalOrderId ? "Paid" : order.paymentMethod === "gift_card" ? "Paid (Gift Card)" : "—"}</b>{order.paymentMethod ? ` (${order.paymentMethod})` : ""}</p>
                {(order.pickupDiscount ?? 0) > 0 && <p>💚 Pick Up Discount: <b>-${Number(order.pickupDiscount).toFixed(2)} (5%)</b></p>}
                {order.pickedUpAt && <p>✅ Picked up at: <b>{new Date(order.pickedUpAt).toLocaleString()}</b></p>}
                <p>
                  ✉️ Email: <b>{order.readyEmailSent ? "Sent ✓" : "—"}</b>
                  &nbsp;·&nbsp; 📱 SMS: <b>{order.readySmsSent ? "Sent ✓" : "—"}</b>
                </p>
              </div>
            )}

            {!isDone && !isPickupOrder && (
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
      {detailOrder && <DetailModal order={detailOrder} onClose={() => setDetailOrder(null)} />}
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
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold">Orders</h1>
            <p className="text-gray-500 text-xs sm:text-sm">
              {orders.length} total ·{" "}
              <span className={onlineDrivers.length > 0 ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
                {onlineDrivers.length} driver{onlineDrivers.length !== 1 ? "s" : ""} online
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={createTestOrder}
              disabled={creatingTest}
              title="Create a test order (103 E Market St, Leander TX) — skips payment"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-dashed border-amber-400 text-amber-600 rounded-lg hover:bg-amber-50 disabled:opacity-50"
            >
              {creatingTest ? <Loader2 size={13} className="animate-spin" /> : <FlaskConical size={13} />}
              Test Order
            </button>
            <button onClick={() => refetch()} className="p-2 text-gray-500 border rounded-lg hover:bg-gray-50">
              <RefreshCw size={14} />
            </button>

          </div>
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search order #, customer, phone, driver…"
            className="w-full bg-white border rounded-xl pl-9 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>
          )}
        </div>

        {/* Date filter chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1.5 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {DATE_FILTERS.map(f => (
            <button key={f.key} onClick={() => setDateFilter(f.key)}
              className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border-[1.5px] whitespace-nowrap transition-colors ${
                dateFilter === f.key ? "bg-brand-500 border-brand-500 text-white" : "bg-white border-gray-200 text-gray-600 hover:border-brand-300"
              } ${f.key === "custom" ? "border-dashed" : ""}`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Custom range inputs */}
        {dateFilter === "custom" && (
          <div className="flex items-center gap-2 mt-1.5 mb-1">
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              className="flex-1 border rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-400" />
            <span className="text-gray-400 text-xs">→</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              className="flex-1 border rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>
        )}

        {/* Type / status chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1.5 -mx-1 px-1 mt-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TYPE_FILTERS.map(f => (
            <button key={f.key} onClick={() => setTypeFilter(f.key)}
              className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border-[1.5px] whitespace-nowrap transition-colors ${
                typeFilter === f.key ? "bg-gray-900 border-gray-900 text-white" : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Period summary */}
        <div className="mt-2 flex items-center justify-between bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl px-4 py-2.5">
          <div>
            <p className="text-[10px] font-black tracking-wider text-orange-800/70 uppercase">Orders</p>
            <p className="font-black text-gray-900">{filtered.length}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black tracking-wider text-orange-800/70 uppercase">Revenue</p>
            <p className="font-black text-brand-600 text-lg tabular-nums">${revenue.toFixed(2)}</p>
          </div>
        </div>
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
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border p-10 text-center text-gray-400">
              <Package size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No orders match these filters</p>
            </div>
          ) : (
            <>
              {groups.map(group => (
                <div key={group.label} className="mb-3">
                  <div className="flex items-center gap-2 px-1 mb-1.5">
                    <span className="text-[11px] font-black tracking-widest text-gray-400 uppercase whitespace-nowrap">{group.label}</span>
                    <span className="text-[10px] font-bold text-gray-300">({group.orders.length})</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  <div className="space-y-2">
                    {group.orders.map((order: any) => renderOrder(order))}
                  </div>
                </div>
              ))}
              {filtered.length > visibleCount && (
                <button onClick={() => setVisibleCount(c => c + 30)}
                  className="w-full border-2 border-dashed border-gray-200 text-gray-500 hover:border-brand-300 hover:text-brand-600 font-bold text-xs py-3 rounded-xl transition-colors">
                  ▾ Load more ({filtered.length - visibleCount} older orders)
                </button>
              )}
            </>
          )}

          {/* Test Orders — collapsed by default, shown only when test orders exist */}
          {testOrders.length > 0 && (
            <div className="mt-6">
              <button
                onClick={() => setShowTestOrders(v => !v)}
                className="w-full flex items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <FlaskConical size={14} />
                <span className="font-semibold text-sm">Test Orders</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{testOrders.length}</span>
                <span className="ml-auto text-xs">{showTestOrders ? "▲ Hide" : "▼ Show"}</span>
              </button>
              {showTestOrders && (
                <div className="space-y-2 pl-2 border-l-2 border-dashed border-gray-200 ml-2 mt-2">
                  {testOrders.map((order: any) => renderOrder(order))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
