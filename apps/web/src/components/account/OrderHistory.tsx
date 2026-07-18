"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";

async function fetchMyOrders() {
  const res = await fetch("/api/orders/my");
  if (!res.ok) return [];
  return res.json();
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Order Received",
  confirmed: "Confirmed",
  preparing: "PREPARING",
  driver_assigned: "Driver Assigned",
  driver_at_store: "Driver at Store",
  out_for_delivery: "Out for Delivery",
  driver_arriving: "Arriving Soon",
  driver_arrived: "Driver Arrived",
  delivered: "Delivered",
  failed_delivery: "Delivery Failed",
  cancelled: "Cancelled",
  ready_for_pickup: "READY FOR PICKUP",
  picked_up: "Picked Up",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  preparing: "bg-orange-100 text-orange-700 font-black uppercase tracking-wide",
  driver_assigned: "bg-purple-100 text-purple-700",
  driver_at_store: "bg-orange-100 text-orange-700",
  out_for_delivery: "bg-orange-100 text-orange-700",
  driver_arriving: "bg-yellow-100 text-yellow-700",
  driver_arrived: "bg-amber-100 text-amber-700",
  delivered: "bg-green-100 text-green-700",
  failed_delivery: "bg-red-100 text-red-700",
  cancelled: "bg-red-100 text-red-700",
  ready_for_pickup: "bg-green-100 text-green-700 font-black uppercase tracking-wide",
  picked_up: "bg-green-100 text-green-700",
};

export function OrderHistory() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: fetchMyOrders,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-100 rounded-xl h-28 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-4xl mb-4">📦</p>
        <p>No orders yet.</p>
        <Link
          href="/products"
          className="inline-block mt-4 text-brand-600 hover:underline font-medium"
        >
          Start shopping →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order: any) => (
        <div key={order.id} className="bg-white border rounded-xl p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
            <div>
              <p className="font-bold text-lg">#{order.orderNumber}</p>
              <p className="text-sm text-gray-500">
                {new Date(order.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div className="text-right">
              <span
                className={`inline-block text-xs px-3 py-1 rounded-full ${STATUS_COLOR[order.status] ?? "bg-gray-100 text-gray-600"} ${STATUS_COLOR[order.status]?.includes("font-black") ? "" : "font-medium"}`}
              >
                {STATUS_LABEL[order.status] ?? order.status}
              </span>
              <p className="font-bold text-lg mt-1">{formatCurrency(order.total)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-sm text-gray-600 mb-3">
            {(order.items ?? []).slice(0, 4).map((i: any, idx: number) =>
              i.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={idx} src={i.imageUrl} alt={i.name}
                  className="w-10 h-10 object-contain rounded-lg bg-gray-50 border shrink-0" />
              ) : (
                <div key={idx} className="w-10 h-10 rounded-lg bg-gray-50 border flex items-center justify-center text-base shrink-0">🥃</div>
              ),
            )}
            <p className="min-w-0 flex-1">
              {order.items
                ?.slice(0, 2)
                .map((i: any) => `${i.name} ×${i.quantity}`)
                .join(", ")}
              {order.items?.length > 2 && ` +${order.items.length - 2} more`}
            </p>
          </div>

          <div className="flex gap-3">
            {["pending","confirmed","preparing","driver_assigned","driver_at_store","out_for_delivery","driver_arriving","driver_arrived","ready_for_pickup"].includes(
              order.status,
            ) && (
              <Link
                href={`/track/${order.id}`}
                className="flex-1 text-center text-sm font-medium bg-brand-500 hover:bg-brand-600 text-white py-2 rounded-lg transition-colors"
              >
                Track Order
              </Link>
            )}
            <Link
              href={`/account/orders/${order.id}`}
              className="flex-1 text-center text-sm font-medium border hover:bg-gray-50 py-2 rounded-lg transition-colors"
            >
              View Details
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
