"use client";

import { useCheckoutStore, type FulfillmentMode } from "@/store/checkoutStore";
import { PICKUP_DISCOUNT_LABEL } from "@/lib/pickupWindows";

// Page heading that follows the client-side Delivery ↔ Pick Up mode.
export function CheckoutHeader({ initialMode }: { initialMode: FulfillmentMode }) {
  const mode = useCheckoutStore(s => s.fulfillmentMode) ?? initialMode;
  const setFulfillmentMode = useCheckoutStore(s => s.setFulfillmentMode);
  const isPickup = mode === "pickup";

  return (
    <div className="mb-5 sm:mb-7">
      {isPickup && (
        <button
          type="button"
          onClick={() => setFulfillmentMode("delivery")}
          className="inline-block text-sm font-bold text-brand-600 hover:text-brand-700 mb-2"
        >
          ← Change back to Delivery
        </button>
      )}
      <h1 className="text-2xl sm:text-3xl font-heading font-bold text-gray-900">
        {isPickup ? "🏬 Pick Up Checkout" : "Checkout"}
      </h1>
      <p className="text-sm text-gray-500 mt-1">
        {isPickup
          ? `💚 Save ${PICKUP_DISCOUNT_LABEL} · 🔒 Secure · 21+ photo ID required at pickup`
          : "🔒 Secure · 21+ required · ID checked at delivery"}
      </p>
    </div>
  );
}
