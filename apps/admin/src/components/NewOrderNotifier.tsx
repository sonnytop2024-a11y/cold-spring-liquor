"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, X, Package, MapPin, Clock } from "lucide-react";

const API = "/api";
const STORAGE_KEY = "csl-admin-seen-orders";

interface Order {
  id: string; orderNumber: string; status: string;
  customerName: string; customerPhone: string;
  deliveryAddress: { street: string; city: string; state: string };
  total: number; createdAt: string;
  items: Array<{ name: string; quantity: number }>;
}

function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    function beep(freq: number, start: number, dur: number, vol = 0.4) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.05);
    }
    // Ascending ding-dong pattern
    beep(880, 0, 0.15);
    beep(1100, 0.18, 0.15);
    beep(1320, 0.36, 0.25);
    setTimeout(() => ctx.close(), 1500);
  } catch { /* AudioContext not available */ }
}

export function useNewOrderBadge() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    function update() {
      try {
        const seen = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as string[];
        // This is just the badge — actual count managed by the notifier
        void seen;
      } catch {}
    }
    update();
    window.addEventListener("csl-new-orders", (e: any) => setCount(e.detail ?? 0));
    return () => window.removeEventListener("csl-new-orders", () => {});
  }, []);
  return count;
}

export function NewOrderNotifier() {
  const [newOrders, setNewOrders] = useState<Order[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const seenRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  // Load seen order IDs from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as string[];
      seenRef.current = new Set(saved);
    } catch {}
  }, []);

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["admin-orders-notify"],
    queryFn: async () => {
      const r = await fetch(`${API}/admin/orders`);
      return r.json();
    },
    refetchInterval: 5_000,
  });

  useEffect(() => {
    if (!orders.length) return;

    const pendingOrders = orders.filter((o: Order) => o.status === "pending");

    if (!initializedRef.current) {
      // First load — seed seen set with all existing orders (don't alert for old ones)
      pendingOrders.forEach(o => seenRef.current.add(o.id));
      initializedRef.current = true;
      return;
    }

    const unseen = pendingOrders.filter(o => !seenRef.current.has(o.id) && !dismissed.includes(o.id));

    if (unseen.length > 0) {
      playAlertSound();
      setNewOrders(prev => {
        const existing = new Set(prev.map(o => o.id));
        return [...prev, ...unseen.filter(o => !existing.has(o.id))];
      });
      unseen.forEach(o => seenRef.current.add(o.id));
      // Persist seen IDs
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...seenRef.current]));
      } catch {}
    }

    // Dispatch badge count event
    const unconfirmed = pendingOrders.filter(o => !dismissed.includes(o.id));
    window.dispatchEvent(new CustomEvent("csl-new-orders", { detail: unconfirmed.length }));
  }, [orders, dismissed]);

  const dismiss = useCallback((id: string) => {
    setDismissed(prev => [...prev, id]);
    setNewOrders(prev => prev.filter(o => o.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setNewOrders([]);
    setDismissed(prev => [...prev, ...newOrders.map(o => o.id)]);
  }, [newOrders]);

  if (newOrders.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-3 max-w-sm w-full">
      {/* Header banner */}
      <div className="bg-red-600 text-white rounded-2xl shadow-2xl overflow-hidden animate-pulse-once">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <Bell size={18} className="animate-bounce" />
            <span>{newOrders.length} NEW ORDER{newOrders.length > 1 ? "S" : ""}!</span>
          </div>
          <button onClick={dismissAll} className="flex items-center gap-1 text-xs bg-red-700 hover:bg-red-800 px-3 py-1 rounded-lg transition-colors">
            Acknowledge All <X size={12} />
          </button>
        </div>
      </div>

      {/* Individual order cards */}
      {newOrders.map(order => (
        <div key={order.id}
          className="bg-white border-2 border-red-400 rounded-2xl shadow-2xl overflow-hidden"
          style={{ animation: "slideInRight 0.3s ease-out" }}>
          <div className="bg-red-50 px-4 py-2 flex items-center justify-between border-b border-red-200">
            <div className="flex items-center gap-2">
              <Package size={15} className="text-red-600" />
              <span className="font-bold text-sm text-red-700">#{order.orderNumber}</span>
              <span className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleTimeString()}</span>
            </div>
            <button onClick={() => dismiss(order.id)} className="text-gray-400 hover:text-gray-700"><X size={15} /></button>
          </div>

          <div className="px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-bold text-base">{order.customerName}</p>
              <p className="font-bold text-green-600 text-base">${Number(order.total).toFixed(2)}</p>
            </div>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <MapPin size={11} /> {order.deliveryAddress?.street}, {order.deliveryAddress?.city}
            </p>
            <div className="text-xs text-gray-600 space-y-0.5">
              {order.items?.slice(0, 3).map((item, i) => (
                <p key={i}>• {item.name} ×{item.quantity}</p>
              ))}
              {(order.items?.length ?? 0) > 3 && <p className="text-gray-400">+{order.items.length - 3} more items</p>}
            </div>
            <div className="flex gap-2 pt-1">
              <a href="/orders"
                className="flex-1 text-center text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white py-2 rounded-lg transition-colors">
                View Orders
              </a>
              <button onClick={() => dismiss(order.id)}
                className="flex-1 text-xs font-medium border hover:bg-gray-50 py-2 rounded-lg transition-colors">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ))}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// Badge component for sidebar
export function OrderBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="ml-auto bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
      {count > 99 ? "99+" : count}
    </span>
  );
}
