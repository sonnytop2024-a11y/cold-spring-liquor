"use client";

import Link from "next/link";
import { useState } from "react";
import { ShoppingBag, MapPin, User, Star, Gift, CheckCircle, Clock, Circle, RefreshCw, Package, Tag, ChevronDown, ChevronUp, Edit2, X, AlertTriangle, ArrowRight, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { formatCurrency } from "@/lib/utils";
import { ItemThumb } from "@/components/shared/orderDisplay";

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  preparing: "bg-orange-100 text-orange-700",
  driver_assigned: "bg-purple-100 text-purple-700",
  driver_at_store: "bg-orange-100 text-orange-700",
  out_for_delivery: "bg-orange-100 text-orange-700",
  driver_arriving: "bg-yellow-100 text-yellow-800",
  driver_arrived: "bg-amber-100 text-amber-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  failed_delivery: "bg-red-100 text-red-700",
  ready_for_pickup: "bg-green-100 text-green-700",
  picked_up: "bg-green-100 text-green-700",
};

// Everything the customer is still waiting on stays in Active — only
// completed (delivered / picked up), cancelled or refunded orders go to History.
const ACTIVE_STATUSES = ["pending","confirmed","preparing","ready_for_pickup","driver_assigned","driver_at_store","out_for_delivery","driver_arriving","driver_arrived"];

// Live-order badges: the pickup flow statuses read as bold uppercase pills
const EMPHASIZED_STATUSES = ["preparing", "ready_for_pickup"];
export function statusBadgeClass(status: string): string {
  const base = STATUS_COLOR[status] ?? "bg-gray-100 text-gray-600";
  return EMPHASIZED_STATUSES.includes(status)
    ? `${base} uppercase font-black tracking-wide`
    : `${base} capitalize font-medium`;
}

const TRACKING_STEPS = [
  { statuses: ["pending","confirmed"], label: "Order Received" },
  { statuses: ["preparing"], label: "Preparing" },
  { statuses: ["driver_assigned","driver_at_store"], label: "Driver Assigned" },
  { statuses: ["out_for_delivery","driver_arriving","driver_arrived"], label: "Out for Delivery" },
  { statuses: ["delivered"], label: "Delivered" },
];

// Pick Up In Store orders track through their own steps
const PICKUP_TRACKING_STEPS = [
  { statuses: ["pending","confirmed"], label: "Order Received" },
  { statuses: ["preparing"], label: "Preparing" },
  { statuses: ["ready_for_pickup"], label: "Ready for Pickup" },
  { statuses: ["picked_up"], label: "Picked Up" },
];

function getStepIdx(steps: typeof TRACKING_STEPS, status: string) {
  return steps.findIndex(s => s.statuses.includes(status));
}

function LiveTracker({ order }: { order: any }) {
  const { data: live } = useQuery({
    queryKey: ["live-order", order.id],
    queryFn: async () => { const r = await fetch(`/api/orders/${order.id}`); return r.json(); },
    refetchInterval: 15_000,
    initialData: order,
  });
  const status = live?.status ?? order.status;
  const isPickupOrder = (live?.orderType ?? order.orderType) === "pickup";
  const steps = isPickupOrder ? PICKUP_TRACKING_STEPS : TRACKING_STEPS;
  const currentIdx = getStepIdx(steps, status);

  return (
    <div className="bg-gradient-to-br from-brand-50 to-orange-50 border border-brand-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-bold text-sm">#{live?.orderNumber ?? order.orderNumber}</p>
          <p className="text-xs text-gray-500">{isPickupOrder ? "🏬 Pick Up In Store · updates every 15s" : "Live tracking · updates every 15s"}</p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full ${statusBadgeClass(status)}`}>
          {status.replace(/_/g, " ")}
        </span>
      </div>
      <div className="flex items-center gap-1 mb-3">
        {steps.map((step, i) => (
          <div key={step.label} className="flex-1 h-1.5 rounded-full transition-colors" style={{ background: i <= currentIdx ? "var(--color-brand-500, #f97316)" : "#e5e7eb" }} />
        ))}
      </div>
      <div className="space-y-1.5">
        {steps.map((step, i) => {
          const done = i <= currentIdx;
          const active = i === currentIdx;
          return (
            <div key={step.label} className="flex items-center gap-2">
              {done ? <CheckCircle size={14} className="text-green-500 fill-green-500 shrink-0" /> : <Circle size={14} className="text-gray-300 shrink-0" />}
              <span className={`text-xs font-medium ${active ? "text-brand-600" : done ? "text-gray-700" : "text-gray-400"}`}>{step.label}</span>
              {active && <span className="text-xs text-brand-500 animate-pulse">● Live</span>}
            </div>
          );
        })}
      </div>
      {live?.estimatedDelivery ? (
        <p className="mt-3 text-xs text-brand-600 font-medium flex items-center gap-1">
          <Clock size={11} /> ETA: {new Date(live.estimatedDelivery).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} or sooner
        </p>
      ) : live?.status === "pending" && live?.deliveryType === "same-day" ? (
        <p className="mt-3 text-xs text-amber-700 font-medium flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
          Confirming your order…
        </p>
      ) : null}
      <Link href={`/track/${order.id}`} className="block mt-3 text-center text-xs font-semibold text-brand-600 bg-white hover:bg-brand-50 border border-brand-200 rounded-lg py-1.5">
        Full Tracking View →
      </Link>
    </div>
  );
}

// ─── Reorder Modal ────────────────────────────────────────────────────────────
export interface ReorderDraft {
  validItems: {
    product: any;
    quantity: number;
    originalPrice: number;
    currentPrice: number;
    priceChanged: boolean;
  }[];
  removedItems: { name: string; quantity: number; reason: string }[];
  deliveryAddress: any;
  billingAddress: any;
  billingAddressSameAsDelivery: boolean;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  originalOrderNumber: string;
  orderType?: "delivery" | "pickup";
  hasWarnings: boolean;
}

export function ReorderModal({ draft, onConfirm, onClose }: {
  draft: ReorderDraft;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const newSubtotal = draft.validItems.reduce((a, i) => a + i.currentPrice * i.quantity, 0);
  const oldSubtotal = draft.validItems.reduce((a, i) => a + i.originalPrice * i.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h2 className="font-bold text-lg">Reorder #{draft.originalOrderNumber}</h2>
            <p className="text-xs text-gray-400">Review items before placing order</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Warnings */}
          {draft.hasWarnings && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800">
                {draft.removedItems.length > 0 && (
                  <p className="font-semibold mb-0.5">{draft.removedItems.length} item{draft.removedItems.length > 1 ? "s" : ""} removed (unavailable)</p>
                )}
                {draft.validItems.some(i => i.priceChanged) && (
                  <p>Some prices have changed since your last order.</p>
                )}
              </div>
            </div>
          )}

          {/* Valid items */}
          {draft.validItems.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Items to Add ({draft.validItems.length})</p>
              <div className="space-y-2">
                {draft.validItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                    <ItemThumb imageUrl={item.product.imageUrl} category={item.product.category} name={item.product.name} size={38} />
                    <div className="flex-1 min-w-0 ml-3">
                      <p className="text-sm font-medium truncate">{item.product.name}</p>
                      <p className="text-xs text-gray-400">×{item.quantity} · {item.product.volume}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-bold">{formatCurrency(item.currentPrice * item.quantity)}</p>
                      {item.priceChanged && (
                        <p className={`text-xs font-medium ${item.currentPrice > item.originalPrice ? "text-red-500" : "text-green-600"}`}>
                          {item.currentPrice > item.originalPrice ? "↑" : "↓"} was {formatCurrency(item.originalPrice)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Removed items */}
          {draft.removedItems.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Unavailable Items</p>
              <div className="space-y-2">
                {draft.removedItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 opacity-70">
                    <XCircle size={14} className="text-red-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-600 line-through truncate">{item.name}</p>
                      <p className="text-xs text-red-500 capitalize">{item.reason.replace("_", " ")}</p>
                    </div>
                    <span className="text-xs text-gray-400">×{item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delivery address */}
          {draft.deliveryAddress?.street && (
            <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-start gap-2">
              <MapPin size={13} className="text-brand-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-0.5">Delivering to</p>
                <p className="text-xs text-gray-700">{draft.deliveryAddress.street}</p>
                <p className="text-xs text-gray-500">{draft.deliveryAddress.city}, {draft.deliveryAddress.state} {draft.deliveryAddress.zip}</p>
              </div>
            </div>
          )}

          {/* Price summary */}
          {draft.validItems.length > 0 && (
            <div className="border-t pt-3 space-y-1 text-sm">
              {oldSubtotal !== newSubtotal && (
                <div className="flex justify-between text-gray-400 text-xs">
                  <span>Original subtotal</span>
                  <span className="line-through">{formatCurrency(oldSubtotal)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold">
                <span>New subtotal</span>
                <span>{formatCurrency(newSubtotal)}</span>
              </div>
              <p className="text-xs text-green-600 font-medium">
                {draft.orderType === "pickup" ? "🏬 Pick Up In Store · 5% discount applies at checkout" : "🚚 Delivery FREE · No Tip"}
              </p>
              <p className="text-[11px] text-gray-400">Current prices apply — previous promo codes and sale prices are not carried over.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t space-y-2">
          {draft.validItems.length === 0 ? (
            <div className="text-center py-2 text-sm text-gray-500">No available items to reorder.</div>
          ) : (
            <button onClick={onConfirm}
              className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 rounded-xl transition-colors">
              <RefreshCw size={16} /> Confirm &amp; Go to Checkout
              <ArrowRight size={16} />
            </button>
          )}
          <button onClick={onClose}
            className="w-full border rounded-xl py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Order History Card ───────────────────────────────────────────────────────
function OrderHistoryCard({ order }: { order: any }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<ReorderDraft | null>(null);
  const { clearCart, addItem } = useCartStore();
  const router = useRouter();

  async function openReorderModal() {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/reorder/${order.id}`, { method: "POST" });
      if (!res.ok) { alert("Could not load order. Please try again."); return; }
      setDraft(await res.json());
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function confirmReorder() {
    if (!draft) return;
    clearCart();
    for (const { product, quantity } of draft.validItems) {
      addItem(product, quantity);
    }
    localStorage.setItem("csl-reorder-prefill", JSON.stringify({
      customerName: draft.customerName,
      customerEmail: draft.customerEmail,
      customerPhone: draft.customerPhone,
      deliveryAddress: draft.deliveryAddress,
      billingAddress: draft.billingAddress,
      billingAddressSameAsDelivery: draft.billingAddressSameAsDelivery,
      fromOrderNumber: draft.originalOrderNumber,
    }));
    setDraft(null);
    // Pickup orders reorder straight into the pickup checkout
    router.push(draft.orderType === "pickup" ? "/checkout/pickup" : "/checkout");
  }

  return (
    <>
      {draft && <ReorderModal draft={draft} onConfirm={confirmReorder} onClose={() => setDraft(null)} />}

      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="font-bold text-sm">#{order.orderNumber}</p>
              <p className="text-xs text-gray-400">
                {new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded-full ${statusBadgeClass(order.status)}`}>
                {order.status.replace(/_/g, " ")}
              </span>
              <p className="font-bold text-sm">{formatCurrency(Number(order.total))}</p>
            </div>
          </div>

          <p className="text-xs text-gray-500 mb-3">
            {order.items?.reduce((a: number, i: any) => a + i.quantity, 0) ?? 0} items ·{" "}
            {order.orderType === "pickup"
              ? "🏬 Pick Up In Store"
              : `${order.deliveryAddress?.city ?? ""}, ${order.deliveryAddress?.state ?? ""}`}
          </p>

          <div className="flex items-center gap-2">
            {(order.status === "delivered" || order.status === "picked_up") && (
              <button
                onClick={openReorderModal}
                disabled={loading}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white transition-colors disabled:opacity-60"
              >
                {loading
                  ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Loading...</>
                  : <><RefreshCw size={12} /> Reorder Again</>
                }
              </button>
            )}
            <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {expanded ? "Hide" : "Details"}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="border-t px-4 py-3 bg-gray-50 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase">Items</p>
            {(order.items ?? []).map((item: any, i: number) => (
              <div key={i} className="flex items-center gap-2.5 text-sm">
                <ItemThumb imageUrl={item.imageUrl} category={item.category} name={item.name} size={34} />
                <span className="text-gray-700 flex-1">{item.name} ×{item.quantity}</span>
                <span className="text-gray-500 shrink-0">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-bold border-t pt-2 mt-1">
              <span>Total</span><span>{formatCurrency(Number(order.total))}</span>
            </div>
            {order.deliveryAddress && (
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <MapPin size={10} /> {order.deliveryAddress.street}, {order.deliveryAddress.city}
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Saved Address Card ───────────────────────────────────────────────────────
function SavedAddressCard() {
  const { user, updateProfile } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(user?.deliveryAddress ?? { street: "", city: "", state: "", zip: "" });
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  async function save() {
    setSaving(true);
    await updateProfile({ deliveryAddress: form });
    setSaving(false);
    setEditing(false);
  }

  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm flex items-center gap-2"><MapPin size={15} className="text-brand-600" /> Saved Address</h3>
        <button onClick={() => setEditing(!editing)} className="text-xs text-brand-600 flex items-center gap-1"><Edit2 size={11} /> Edit</button>
      </div>
      {!editing ? (
        user.deliveryAddress?.street ? (
          <div className="text-sm text-gray-600 space-y-0.5">
            <p>{user.deliveryAddress.street}</p>
            <p>{user.deliveryAddress.city}, {user.deliveryAddress.state} {user.deliveryAddress.zip}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-400">No saved address. Add one to speed up checkout!</p>
        )
      ) : (
        <div className="space-y-2">
          <input value={form.street} onChange={e => setForm(f => ({ ...f, street: e.target.value }))} placeholder="Street address"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <div className="grid grid-cols-3 gap-2">
            <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="City"
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} placeholder="State"
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <input value={form.zip} onChange={e => setForm(f => ({ ...f, zip: e.target.value }))} placeholder="ZIP"
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="flex-1 border rounded-lg py-1.5 text-xs font-medium hover:bg-gray-50">Cancel</button>
            <button onClick={save} disabled={saving}
              className="flex-1 bg-brand-500 text-white text-xs font-bold rounded-lg py-1.5 hover:bg-brand-600 disabled:opacity-60">
              {saving ? "Saving..." : "Save Address"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main AccountDashboard ────────────────────────────────────────────────────
export function AccountDashboard() {
  const { user } = useAuthStore();
  const [orderTab, setOrderTab] = useState<"active" | "history">("active");

  const { data: orders = [] } = useQuery({
    queryKey: ["my-orders"],
    queryFn: async () => { try { const r = await fetch("/api/orders/my"); return r.ok ? r.json() : []; } catch { return []; } },
    // Near real-time: the Active tab count and statuses refresh every 15s
    refetchInterval: 15_000,
  });

  const { data: availableCoupons = [] } = useQuery<{ code: string; type: string; value: number; label: string; minOrder: number | null }[]>({
    queryKey: ["public-coupons"],
    queryFn: async () => { try { const r = await fetch("/api/coupons"); return r.ok ? r.json() : []; } catch { return []; } },
    staleTime: 60_000,
  });

  const activeOrders = orders.filter((o: any) => ACTIVE_STATUSES.includes(o.status));
  const historyOrders = orders.filter((o: any) => !ACTIVE_STATUSES.includes(o.status));

  const points = user?.points ?? 0;
  const tier = user?.tier ?? "Bronze";
  const nextTier = tier === "Bronze" ? { name: "Silver", at: 500 } : tier === "Silver" ? { name: "Gold", at: 1500 } : tier === "Gold" ? { name: "Platinum", at: 3000 } : null;

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      {user && (
        <div className="bg-gradient-to-r from-brand-50 to-orange-50 border border-brand-200 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-brand-700 text-sm font-medium">Welcome back,</p>
            <p className="text-2xl font-bold text-gray-900">{user.name} 👋</p>
            <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">CS Rewards</p>
            <p className="text-2xl font-bold text-brand-600">{points.toLocaleString()}</p>
            <p className="text-xs font-medium text-gray-500">{tier} Member</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left sidebar */}
        <div className="space-y-4">
          {[
            { href: "/products", icon: ShoppingBag, label: "Shop Products", desc: "Browse all spirits" },
            { href: "/rewards", icon: Star, label: "CS Rewards", desc: `${points} pts · ${tier} tier` },
            { href: "/gift-cards", icon: Gift, label: "Gift Cards", desc: "Send or redeem" },
            { href: "/account/profile", icon: User, label: "Profile Settings", desc: "Name, email, phone" },
          ].map(({ href, icon: Icon, label, desc }) => (
            <Link key={href} href={href}
              className="flex items-center gap-3 bg-white border rounded-xl p-4 hover:shadow-sm hover:border-brand-300 transition-all">
              <div className="w-9 h-9 bg-brand-50 rounded-lg flex items-center justify-center text-brand-600 shrink-0">
                <Icon size={18} />
              </div>
              <div>
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
            </Link>
          ))}

          <SavedAddressCard />

          {/* Available coupons */}
          {availableCoupons.length > 0 && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-2"><Tag size={14} className="text-green-600" /> Available Coupons</h3>
              <div className="space-y-1.5">
                {availableCoupons.map(c => (
                  <div key={c.code} className="flex items-center justify-between gap-2">
                    <code className="text-xs font-bold bg-white border border-green-200 text-green-700 px-2 py-0.5 rounded shrink-0">{c.code}</code>
                    <span className="text-xs text-gray-500 text-right">
                      {c.label ?? (c.type === "fixed" ? `$${c.value} off` : `${c.value}% off`)}
                      {c.minOrder ? ` $${c.minOrder}+` : ""}
                    </span>
                  </div>
                ))}
              </div>
              <Link href="/checkout" className="block mt-3 text-xs text-center text-green-700 font-semibold hover:underline">Use at checkout →</Link>
            </div>
          )}
        </div>

        {/* Orders section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Rewards card */}
          <div className="bg-gradient-to-br from-brand-600 to-brand-800 rounded-xl p-5 text-white">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs text-brand-200 font-medium uppercase tracking-wide">CS Rewards Club</p>
                <p className="text-3xl font-bold mt-0.5">{points.toLocaleString()} pts</p>
                <p className="text-sm font-semibold text-brand-100 mt-0.5">{tier} Member</p>
              </div>
              <div className="bg-white/20 rounded-xl p-3"><Star size={22} className="text-yellow-300" /></div>
            </div>
            {nextTier && (
              <div className="mb-3">
                <div className="flex justify-between text-xs text-brand-200 mb-1">
                  <span>Progress to {nextTier.name}</span>
                  <span>{Math.max(0, nextTier.at - points)} pts away</span>
                </div>
                <div className="bg-white/20 rounded-full h-1.5">
                  <div className="bg-yellow-400 h-1.5 rounded-full" style={{ width: `${Math.min(100, (points / nextTier.at) * 100)}%` }} />
                </div>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              {[["Value", points >= 250 ? `$${points >= 1000 ? 20 : points >= 500 ? 10 : 5} avail` : "Earn more"], ["Earn rate", "1 pt/$1"], ["Redeem at", "250 pts"]].map(([l, v]) => (
                <div key={l} className="bg-white/10 rounded-lg px-2 py-1.5 text-center">
                  <p className="font-bold text-sm">{v}</p>
                  <p className="text-xs text-brand-200">{l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Order tabs */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                {([["active", `Active (${activeOrders.length})`], ["history", `History (${historyOrders.length})`]] as const).map(([t, l]) => (
                  <button key={t} onClick={() => setOrderTab(t)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${orderTab === t ? "bg-white shadow-sm" : "text-gray-500"}`}>
                    {l}
                  </button>
                ))}
              </div>
              {orderTab === "history" && historyOrders.some((o: any) => o.status === "delivered") && (
                <p className="text-xs text-gray-400 flex items-center gap-1"><RefreshCw size={10} /> Tap &quot;Reorder Again&quot; to repeat an order</p>
              )}
            </div>

            {orderTab === "active" && (
              activeOrders.length === 0 ? (
                <div className="bg-white border rounded-xl p-10 text-center text-gray-400">
                  <Package size={32} className="mx-auto mb-2 opacity-30" />
                  <p>No active orders. <Link href="/products" className="text-brand-600 hover:underline font-medium">Start shopping →</Link></p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {activeOrders.map((o: any) => <LiveTracker key={o.id} order={o} />)}
                </div>
              )
            )}

            {orderTab === "history" && (
              historyOrders.length === 0 ? (
                <div className="bg-white border rounded-xl p-10 text-center text-gray-400">
                  <ShoppingBag size={32} className="mx-auto mb-2 opacity-30" />
                  <p>No completed orders yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyOrders.map((o: any) => <OrderHistoryCard key={o.id} order={o} />)}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
