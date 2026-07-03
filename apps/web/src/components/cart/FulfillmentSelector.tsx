"use client";

import { useRouter } from "next/navigation";
import { PICKUP_DISCOUNT_LABEL } from "@/lib/pickupWindows";

// Delivery / Pick Up switcher shown at the top of both checkout pages.
// Desktop: two large radio cards. Mobile: compact tabs stuck below the header
// so the Pick Up option is always visible without opening the order summary.
export function FulfillmentSelector({
  mode,
  onBeforeSwitch,
}: {
  mode: "delivery" | "pickup";
  onBeforeSwitch?: () => void;
}) {
  const router = useRouter();

  function go(target: "delivery" | "pickup") {
    if (target === mode) return;
    onBeforeSwitch?.();
    router.push(target === "pickup" ? "/checkout/pickup" : "/checkout");
  }

  const isPickup = mode === "pickup";

  return (
    <>
      {/* Desktop / tablet: two radio cards */}
      <div className="hidden sm:grid grid-cols-2 gap-3">
        <button type="button" onClick={() => go("delivery")}
          className={`relative flex items-center gap-3.5 rounded-2xl border-2 p-4 text-left transition-all ${
            !isPickup ? "border-brand-500 bg-orange-50" : "border-gray-200 bg-white hover:border-brand-300"
          }`}>
          <span className={`w-[18px] h-[18px] rounded-full border-2 shrink-0 ${!isPickup ? "border-brand-500 bg-brand-500 shadow-[inset_0_0_0_3px_white]" : "border-gray-300"}`} />
          <span className="text-2xl leading-none">🚚</span>
          <span className="min-w-0">
            <span className="block font-black text-gray-900 text-sm">Delivery</span>
            <span className="block text-xs text-gray-500 leading-tight">FREE Delivery · No Tip Required</span>
          </span>
        </button>

        <button type="button" onClick={() => go("pickup")}
          className={`relative flex items-center gap-3.5 rounded-2xl border-2 p-4 text-left transition-all ${
            isPickup ? "border-brand-500 bg-orange-50" : "border-gray-200 bg-white hover:border-brand-300"
          }`}>
          <span className="absolute -top-2.5 right-3 bg-green-600 text-white text-[10px] font-black tracking-wide px-2.5 py-0.5 rounded-full">
            SAVE {PICKUP_DISCOUNT_LABEL}
          </span>
          <span className={`w-[18px] h-[18px] rounded-full border-2 shrink-0 ${isPickup ? "border-brand-500 bg-brand-500 shadow-[inset_0_0_0_3px_white]" : "border-gray-300"}`} />
          <span className="text-2xl leading-none">🏬</span>
          <span className="min-w-0">
            <span className="block font-black text-gray-900 text-sm">Pick Up In Store</span>
            <span className="block text-xs text-gray-500 leading-tight">Ready in as little as 30 min</span>
          </span>
        </button>
      </div>

      {/* Mobile: sticky compact tabs — always visible while scrolling */}
      <div className="sm:hidden sticky top-14 z-30 grid grid-cols-2 rounded-xl overflow-hidden border-2 border-gray-200 bg-white shadow-lg shadow-black/5">
        <button type="button" onClick={() => go("delivery")}
          className={`py-2.5 px-2 text-center transition-colors ${!isPickup ? "bg-orange-50 shadow-[inset_0_-3px_0_#f97316]" : "bg-white"}`}>
          <span className={`block text-[13px] font-black ${!isPickup ? "text-brand-600" : "text-gray-600"}`}>🚚 Delivery</span>
          <span className={`block text-[10px] font-bold ${!isPickup ? "text-green-600" : "text-gray-400"}`}>FREE</span>
        </button>
        <button type="button" onClick={() => go("pickup")}
          className={`py-2.5 px-2 text-center transition-colors ${isPickup ? "bg-orange-50 shadow-[inset_0_-3px_0_#f97316]" : "bg-white"}`}>
          <span className={`block text-[13px] font-black ${isPickup ? "text-brand-600" : "text-gray-600"}`}>🏬 Pick Up</span>
          <span className={`block text-[10px] font-bold ${isPickup ? "text-green-600" : "text-green-600"}`}>SAVE {PICKUP_DISCOUNT_LABEL}</span>
        </button>
      </div>
    </>
  );
}
