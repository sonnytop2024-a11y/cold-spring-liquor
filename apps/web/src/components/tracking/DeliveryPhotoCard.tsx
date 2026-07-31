"use client";

import { useState } from "react";
import { X } from "lucide-react";

// Photo the driver takes of where the order was placed, shown to the
// customer once the order is Delivered (anh Sơn, 31/07: "Your order was
// left here."). The photo itself has existed on the order for a while
// (drivers must take it before completing delivery) — this just finally
// surfaces it to the customer. Tap to view full-size.
export function DeliveryPhotoCard({ photoUrl, deliveredAt }: {
  photoUrl?: string;
  deliveredAt?: string;
}) {
  const [zoomed, setZoomed] = useState(false);

  if (!photoUrl) return null;

  return (
    <>
      <div className="bg-white border border-green-200 rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setZoomed(true)}
          className="block w-full relative group"
          aria-label="View delivery photo full size"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt="Where your order was left"
            className="w-full max-h-64 object-cover"
          />
          <span className="absolute bottom-2 right-2 text-[11px] font-semibold text-white bg-black/50 px-2 py-1 rounded-lg opacity-80 group-hover:opacity-100">
            🔍 Tap to enlarge
          </span>
        </button>
        <div className="px-4 py-3">
          <p className="text-sm font-bold text-gray-800">📍 Your order was left here.</p>
          {deliveredAt && (
            <p className="text-xs text-gray-500 mt-0.5">
              Delivered{" "}
              {new Date(deliveredAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
              at{" "}
              {new Date(deliveredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
      </div>

      {zoomed && (
        <div
          className="fixed inset-0 z-[110] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setZoomed(false)}
        >
          <button
            type="button"
            onClick={() => setZoomed(false)}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2"
            aria-label="Close"
          >
            <X size={26} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt="Where your order was left"
            className="max-w-full max-h-full object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
