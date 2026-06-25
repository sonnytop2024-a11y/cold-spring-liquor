"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Circle, Clock, Loader2, Bell } from "lucide-react";

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
};

const ACTIVE_STATUSES = ["out_for_delivery", "driver_arriving", "driver_arrived"];

function getCurrentStep(status: string): number {
  for (let i = 0; i < STEPS.length; i++) {
    if (STEPS[i].statuses.includes(status)) return i;
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

export function OrderTracker({ orderId }: { orderId: string }) {
  const [notifDismissed, setNotifDismissed] = useState(false);

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

  const isFailed = FAILED_STATUSES.includes(order.status);
  const currentStep = getCurrentStep(order.status);
  const isDelivered = order.status === "delivered";
  const isDriverArrived = order.status === "driver_arrived";

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

        {!isDelivered && !isFailed && (
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
            {order.estimatedDelivery && (
              <span className="flex items-center gap-1 text-sm text-gray-500">
                <Clock size={13} />
                {order.deliveryType === "next-morning"
                  ? `Ready: ${new Date(order.estimatedDelivery).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} at ${new Date(order.estimatedDelivery).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                  : `ETA: ${new Date(order.estimatedDelivery).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} or sooner`
                }
              </span>
            )}
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

          {/* No-refund notice */}
          {order.status === "failed_delivery" && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 text-sm text-amber-800">
              <p className="font-bold mb-0.5">⚠️ No Refund for Failed Delivery</p>
              <p className="text-xs">Per our policy, failed deliveries due to customer unavailability or ID verification failure are non-refundable.</p>
            </div>
          )}

          {/* Store contact */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 space-y-2.5">
            <p className="text-sm font-bold text-gray-800">Contact Us for Assistance</p>
            <a href="tel:+15125550100"
              className="flex items-center gap-2.5 text-sm text-brand-600 font-semibold hover:underline">
              <span className="text-base">📞</span> (512) 555-0100
            </a>
            <div className="flex items-start gap-2.5 text-sm text-gray-600">
              <span className="text-base shrink-0">📍</span>
              <span>15609 Ronald Reagan Blvd Ste B100,<br />Leander, TX 78641</span>
            </div>
            <p className="text-xs text-gray-400">Store hours: Mon–Sun 10 AM – 10 PM</p>
          </div>
        </div>
      )}

      {/* Progress steps */}
      {!isFailed && (
        <div className="px-6 py-5">
          <div className="space-y-0">
            {STEPS.map((step, idx) => {
              const done = idx <= currentStep;
              const active = idx === currentStep;
              const isLast = idx === STEPS.length - 1;

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

      {/* Order summary */}
      <div className="border-t px-6 py-4 bg-gray-50 rounded-b-xl">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">{order.items?.length ?? 0} item(s)</span>
          <span className="font-bold">${Number(order.total).toFixed(2)}</span>
        </div>
        {order.deliveryAddress && (
          <p className="text-xs text-gray-400 mt-1">
            Delivering to: {order.deliveryAddress.street}, {order.deliveryAddress.city}
          </p>
        )}
        <p className="text-xs text-green-600 font-medium mt-1">🚚 FREE Delivery · 💰 No Tip Required</p>
      </div>
    </div>
  );
}
