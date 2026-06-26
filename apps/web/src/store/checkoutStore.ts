"use client";
import { create } from "zustand";

interface CheckoutStore {
  promoCode: string | null;
  promoDiscount: number;
  setPromo: (code: string | null, discount: number) => void;
  clearPromo: () => void;
}

export const useCheckoutStore = create<CheckoutStore>((set) => ({
  promoCode: null,
  promoDiscount: 0,
  setPromo: (code, discount) => set({ promoCode: code, promoDiscount: discount }),
  clearPromo: () => set({ promoCode: null, promoDiscount: 0 }),
}));
