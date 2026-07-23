"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Circle, Clock, Loader2, Bell, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";
import { ReorderModal, type ReorderDraft } from "@/components/account/AccountDashboard";
import { ItemThumb } from "@/components/shared/orderDisplay";

const STEPS = [
  {
    statuses: ["pending", "confirmed"],
    label: "Order Received",
    description: "We got your order and are confirming it",
    emoji: "📋",
  },
  {
    statuses: ["preparing"],
    label: "Preparing Order",
    description: "Your items are being packed",
    emoji: "📦",
  },
  {
    statuses: ["driver_assigned"],
    label: "Driver Assigned",
    description: "A driver is heading to our store",
    emoji: "🚗",
  },
  {
    statuses: ["driver_at_store"],
    label: "Driver Picked Up Order",
    description: "Driver has your order and is heading to you",
    emoji: "✅",
  },
  {
    statuses: ["out_for_delivery"],
    label: "Driver On The Way",
    description: "Your order is on its way — please have your ID ready",
    emoji: "🚀",
  },
  {
    statuses: ["driver_arriving"],
    label: "Arriving Soon",
    description: "Your driver is almost there — please come to the door",
    emoji: "📍",
  },
  {
    statuses: ["driver_arrived"],
    label: "Driver Has Arrived",
    description: "Your driver is outside — please meet them now with your 21+ ID",
    emoji: "🔔",
  },
  {
    statuses: ["delivered"],
    label: "Delivered",
    description: "Enjoy your order! 🎉",
    emoji: "🏠",
  },
];

const PICKUP_STEPS = [
  {
    statuses: ["pending", "confirmed"],
    label: "Order Received",
    description: "We got your pick up order and are confirming it",
    emoji: "📋",
  },
  {
    statuses: ["preparing"],
    label: "Preparing Order",
    description: "Your items are being packed for pick up",
    emoji: "📦",
  },
  {
    statuses: ["ready_for_pickup"],
    label: "Ready for Pick Up",
    description: "Your order is ready! Visit us during your pickup window — bring your 21+ photo ID",
    emoji: "🛍️",
  },
  {
    statuses: ["picked_up", "delivered"],
    label: "Picked Up",
    description: "Enjoy your order! 🎉",
    emoji: "✅",
  },
];

const FAILED_STATUSES = ["failed_delivery", "cancelled"];

const STATUS_LABELS: Record<string, string> = {
  pending: "Order Received",
  confirmed: "Order Confirmed",
  preparing: "Preparing",
  driver_assigned: "Driver Assigned",
  driver_at_store: "Driver at Store",
  out_for_delivery: "Out for Delivery",
  driver_arriving: "Arriving Soon",
  driver_arrived: "Driver Arrived",
  delivered: "Delivered",
  failed_delivery: "Delivery Failed",
  cancelled: "Cancelled",
  ready_for_pickup: "Ready for Pick Up",
  picked_up: "Picked Up",
};

const ACTIVE_STATUSES = ["out_for_delivery", "driver_arriving", "driver_arrived"];

function getCurrentStep(status: string, steps: typeof STEPS): number {
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].statuses.includes(status)) return i;
  }
  return -1;
}

async function fetchOrder(orderId: string) {
  const res = await fetch(`/api/orders/${orderId}`);
  return res.json();
}

async function fetchNotifications() {
  const res = await fetch("/api/notifications");
  if (!res.ok) return [];
  return res.json();
}

function WaitTimer({ waitTimerStart }: { waitTimerStart: string }) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const calc = () => {
      const elapsed = Math.floor((Date.now() - new Date(waitTimerStart).getTime()) / 1000);
      const left = Math.max(0, 5 * 60 - elapsed);
      setRemaining(left);
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [waitTimerStart]);

  if (remaining === null) return null;

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const expired = remaining === 0;

  return (
    <div className={`mt-3 rounded-xl border px-4 py-3 text-sm ${expired ? "bg-red-50 border-red-200 text-red-700" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
      {expired ? (
        <p className="font-semibold">⏰ Wait time has expired. The driver may attempt re-delivery or mark as failed.</p>
      ) : (
        <p className="font-semibold">
          ⏳ Driver is waiting — please come out now!{" "}
          <span className="font-mono">{mins}:{secs.toString().padStart(2, "0")}</span> remaining
        </p>
      )}
    </div>
  );
}

export function OrderTracker({ orderId, storePhone, storeTextPhone, storeAddress }: {
  orderId: string;
  storePhone?: string;
  storeTextPhone?: string;
  storeAddress?: string;
}) {
  const [notifDismissed, setNotifDismissed] = useState(false);
  const router = useRouter();
  const addToCart = useCartStore((s) => s.addItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const [reorderDraft, setReorderDraft] = useState<ReorderDraft | null>(null);
  const [reorderLoading, setReorderLoading] = useState(false);

  // Reorder goes through the server so availability/stock/current prices are
  // validated — old promo codes and sale prices are never carried over.
  async function handleReorder() {
    setReorderLoading(true);
    try {
      const res = await fetch(`/api/orders/reorder/${orderId}`, { method: "POST" });
      if (!res.ok) { alert("Could not load this order for reorder. Please try again."); return; }
      setReorderDraft(await res.json());
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setReorderLoading(false);
    }
  }

  function confirmReorder() {
    if (!reorderDraft) return;
    clearCart();
    for (const { product, quantity } of reorderDraft.validItems) {
      addToCart(product, quantity);
    }
    localStorage.setItem("csl-reorder-prefill", JSON.stringify({
      customerName: reorderDraft.customerName,
      customerEmail: reorderDraft.customerEmail,
      customerPhone: reorderDraft.customerPhone,
      deliveryAddress: reorderDraft.deliveryAddress,
      billingAddress: reorderDraft.billingAddress,
      billingAddressSameAsDelivery: reorderDraft.billingAddressSameAsDelivery,
      fromOrderNumber: reorderDraft.originalOrderNumber,
    }));
    setReorderDraft(null);
    router.push(reorderDraft.orderType === "pickup" ? "/checkout/pickup" : "/checkout");
  }

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => fetchOrder(orderId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return ACTIVE_STATUSES.includes(status) ? 5_000 : 15_000;
    },
  });

  const { data: notifications } = useQuery({
    queryKey: ["customer-notifications"],
    queryFn: fetchNotifications,
    refetchInterval: 10_000,
    enabled: !!order && !["delivered", "failed_delivery", "cancelled"].includes(order?.status),
  });

  const latestUnread = Array.isArray(notifications)
    ? notifications.find((n: { read: boolean; orderId: string }) => !n.read && n.orderId === orderId)
    : null;

  async function dismissNotif() {
    setNotifDismissed(true);
    await fetch("/api/notifications", { method: "PATCH" });
  }

  const [confirmingPickup, setConfirmingPickup] = useState(false);
  const [confirmPickupError, setConfirmPickupError] = useState("");
  const qc = useQueryClient();
  async function confirmPickedUp() {
    setConfirmingPickup(true);
    setConfirmPickupError("");
    try {
      const res = await fetch(`/api/orders/${orderId}/pickup-confirm`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not confirm pickup");
      qc.setQueryData(["order", orderId], data);
    } catch (e) {
      setConfirmPickupError(e instanceof Error ? e.message : "Could not confirm pickup");
    } finally {
      setConfirmingPickup(false);
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border p-8 flex items-center justify-center gap-3 text-gray-400">
        <Loader2 size={20} className="animate-spin" />
        Loading order...
      </div>
    );
  }

  if (!order || order.error) {
    return (
      <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
        Order not found
      </div>
    );
  }

  const isPickupOrder = order.orderType === "pickup";
  const steps = isPickupOrder ? PICKUP_STEPS : STEPS;
  const isFailed = FAILED_STATUSES.includes(order.status);
  const currentStep = getCurrentStep(order.status, steps);
  const isDelivered = order.status === "delivered" || order.status === "picked_up";
  const isDriverArrived = order.status === "driver_arrived";
  const isReadyForPickup = order.status === "ready_for_pickup";

  return (
    <div className="bg-white rounded-xl border">
      {/* In-app notification banner */}
      {!notifDismissed && latestUnread && (
        <div className="flex items-start gap-3 bg-brand-600 text-white px-5 py-4 rounded-t-xl">
          <Bell size={18} className="shrink-0 mt-0.5 animate-pulse" />
          <div className="flex-1 text-sm">
            <p className="font-bold">Cold Spring Liquor — Order #{order.orderNumber}</p>
            <p className="mt-0.5 opacity-90">{latestUnread.message}</p>
          </div>
          <button onClick={dismissNotif} className="text-white/70 hover:text-white text-lg leading-none">×</button>
        </div>
      )}

      {/* Header */}
      <div className="px-6 py-5 border-b">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-heading text-xl font-bold">Order #{order.orderNumber}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Placed {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
          <div className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
            isDelivered ? "bg-green-100 text-green-700" :
            isFailed ? "bg-red-100 text-red-700" :
            isDriverArrived ? "bg-amber-100 text-amber-700" :
            "bg-brand-100 text-brand-700"
          }`}>
            {STATUS_LABELS[order.status] ?? order.status}
          </div>
        </div>

        {!isDelivered && !isFailed && isPickupOrder && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1 rounded-full border border-orange-200">
              🏬 Pick Up In Store
            </span>
            {order.pickupWindow && (
              <span className="flex items-center gap-1 text-sm text-gray-500">
                <Clock size={13} />
                {order.pickupWindow.dateLabel} · {order.pickupWindow.label}
              </span>
            )}
          </div>
        )}

        {!isDelivered && !isFailed && !isPickupOrder && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {order.deliveryType === "next-morning" ? (
              <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full border border-amber-200">
                🌅 Next Business Morning
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full border border-green-200">
                ⚡ Same-Day Delivery
              </span>
            )}
            {order.estimatedDelivery ? (
              <span className="flex items-center gap-1 text-sm text-gray-500">
                <Clock size={13} />
                {order.deliveryType === "next-morning"
                  ? `Ready: ${new Date(order.estimatedDelivery).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} at ${new Date(order.estimatedDelivery).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                  : `ETA: ${new Date(order.estimatedDelivery).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} or sooner`
                }
              </span>
            ) : order.status === "pending" && order.deliveryType === "same-day" ? (
              <span className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
                Confirming your order — ETA will appear once accepted
              </span>
            ) : null}
          </div>
        )}

        {/* Driver arrived: wait timer */}
        {isDriverArrived && order.waitTimerStart && (
          <WaitTimer waitTimerStart={order.waitTimerStart} />
        )}

        {/* ID reminder when delivery is active */}
        {ACTIVE_STATUSES.includes(order.status) && (
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-xs text-blue-700 font-medium">
            🪪 Please have your valid 21+ photo ID ready for delivery. You must show it to receive your order.
          </div>
        )}

        {/* Ready for pickup: instructions + customer confirm */}
        {isReadyForPickup && (
          <div className="mt-3 space-y-3">
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl px-4 py-3.5">
              <p className="font-bold text-amber-800 text-sm mb-1">🛍️ Your order is ready for pick up!</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                📍 Cold Spring Liquor — 15609 Ronald Reagan Blvd Suite B-100, Leander, TX 78641<br />
                🪪 Bring a valid 21+ photo ID — the name should match the order.<br />
                We will hold your order for 7 days post pickup date.
              </p>
            </div>
            {confirmPickupError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-xs text-red-700">{confirmPickupError}</div>
            )}
            <button onClick={confirmPickedUp} disabled={confirmingPickup}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-black py-3.5 rounded-xl text-sm transition-all">
              {confirmingPickup ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              Confirm Order Picked Up
            </button>
            <p className="text-center text-[11px] text-gray-400">Already picked up your order? Tap to confirm and complete it.</p>
          </div>
        )}
      </div>

      {/* Failed state */}
      {isFailed && (
        <div className="px-6 py-5 space-y-3">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <p className="text-2xl mb-2">😔</p>
            <p className="font-bold text-red-700">
              {order.status === "cancelled" ? "Order Cancelled" : "Delivery Could Not Be Completed"}
            </p>
            {order.failReason && <p className="text-sm text-red-600 mt-1">{order.failReason}</p>}
          </div>

          {/* Store contact */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 space-y-2.5">
            <p className="text-sm font-bold text-gray-800">Contact Us for Assistance</p>
            {storePhone && (
              <a href={`tel:${storePhone.replace(/\D/g,"")}`}
                className="flex items-center gap-2.5 text-sm text-brand-600 font-semibold hover:underline">
                <span className="text-base">📞</span> {storePhone}
              </a>
            )}
            {storeTextPhone && (
              <a href={`sms:${storeTextPhone.replace(/\D/g,"")}`}
                className="flex items-center gap-2.5 text-sm text-gray-600 hover:underline">
                <span className="text-base">💬</span> Text: {storeTextPhone}
              </a>
            )}
            {storeAddress && (
              <div className="flex items-start gap-2.5 text-sm text-gray-600">
                <span className="text-base shrink-0">📍</span>
                <span>{storeAddress}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress steps */}
      {!isFailed && (
        <div className="px-6 py-5">
          <div className="space-y-0">
            {steps.map((step, idx) => {
              const done = idx <= currentStep;
              const active = idx === currentStep;
              const isLast = idx === steps.length - 1;

              return (
                <div key={step.label} className="flex gap-4">
                  {/* Icon + connector */}
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 transition-all ${
                      done
                        ? "bg-green-500 text-white"
                        : active
                        ? "bg-brand-500 text-white"
                        : "bg-gray-100 text-gray-400"
                    }`}>
                      {done ? (active && !isDelivered ? <span>{step.emoji}</span> : <CheckCircle size={16} className="fill-white" />) : <Circle size={16} />}
                    </div>
                    {!isLast && (
                      <div className={`w-0.5 h-8 my-1 rounded-full transition-colors ${
                        idx < currentStep ? "bg-green-400" : "bg-gray-200"
                      }`} />
                    )}
                  </div>

                  {/* Text */}
                  <div className="pb-4 pt-1">
                    <p className={`font-semibold text-sm ${
                      active ? "text-brand-600" : done ? "text-gray-800" : "text-gray-400"
                    }`}>
                      {step.label}
                      {active && <span className="ml-2 text-xs font-normal text-brand-400 animate-pulse">● Now</span>}
                    </p>
                    <p className={`text-xs mt-0.5 ${done ? "text-gray-500" : "text-gray-300"}`}>
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Post-delivery thank you */}
      {isDelivered && (
        <div className="px-6 pt-5">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5 text-center">
            <p className="text-2xl mb-1">🎉</p>
            <p className="font-bold text-green-800">Enjoy your order!</p>
            <p className="text-sm text-green-700 mt-1">
              Thanks for shopping with Cold Spring Liquor — we hope to see you again soon.
            </p>
            {reorderDraft === null && (
              <button
                onClick={handleReorder}
                disabled={reorderLoading}
                className="mt-4 inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all"
              >
                {reorderLoading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                Order Again
              </button>
            )}
          </div>
        </div>
      )}

      {/* Order summary */}
      <div className="border-t mt-5 px-6 py-4 bg-gray-50 rounded-b-xl space-y-4">
        {/* Itemized list */}
        {order.items?.length > 0 && (
          <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-100 max-h-56 overflow-y-auto">
            {order.items.map((it: any, i: number) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                <ItemThumb imageUrl={it.imageUrl} category={it.category} name={it.name} size={38} />
                <span className="flex-1 min-w-0 text-sm text-gray-700 leading-snug">
                  {it.name} <span className="text-gray-400">×{it.quantity}</span>
                </span>
                <span className="text-sm font-semibold text-gray-900 shrink-0">
                  {formatCurrency((it.salePrice ?? it.price) * it.quantity)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Price breakdown */}
        <div className="text-sm space-y-1.5">
          <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatCurrency(order.subtotal ?? order.total)}</span></div>
          {order.bundleDiscount > 0 && <div className="flex justify-between text-purple-600 font-medium"><span>📦 Bundle</span><span>-{formatCurrency(order.bundleDiscount)}</span></div>}
          {order.couponDiscount > 0 && <div className="flex justify-between text-green-600 font-medium"><span>🏷️ {order.couponCode ?? "Coupon"}</span><span>-{formatCurrency(order.couponDiscount)}</span></div>}
          {order.rewardsDiscount > 0 && <div className="flex justify-between text-purple-600 font-medium"><span>🏆 Rewards</span><span>-{formatCurrency(order.rewardsDiscount)}</span></div>}
          {order.giftCardAmount > 0 && <div className="flex justify-between text-green-600 font-medium"><span>🎁 Gift Card{order.giftCardCode ? ` (${order.giftCardCode})` : ""}</span><span>-{formatCurrency(order.giftCardAmount)}</span></div>}
          {isPickupOrder ? (
            order.pickupDiscount > 0 && <div className="flex justify-between text-green-600 font-bold"><span>💚 Pick Up Discount</span><span>-{formatCurrency(order.pickupDiscount)}</span></div>
          ) : (
            <div className="flex justify-between text-green-600 font-medium"><span>🚚 Delivery</span><span>FREE</span></div>
          )}
          <div className="flex justify-between text-gray-500"><span>Tax</span><span>{formatCurrency(order.tax ?? 0)}</span></div>
          <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between items-baseline">
            <span className="font-bold text-gray-900">Total</span>
            <span className="font-black text-base text-gray-900">{formatCurrency(order.total)}</span>
          </div>
        </div>

        {isPickupOrder ? (
          <p className="text-xs text-gray-400">
            📍 Pick up at: 15609 Ronald Reagan Blvd Suite B-100, Leander, TX 78641
          </p>
        ) : (
          order.deliveryAddress && (
            <p className="text-xs text-gray-400">
              📍 Delivering to: {order.deliveryAddress.street}, {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.zip}
            </p>
          )
        )}
      </div>

      {reorderDraft && (
        <ReorderModal draft={reorderDraft} onConfirm={confirmReorder} onClose={() => setReorderDraft(null)} />
      )}
    </div>
  );
}
