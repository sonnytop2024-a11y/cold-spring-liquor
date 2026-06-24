"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { RefreshCw, X, AlertTriangle, XCircle, MapPin, ArrowRight, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { formatCurrency } from "@/lib/utils";

interface ReorderDraft {
  validItems: { product: any; quantity: number; originalPrice: number; currentPrice: number; priceChanged: boolean }[];
  removedItems: { name: string; quantity: number; reason: string }[];
  deliveryAddress: any;
  originalOrderNumber: string;
  hasWarnings: boolean;
}

function ReorderModal({ draft, onConfirm, onClose }: {
  draft: ReorderDraft; onConfirm: () => void; onClose: () => void;
}) {
  const newSubtotal = draft.validItems.reduce((a, i) => a + i.currentPrice * i.quantity, 0);
  const oldSubtotal = draft.validItems.reduce((a, i) => a + i.originalPrice * i.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h2 className="font-bold text-lg">Reorder #{draft.originalOrderNumber}</h2>
            <p className="text-xs text-gray-400">Review before placing</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {draft.hasWarnings && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800">
                {draft.removedItems.length > 0 && <p className="font-semibold">{draft.removedItems.length} item{draft.removedItems.length > 1 ? "s" : ""} unavailable — removed</p>}
                {draft.validItems.some(i => i.priceChanged) && <p>Some prices have changed since your last order.</p>}
              </div>
            </div>
          )}

          {draft.validItems.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Items ({draft.validItems.length})</p>
              <div className="space-y-2">
                {draft.validItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                    <div className="flex-1 min-w-0">
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

          {draft.removedItems.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Unavailable</p>
              {draft.removedItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2 opacity-70">
                  <XCircle size={13} className="text-red-400 shrink-0" />
                  <p className="text-xs text-gray-500 line-through flex-1 truncate">{item.name} ×{item.quantity}</p>
                  <span className="text-xs text-red-400 capitalize">{item.reason.replace("_", " ")}</span>
                </div>
              ))}
            </div>
          )}

          {draft.deliveryAddress?.street && (
            <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-start gap-2">
              <MapPin size={13} className="text-brand-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-0.5">Delivering to</p>
                <p className="text-xs text-gray-700">{draft.deliveryAddress.street}, {draft.deliveryAddress.city}, {draft.deliveryAddress.state}</p>
              </div>
            </div>
          )}

          {draft.validItems.length > 0 && (
            <div className="border-t pt-3 space-y-1 text-sm">
              {oldSubtotal !== newSubtotal && (
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Previous subtotal</span><span className="line-through">{formatCurrency(oldSubtotal)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold">
                <span>Subtotal</span><span>{formatCurrency(newSubtotal)}</span>
              </div>
              <p className="text-xs text-green-600 font-medium">🚚 Delivery FREE · No Tip Required</p>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t space-y-2">
          {draft.validItems.length === 0
            ? <p className="text-center text-sm text-gray-400 py-2">No items available to reorder.</p>
            : (
              <button onClick={onConfirm}
                className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 rounded-xl transition-colors">
                <RefreshCw size={15} /> Confirm & Go to Checkout <ArrowRight size={15} />
              </button>
            )}
          <button onClick={onClose} className="w-full border rounded-xl py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function ReorderBanner() {
  const { isLoggedIn, user } = useAuthStore();
  const { clearCart, addItem } = useCartStore();
  const router = useRouter();
  const [draft, setDraft] = useState<ReorderDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const { data: orders = [] } = useQuery({
    queryKey: ["my-orders-home"],
    queryFn: async () => { try { const r = await fetch("/api/orders/my"); return r.ok ? r.json() : []; } catch { return []; } },
    enabled: isLoggedIn,
    staleTime: 60_000,
  });

  const lastDelivered = [...orders]
    .filter((o: any) => o.status === "delivered")
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  if (!isLoggedIn || !lastDelivered || dismissed) return null;

  async function openModal() {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/reorder/${lastDelivered.id}`, { method: "POST" });
      if (!res.ok) return;
      setDraft(await res.json());
    } finally {
      setLoading(false);
    }
  }

  function confirmReorder() {
    if (!draft) return;
    clearCart();
    for (const { product, quantity } of draft.validItems) addItem(product, quantity);
    setDraft(null);
    router.push("/checkout");
  }

  const itemCount = lastDelivered.items?.reduce((a: number, i: any) => a + i.quantity, 0) ?? 0;
  const orderDate = new Date(lastDelivered.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <>
      {draft && <ReorderModal draft={draft} onConfirm={confirmReorder} onClose={() => setDraft(null)} />}

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="bg-gradient-to-r from-brand-50 to-orange-50 border border-brand-200 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shrink-0">
              <RefreshCw size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-sm">
                Welcome back, {user?.name?.split(" ")[0]}! 👋 Order again in 1 tap
              </p>
              <p className="text-xs text-gray-500 truncate">
                Last order #{lastDelivered.orderNumber} · {itemCount} item{itemCount !== 1 ? "s" : ""} · {formatCurrency(lastDelivered.total)} · {orderDate}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={openModal}
              disabled={loading}
              className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              {loading ? "Loading..." : "Reorder Again"}
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="text-gray-400 hover:text-gray-600 p-1"
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
