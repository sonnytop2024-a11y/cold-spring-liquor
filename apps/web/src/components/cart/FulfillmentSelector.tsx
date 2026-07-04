"use client";

import { PICKUP_DISCOUNT_LABEL } from "@/lib/pickupWindows";
import type { FulfillmentMode } from "@/store/checkoutStore";

const SPRING = "cubic-bezier(.34,1.36,.44,1)";

// Delivery / Pick Up switcher shown at the top of the checkout.
// Controlled component — switching is instant client-side state (no reload).
// Desktop: two large radio cards. Mobile: sticky segmented control with a
// spring-animated sliding pill, always visible while scrolling.
export function FulfillmentSelector({
  mode,
  onChange,
  deliveryDisabled = false,
  freeDelivery = true,
  noTipRequired = true,
}: {
  mode: FulfillmentMode;
  onChange: (m: FulfillmentMode) => void;
  deliveryDisabled?: boolean;
  freeDelivery?: boolean;
  noTipRequired?: boolean;
}) {
  const deliverySub = [freeDelivery && "FREE Delivery", noTipRequired && "No Tip Required"]
    .filter(Boolean).join(" · ") || "Fast local delivery";
  const isPickup = mode === "pickup";

  function go(target: FulfillmentMode) {
    if (target === mode) return;
    if (target === "delivery" && deliveryDisabled) return;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate(8); } catch { /* unsupported */ }
    }
    onChange(target);
  }

  return (
    <>
      {/* Desktop / tablet: two radio cards */}
      <div className="hidden sm:grid grid-cols-2 gap-3">
        <button type="button" onClick={() => go("delivery")} disabled={deliveryDisabled}
          className={`relative flex items-center gap-3.5 rounded-2xl border-2 p-4 text-left transition-all duration-200 ${
            deliveryDisabled
              ? "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
              : !isPickup ? "border-brand-500 bg-orange-50 active:scale-[.98]" : "border-gray-200 bg-white hover:border-brand-300 active:scale-[.98]"
          }`}>
          {deliveryDisabled && (
            <span className="absolute -top-2.5 right-3 bg-gray-500 text-white text-[10px] font-black tracking-wide px-2.5 py-0.5 rounded-full">
              UNAVAILABLE
            </span>
          )}
          <span className={`w-[18px] h-[18px] rounded-full border-2 shrink-0 transition-colors ${!isPickup && !deliveryDisabled ? "border-brand-500 bg-brand-500 shadow-[inset_0_0_0_3px_white]" : "border-gray-300"}`} />
          <span className="text-2xl leading-none">🚚</span>
          <span className="min-w-0">
            <span className="block font-black text-gray-900 text-sm">Delivery</span>
            <span className="block text-xs text-gray-500 leading-tight">{deliveryDisabled ? "Temporarily unavailable" : deliverySub}</span>
          </span>
        </button>

        <button type="button" onClick={() => go("pickup")}
          className={`relative flex items-center gap-3.5 rounded-2xl border-2 p-4 text-left transition-all duration-200 active:scale-[.98] ${
            isPickup ? "border-brand-500 bg-orange-50" : "border-gray-200 bg-white hover:border-brand-300"
          }`}>
          <span className="absolute -top-2.5 right-3 bg-green-600 text-white text-[10px] font-black tracking-wide px-2.5 py-0.5 rounded-full">
            SAVE {PICKUP_DISCOUNT_LABEL}
          </span>
          <span className={`w-[18px] h-[18px] rounded-full border-2 shrink-0 transition-colors ${isPickup ? "border-brand-500 bg-brand-500 shadow-[inset_0_0_0_3px_white]" : "border-gray-300"}`} />
          <span className="text-2xl leading-none">🏬</span>
          <span className="min-w-0">
            <span className="block font-black text-gray-900 text-sm">Pick Up In Store</span>
            <span className="block text-xs text-gray-500 leading-tight">Ready in as little as 30 min</span>
          </span>
        </button>
      </div>

      {/* Mobile: sticky segmented control with spring sliding pill */}
      <div className="sm:hidden sticky top-14 z-30 relative grid grid-cols-2 p-1 rounded-2xl border border-gray-200 bg-white shadow-lg shadow-black/10">
        {/* Sliding pill */}
        <span
          aria-hidden
          className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-xl border-[1.5px] border-brand-500 bg-gradient-to-br from-orange-50 to-orange-100 shadow-[0_2px_8px_rgba(249,115,22,0.25)] transition-transform duration-300 motion-reduce:transition-none will-change-transform ${
            isPickup ? "translate-x-[calc(100%+4px)]" : "translate-x-0"
          }`}
          style={{ transitionTimingFunction: SPRING }}
        />
        <button type="button" onClick={() => go("delivery")} disabled={deliveryDisabled}
          className={`relative z-10 py-2 px-2 text-center rounded-xl transition-transform duration-150 motion-reduce:transition-none [-webkit-tap-highlight-color:transparent] ${deliveryDisabled ? "opacity-40 cursor-not-allowed" : "active:scale-[.94]"}`}>
          <span className={`block text-[13px] font-black transition-colors duration-200 ${!isPickup && !deliveryDisabled ? "text-brand-600" : "text-gray-500"}`}>🚚 Delivery</span>
          <span className={`block text-[10px] font-extrabold transition-colors duration-200 ${deliveryDisabled ? "text-gray-400" : !isPickup ? "text-green-600" : "text-gray-400"}`}>{deliveryDisabled ? "UNAVAILABLE" : freeDelivery ? "FREE" : "FAST"}</span>
        </button>
        <button type="button" onClick={() => go("pickup")}
          className="relative z-10 py-2 px-2 text-center rounded-xl transition-transform duration-150 active:scale-[.94] motion-reduce:transition-none [-webkit-tap-highlight-color:transparent]">
          <span className={`block text-[13px] font-black transition-colors duration-200 ${isPickup ? "text-brand-600" : "text-gray-500"}`}>🏬 Pick Up</span>
          <span className="block text-[10px] leading-[14px]">
            <span className={`inline-block px-1.5 rounded-full font-black transition-colors duration-200 ${isPickup ? "bg-green-600 text-white" : "bg-green-100 text-green-700"}`}>SAVE {PICKUP_DISCOUNT_LABEL}</span>
          </span>
        </button>
      </div>
    </>
  );
}
