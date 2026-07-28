"use client";
import { create } from "zustand";

export type FulfillmentMode = "delivery" | "pickup";

interface CheckoutStore {
  promoCode: string | null;
  promoDiscount: number;
  setPromo: (code: string | null, discount: number) => void;
  clearPromo: () => void;
  // Delivery ↔ Pick Up switching happens client-side (no page reload).
  // null = not set yet — components fall back to the page's initial mode.
  fulfillmentMode: FulfillmentMode | null;
  setFulfillmentMode: (m: FulfillmentMode) => void;
  // True once the customer is past step 1 (payment/review). The header's
  // "Change back to Delivery" must not switch modes mid-payment — the Stripe
  // intent amount and validated address belong to the mode it was created in.
  fulfillmentLocked: boolean;
  setFulfillmentLocked: (locked: boolean) => void;
}

export const useCheckoutStore = create<CheckoutStore>((set) => ({
  promoCode: null,
  promoDiscount: 0,
  setPromo: (code, discount) => set({ promoCode: code, promoDiscount: discount }),
  clearPromo: () => set({ promoCode: null, promoDiscount: 0 }),
  fulfillmentMode: null,
  setFulfillmentMode: (m) => set({ fulfillmentMode: m }),
  fulfillmentLocked: false,
  setFulfillmentLocked: (locked) => set({ fulfillmentLocked: locked }),
}));
