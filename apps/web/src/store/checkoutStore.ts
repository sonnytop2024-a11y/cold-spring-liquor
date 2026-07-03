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
}

export const useCheckoutStore = create<CheckoutStore>((set) => ({
  promoCode: null,
  promoDiscount: 0,
  setPromo: (code, discount) => set({ promoCode: code, promoDiscount: discount }),
  clearPromo: () => set({ promoCode: null, promoDiscount: 0 }),
  fulfillmentMode: null,
  setFulfillmentMode: (m) => set({ fulfillmentMode: m }),
}));
