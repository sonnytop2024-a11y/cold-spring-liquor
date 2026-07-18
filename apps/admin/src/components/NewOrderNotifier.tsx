"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, X, MapPin, Clock, Package, ChevronRight } from "lucide-react";
import { API } from "@/lib/api";

const DISMISSED_KEY = "csl-admin-dismissed-orders";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress?: { street: string; city: string; state: string; zip?: string } | null;
  total: number;
  createdAt: string;
  items: Array<{ name: string; quantity: number }>;
  distanceMiles?: number;
  etaMinutes?: number;
  deliveryType?: string;
  orderType?: string;
  pickupWindow?: { start?: string; end?: string; label?: string; dateLabel?: string } | null;
}

// ── Audio ─────────────────────────────────────────────────────────────────────
let audioCtx: AudioContext | null = null;

function ensureAudioCtx() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {}
  }
  if (audioCtx?.state === "suspended") audioCtx.resume().catch(() => {});
  return audioCtx;
}

function playAlertSound() {
  const ctx = ensureAudioCtx();
  if (!ctx) return;
  try {
    // 5-note rising alarm: assertive and hard to miss
    const notes = [
      { freq: 880,  start: 0.00, dur: 0.18 },
      { freq: 1100, start: 0.20, dur: 0.18 },
      { freq: 1320, start: 0.40, dur: 0.18 },
      { freq: 1100, start: 0.60, dur: 0.18 },
      { freq: 1320, start: 0.80, dur: 0.30 },
    ];
    const t = ctx.currentTime;
    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t + start);
      gain.gain.linearRampToValueAtTime(0.35, t + start + 0.03);
      gain.gain.linearRampToValueAtTime(0, t + start + dur);
      osc.start(t + start);
      osc.stop(t + start + dur + 0.05);
    });
  } catch {}
}

// ── Persistence ───────────────────────────────────────────────────────────────
function loadDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}
function saveDismissed(set: Set<string>) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...set]));
  } catch {}
}

// ── Badge hook (used by sidebar) ──────────────────────────────────────────────
export function useNewOrderBadge() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const handler = (e: Event) => setCount((e as CustomEvent).detail ?? 0);
    window.addEventListener("csl-new-orders", handler);
    return () => window.removeEventListener("csl-new-orders", handler);
  }, []);
  return count;
}

export function OrderBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="ml-auto bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center animate-pulse">
      {count > 99 ? "99+" : count}
    </span>
  );
}

// ── Single order notification card (shown when no overlay) ───────────────────
function OrderCard({ order, onDismiss }: { order: Order; onDismiss: () => void }) {
  return (
    <div className="bg-white border-2 border-red-400 rounded-2xl shadow-2xl overflow-hidden"
      style={{ animation: "slideInRight 0.3s ease-out" }}>
      <div className="bg-red-600 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell size={15} className="text-white animate-bounce" />
          <span className="font-black text-white text-sm">#{order.orderNumber}</span>
          <span className="text-red-200 text-xs">{new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
        <button onClick={onDismiss} className="text-red-200 hover:text-white"><X size={15} /></button>
      </div>
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-bold text-base">{order.customerName}</p>
          <p className="font-black text-green-600 text-base">${Number(order.total).toFixed(2)}</p>
        </div>
        {order.orderType === "pickup" ? (
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full bg-orange-100 text-orange-700">
              🏬 Pick Up In Store
            </span>
            {order.pickupWindow?.label && (
              <p className="text-xs font-semibold text-orange-700 flex items-center gap-1">
                <Clock size={11} /> {order.pickupWindow.dateLabel ? `${order.pickupWindow.dateLabel} · ` : ""}{order.pickupWindow.label}
              </p>
            )}
            {order.customerPhone && (
              <p className="text-xs text-gray-500">📞 {order.customerPhone}</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <MapPin size={11} /> {order.deliveryAddress?.city}, {order.deliveryAddress?.state}
          </p>
        )}
        {(order.distanceMiles !== undefined || order.etaMinutes !== undefined) && (
          <div className="flex items-center gap-3 text-xs font-semibold">
            {order.distanceMiles !== undefined && (
              <span className="flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-1 rounded-lg">
                <MapPin size={11} /> {order.distanceMiles} mi
              </span>
            )}
            {order.etaMinutes !== undefined && (
              <span className="flex items-center gap-1 text-orange-700 bg-orange-50 px-2 py-1 rounded-lg">
                <Clock size={11} /> ~{order.etaMinutes} min
              </span>
            )}
          </div>
        )}
        <div className="text-xs text-gray-600 space-y-0.5">
          {order.items?.slice(0, 2).map((item, i) => (
            <p key={i}>• {item.name} ×{item.quantity}</p>
          ))}
          {(order.items?.length ?? 0) > 2 && (
            <p className="text-gray-400">+{order.items.length - 2} more item{order.items.length - 2 > 1 ? "s" : ""}</p>
          )}
        </div>
        <div className="flex gap-2 pt-1">
          <a href="/orders" onClick={onDismiss}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white py-2.5 rounded-xl transition-colors">
            View Order <ChevronRight size={13} />
          </a>
          <button onClick={onDismiss}
            className="flex-1 text-xs font-medium border hover:bg-gray-50 py-2.5 rounded-xl transition-colors">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main notifier ─────────────────────────────────────────────────────────────
export function NewOrderNotifier() {
  const [visibleOrders, setVisibleOrders] = useState<Order[]>([]);
  // showOverlay = true when brand-new orders arrive (need attention)
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayIdx, setOverlayIdx] = useState(0); // which order in overlay

  const dismissedRef = useRef<Set<string>>(new Set());
  const knownIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const soundIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Wake AudioContext on first interaction
  useEffect(() => {
    const wake = () => ensureAudioCtx();
    window.addEventListener("click", wake, { once: true });
    window.addEventListener("keydown", wake, { once: true });
    return () => {
      window.removeEventListener("click", wake);
      window.removeEventListener("keydown", wake);
    };
  }, []);

  useEffect(() => { dismissedRef.current = loadDismissed(); }, []);

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["admin-orders-notify"],
    queryFn: async () => {
      const r = await fetch(`${API}/admin/orders`);
      return r.json();
    },
    refetchInterval: 5_000,
  });

  // Start/stop repeating alarm while overlay is open
  useEffect(() => {
    if (showOverlay) {
      // Repeat every 8 seconds so admin can't miss it
      soundIntervalRef.current = setInterval(() => playAlertSound(), 8_000);
      return () => {
        if (soundIntervalRef.current) clearInterval(soundIntervalRef.current);
      };
    } else {
      if (soundIntervalRef.current) {
        clearInterval(soundIntervalRef.current);
        soundIntervalRef.current = null;
      }
    }
  }, [showOverlay]);

  useEffect(() => {
    if (!Array.isArray(orders) || orders.length === 0) return;
    const pending = orders.filter((o: Order) => o.status === "pending");

    if (!initializedRef.current) {
      initializedRef.current = true;
      pending.forEach(o => knownIdsRef.current.add(o.id));
      const undismissed = pending.filter(o => !dismissedRef.current.has(o.id));
      setVisibleOrders(undismissed);
      window.dispatchEvent(new CustomEvent("csl-new-orders", { detail: undismissed.length }));
      return;
    }

    // Find truly new orders
    const brandNew = pending.filter(
      o => !knownIdsRef.current.has(o.id) && !dismissedRef.current.has(o.id)
    );
    if (brandNew.length > 0) {
      playAlertSound();
      brandNew.forEach(o => knownIdsRef.current.add(o.id));
      setVisibleOrders(prev => {
        const existing = new Set(prev.map(o => o.id));
        return [...prev, ...brandNew.filter(o => !existing.has(o.id))];
      });
      setOverlayIdx(0);
      setShowOverlay(true);
    }

    // Sync: remove orders no longer pending or dismissed
    const pendingIds = new Set(pending.map(o => o.id));
    setVisibleOrders(prev =>
      prev.filter(o => pendingIds.has(o.id) && !dismissedRef.current.has(o.id))
    );

    const undismissed = pending.filter(o => !dismissedRef.current.has(o.id));
    window.dispatchEvent(new CustomEvent("csl-new-orders", { detail: undismissed.length }));
  }, [orders]);

  const dismiss = useCallback((id: string) => {
    dismissedRef.current.add(id);
    saveDismissed(dismissedRef.current);
    setVisibleOrders(prev => {
      const next = prev.filter(o => o.id !== id);
      if (next.length === 0) setShowOverlay(false);
      return next;
    });
    setOverlayIdx(0);
  }, []);

  const dismissAll = useCallback(() => {
    visibleOrders.forEach(o => dismissedRef.current.add(o.id));
    saveDismissed(dismissedRef.current);
    setVisibleOrders([]);
    setShowOverlay(false);
  }, [visibleOrders]);

  if (visibleOrders.length === 0) return null;

  const overlayOrder = visibleOrders[Math.min(overlayIdx, visibleOrders.length - 1)];

  return (
    <>
      {/* ── Full-screen overlay modal for new orders ── */}
      {showOverlay && overlayOrder && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)" }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            style={{ animation: "popIn 0.25s ease-out", border: "4px solid #dc2626" }}>

            {/* Header */}
            <div className="bg-red-600 px-6 py-5 text-white"
              style={{ animation: "pulse 1s ease-in-out infinite alternate" }}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Bell size={24} className="animate-bounce" />
                  </div>
                  <div>
                    <p className="font-black text-2xl leading-tight">
                      {overlayOrder.orderType === "pickup" ? "NEW PICKUP ORDER!" : "NEW ORDER!"}
                    </p>
                    <p className="text-red-200 text-sm font-medium">
                      {visibleOrders.length > 1
                        ? `${visibleOrders.length} orders waiting`
                        : "Requires attention"}
                    </p>
                  </div>
                </div>
                <button onClick={dismissAll}
                  className="text-red-200 hover:text-white transition-colors p-1">
                  <X size={22} />
                </button>
              </div>

              {/* Multiple orders nav */}
              {visibleOrders.length > 1 && (
                <div className="flex gap-1.5 mt-3">
                  {visibleOrders.map((o, i) => (
                    <button key={o.id} onClick={() => setOverlayIdx(i)}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold transition-colors ${
                        i === overlayIdx ? "bg-white text-red-600" : "bg-white/20 text-white"
                      }`}>
                      #{o.orderNumber}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Order details */}
            <div className="px-6 py-5 space-y-4">
              {/* Order number + total */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Order</p>
                  <p className="font-black text-3xl text-gray-900 tracking-wider">
                    #{overlayOrder.orderNumber}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Total</p>
                  <p className="font-black text-3xl text-green-600">
                    ${Number(overlayOrder.total).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Customer + address / pickup info */}
              <div className="bg-gray-50 rounded-2xl px-4 py-3 space-y-1.5">
                <p className="font-bold text-base">{overlayOrder.customerName}</p>
                {overlayOrder.customerPhone && (
                  <p className="text-sm text-gray-500 flex items-center gap-1.5">
                    📞 <a href={`tel:${overlayOrder.customerPhone}`} className="hover:underline">{overlayOrder.customerPhone}</a>
                  </p>
                )}
                {overlayOrder.orderType === "pickup" ? (
                  <span className="inline-block text-xs font-black uppercase tracking-wide px-2.5 py-1 rounded-full bg-orange-100 text-orange-700">
                    🏬 Pick Up In Store
                  </span>
                ) : (
                  <p className="text-sm text-gray-500 flex items-center gap-1.5">
                    <MapPin size={13} className="text-brand-500 shrink-0" />
                    {overlayOrder.deliveryAddress?.street && (
                      <span>{overlayOrder.deliveryAddress.street}, </span>
                    )}
                    {overlayOrder.deliveryAddress?.city}, {overlayOrder.deliveryAddress?.state}
                  </p>
                )}
                {overlayOrder.deliveryType === "next-morning" && (
                  <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    🌅 Next Morning Delivery
                  </span>
                )}
              </div>

              {/* Pickup window — big and prominent */}
              {overlayOrder.orderType === "pickup" && overlayOrder.pickupWindow?.label && (
                <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4 text-center">
                  <Clock size={16} className="text-orange-600 mx-auto mb-1" />
                  <p className="font-black text-2xl text-orange-700">{overlayOrder.pickupWindow.label}</p>
                  <p className="text-[11px] font-bold text-orange-600 uppercase tracking-wide">
                    {overlayOrder.pickupWindow.dateLabel ?? "Pickup time"}
                  </p>
                </div>
              )}

              {/* Distance + ETA — big and prominent */}
              {overlayOrder.orderType !== "pickup" && (overlayOrder.distanceMiles !== undefined || overlayOrder.etaMinutes !== undefined) && (
                <div className="grid grid-cols-2 gap-3">
                  {overlayOrder.distanceMiles !== undefined && (
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-3 text-center">
                      <MapPin size={16} className="text-blue-600 mx-auto mb-1" />
                      <p className="font-black text-2xl text-blue-700">{overlayOrder.distanceMiles}</p>
                      <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wide">Miles</p>
                      <p className="text-[10px] text-blue-400">from store</p>
                    </div>
                  )}
                  {overlayOrder.etaMinutes !== undefined && (
                    <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-3 text-center">
                      <Clock size={16} className="text-orange-600 mx-auto mb-1" />
                      <p className="font-black text-2xl text-orange-700">~{overlayOrder.etaMinutes}</p>
                      <p className="text-[11px] font-bold text-orange-600 uppercase tracking-wide">Minutes</p>
                      <p className="text-[10px] text-orange-400">estimated total</p>
                    </div>
                  )}
                </div>
              )}

              {/* Items */}
              <div className="space-y-1">
                {overlayOrder.items?.slice(0, 3).map((item, i) => (
                  <div key={i} className="text-sm text-gray-700 flex items-center gap-2">
                    <Package size={12} className="text-gray-400 shrink-0" />
                    {item.name} <span className="text-gray-400 ml-auto">×{item.quantity}</span>
                  </div>
                ))}
                {(overlayOrder.items?.length ?? 0) > 3 && (
                  <p className="text-xs text-gray-400 pl-5">
                    +{overlayOrder.items.length - 3} more item{overlayOrder.items.length - 3 > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="px-6 pb-6 flex gap-3">
              <a href="/orders" onClick={() => dismiss(overlayOrder.id)}
                className="flex-[2] flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl text-base transition-colors shadow-lg">
                <Bell size={18} /> View Order
              </a>
              <button onClick={() => dismiss(overlayOrder.id)}
                className="flex-1 border-2 border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold py-4 rounded-2xl text-sm transition-colors">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Side toast cards (after overlay dismissed) ── */}
      {!showOverlay && (
        <div className="fixed top-4 right-4 z-[9998] space-y-3 max-w-sm w-full pointer-events-auto">
          {/* Multi-order header banner */}
          {visibleOrders.length > 1 && (
            <div className="bg-red-600 text-white rounded-2xl shadow-xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-sm">
                <Bell size={16} className="animate-bounce" />
                {visibleOrders.length} PENDING ORDERS!
              </div>
              <button onClick={dismissAll}
                className="flex items-center gap-1 text-xs bg-black/20 hover:bg-black/30 px-3 py-1 rounded-lg transition-colors">
                Dismiss All <X size={11} />
              </button>
            </div>
          )}
          {visibleOrders.map(order => (
            <OrderCard key={order.id} order={order} onDismiss={() => dismiss(order.id)} />
          ))}
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);   opacity: 1; }
        }
        @keyframes popIn {
          from { transform: scale(0.85); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }
        @keyframes pulse {
          from { opacity: 1; }
          to   { opacity: 0.85; }
        }
      `}</style>
    </>
  );
}
