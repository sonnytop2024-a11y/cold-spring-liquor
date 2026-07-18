"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Package, Loader2, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";
import { ReorderModal, type ReorderDraft } from "@/components/account/AccountDashboard";
import { STORE_HOURS } from "@/lib/pickupWindows";

const STATUS_LABEL: Record<string, string> = {
  pending: "Order Received",
  confirmed: "Confirmed",
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

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  preparing: "bg-orange-100 text-orange-700 uppercase font-black tracking-wide",
  driver_assigned: "bg-purple-100 text-purple-700",
  driver_at_store: "bg-orange-100 text-orange-700",
  out_for_delivery: "bg-orange-100 text-orange-700",
  driver_arriving: "bg-yellow-100 text-yellow-700",
  driver_arrived: "bg-amber-100 text-amber-700",
  delivered: "bg-green-100 text-green-700",
  failed_delivery: "bg-red-100 text-red-700",
  cancelled: "bg-red-100 text-red-700",
  ready_for_pickup: "bg-green-100 text-green-700 uppercase font-black tracking-wide",
  picked_up: "bg-green-100 text-green-700",
};

const ACTIVE_STATUSES = ["pending","confirmed","preparing","driver_assigned","driver_at_store","out_for_delivery","driver_arriving","driver_arrived","ready_for_pickup"];

async function fetchOrder(id: string) {
  const res = await fetch(`/api/orders/${id}`);
  if (!res.ok) return null;
  return res.json();
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const addToCart = useCartStore((s) => s.addItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const [reorderDraft, setReorderDraft] = useState<ReorderDraft | null>(null);
  const [reorderLoading, setReorderLoading] = useState(false);

  const { data: order, isLoading, error } = useQuery({
    queryKey: ["order-detail", id],
    queryFn: () => fetchOrder(id),
    retry: 1,
  });

  // Reorder goes through the server so availability/stock/current prices are
  // validated — old promo codes and sale prices are never carried over.
  async function handleReorder() {
    setReorderLoading(true);
    try {
      const res = await fetch(`/api/orders/reorder/${id}`, { method: "POST" });
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

  if (isLoading) {
    return (
      <div className="container-main py-12 flex items-center justify-center gap-3 text-gray-400">
        <Loader2 size={22} className="animate-spin" />
        Loading order details…
      </div>
    );
  }

  if (!order || order.error || error) {
    return (
      <div className="container-main py-12 text-center">
        <Package size={48} className="mx-auto mb-4 text-gray-200" />
        <p className="text-gray-500 font-medium">Order not found or could not be loaded.</p>
        <Link href="/account/orders" className="mt-4 inline-block text-brand-600 hover:underline font-medium">
          ← Back to Order History
        </Link>
      </div>
    );
  }

  const isActive = ACTIVE_STATUSES.includes(order.status);
  const isDelivered = order.status === "delivered" || order.status === "picked_up";
  const isPickupOrder = order.orderType === "pickup";
  const isReadyForPickup = order.status === "ready_for_pickup";
  const isFailed = ["failed_delivery", "cancelled"].includes(order.status);

  // Mask street number from address for privacy in history
  function maskStreet(street: string): string {
    // Keep the street name but remove the house/unit number
    return street.replace(/^\d+[-\s]?(\w+\s)?/, "").trim() || street;
  }

  const addr = order.deliveryAddress;

  return (
    <div className="container-main py-8 max-w-2xl mx-auto">
      {/* Back link */}
      <Link
        href="/account/orders"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Order History
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold">Order #{order.orderNumber}</h1>
          <p className="text-gray-500 text-sm mt-1">
            Placed on{" "}
            {new Date(order.createdAt).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}{" "}
            at{" "}
            {new Date(order.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <span className={`text-sm font-semibold px-4 py-1.5 rounded-full ${STATUS_COLOR[order.status] ?? "bg-gray-100 text-gray-700"}`}>
          {STATUS_LABEL[order.status] ?? order.status}
        </span>
      </div>

      {/* Active order CTA */}
      {isActive && (
        <div className={`mb-4 border rounded-xl px-4 py-3 flex items-center justify-between gap-3 ${isReadyForPickup ? "bg-amber-50 border-amber-300" : "bg-brand-50 border-brand-200"}`}>
          <p className={`text-sm font-medium ${isReadyForPickup ? "text-amber-800" : "text-brand-700"}`}>
            {isReadyForPickup
              ? "🛍️ Your order is ready for pick up!"
              : isPickupOrder ? "Your pick up order is being prepared" : "Your order is on its way!"}
          </p>
          <Link
            href={`/track/${order.id}`}
            className={`text-sm font-bold text-white px-4 py-2 rounded-lg transition-colors ${isReadyForPickup ? "bg-green-600 hover:bg-green-700" : "bg-brand-500 hover:bg-brand-600"}`}
          >
            {isReadyForPickup ? "Confirm Picked Up →" : isPickupOrder ? "View Order →" : "Track Order →"}
          </Link>
        </div>
      )}

      {/* Pickup info card */}
      {isPickupOrder && order.pickupWindow && (
        <div className="mb-4 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-sm text-gray-700">
          <p className="font-bold text-gray-900 text-xs uppercase tracking-wide mb-1">🏬 Pick Up In Store</p>
          <p>🕐 {order.pickupWindow.dateLabel} · {order.pickupWindow.label}</p>
          <p className="text-gray-500 text-xs mt-0.5">15609 Ronald Reagan Blvd Suite B-100, Leander, TX 78641 · Bring a valid 21+ photo ID</p>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
            {STORE_HOURS.map(h => (
              <div key={h.day} className="flex justify-between gap-2">
                <span className="text-gray-500">{h.day}</span>
                <span className={h.closed ? "text-red-500 font-semibold" : "text-gray-700 font-medium"}>{h.hours}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Failed/cancelled notice */}
      {isFailed && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-red-700">
            {order.status === "cancelled" ? "Order was cancelled." : "Delivery could not be completed."}
          </p>
          {order.failReason && <p className="text-xs text-red-600 mt-1">{order.failReason}</p>}
          {order.cancelReason && <p className="text-xs text-red-600 mt-1">{order.cancelReason}</p>}
        </div>
      )}

      {/* Items */}
      <div className="bg-white border rounded-xl mb-4 overflow-hidden">
        <div className="px-5 py-4 border-b">
          <p className="font-semibold text-sm text-gray-700">
            {order.items?.length ?? 0} Item{order.items?.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="divide-y">
          {order.items?.map((item: any, i: number) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt={item.name} className="w-12 h-12 object-contain rounded-lg bg-gray-50 border shrink-0" />
              ) : (
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                  <Package size={18} className="text-gray-300" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm leading-tight">{item.name}</p>
                {item.brand && <p className="text-xs text-gray-400">{item.brand}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-medium">{formatCurrency(item.price * item.quantity)}</p>
                <p className="text-xs text-gray-400">×{item.quantity} @ {formatCurrency(item.price)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Price breakdown */}
      <div className="bg-white border rounded-xl mb-4 px-5 py-4 space-y-2.5">
        <p className="font-semibold text-sm text-gray-700 mb-3">Order Summary</p>

        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal</span>
          <span>{formatCurrency(order.subtotal)}</span>
        </div>
        {Number(order.bundleDiscount) > 0 && (
          <div className="flex justify-between text-sm text-blue-600">
            <span>Bundle Discount</span>
            <span>-{formatCurrency(order.bundleDiscount)}</span>
          </div>
        )}
        {Number(order.pickupDiscount) > 0 && (
          <div className="flex justify-between text-sm text-green-600 font-medium">
            <span>💚 Pick Up Discount (−5%)</span>
            <span>-{formatCurrency(order.pickupDiscount)}</span>
          </div>
        )}
        {Number(order.couponDiscount) > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>Promo Code {order.couponCode ? `(${order.couponCode})` : ""}</span>
            <span>-{formatCurrency(order.couponDiscount)}</span>
          </div>
        )}
        {Number(order.rewardDiscount) > 0 && (
          <div className="flex justify-between text-sm text-purple-600">
            <span>CS Rewards Redemption</span>
            <span>-{formatCurrency(order.rewardDiscount)}</span>
          </div>
        )}
        {!isPickupOrder && (
          <div className="flex justify-between text-sm text-green-600">
            <span>Delivery Fee</span>
            <span>FREE</span>
          </div>
        )}
        <div className="flex justify-between text-sm text-gray-600">
          <span>Tax (8.25%)</span>
          <span>{formatCurrency(order.tax)}</span>
        </div>
        <div className="flex justify-between font-bold text-base border-t pt-2.5">
          <span>Order Total</span>
          <span>{formatCurrency(order.total)}</span>
        </div>
      </div>

      {/* Delivery address */}
      {addr && (
        <div className="bg-white border rounded-xl mb-4 px-5 py-4">
          <p className="font-semibold text-sm text-gray-700 mb-2">Delivery Address</p>
          {isDelivered ? (
            // In history, mask the street number for privacy
            <div className="text-sm text-gray-600">
              <p>{maskStreet(addr.street)}</p>
              <p>{addr.city}, {addr.state} {addr.zip}</p>
            </div>
          ) : (
            // Active orders: show full address
            <div className="text-sm text-gray-600">
              <p>{addr.street}</p>
              <p>{addr.city}, {addr.state} {addr.zip}</p>
            </div>
          )}
        </div>
      )}

      {/* Payment */}
      {order.paymentMethod && (
        <div className="bg-white border rounded-xl mb-4 px-5 py-4">
          <p className="font-semibold text-sm text-gray-700 mb-1">Payment</p>
          <p className="text-sm text-gray-600 capitalize">{order.paymentMethod}</p>
        </div>
      )}

      {/* Delivery status summary */}
      {isDelivered && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 mb-4">
          <p className="font-semibold text-sm text-green-700 mb-1">
            {order.status === "picked_up" ? "✓ Picked Up Successfully" : "✓ Delivered Successfully"}
          </p>
          {order.statusTimestamps?.delivered && (
            <p className="text-xs text-green-600">
              Delivered at{" "}
              {new Date(order.statusTimestamps.delivered).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              on{" "}
              {new Date(order.statusTimestamps.delivered).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </p>
          )}
          {order.ageVerified && (
            <p className="text-xs text-green-600 mt-0.5">✓ Age verified · Signature collected</p>
          )}
        </div>
      )}

      {/* Reorder button */}
      {isDelivered && order.items?.length > 0 && (
        <button
          onClick={handleReorder}
          disabled={reorderLoading}
          className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl text-sm transition-colors mb-3"
        >
          {reorderLoading
            ? <><Loader2 size={16} className="animate-spin" /> Checking availability…</>
            : <><RefreshCw size={16} /> REORDER</>}
        </button>
      )}

      {reorderDraft && (
        <ReorderModal draft={reorderDraft} onConfirm={confirmReorder} onClose={() => setReorderDraft(null)} />
      )}

      <Link
        href="/account/orders"
        className="block text-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        ← Back to Order History
      </Link>
    </div>
  );
}
