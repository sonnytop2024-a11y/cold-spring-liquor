import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product, CartItem } from "@/types";

interface CartState {
  items: CartItem[];
  couponCode: string | null;
  couponDiscount: number;
  giftCardCode: string | null;
  giftCardAmount: number;
  rewardsPointsToRedeem: number;

  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;

  setCoupon: (code: string | null, discount: number) => void;
  setGiftCard: (code: string | null, amount: number) => void;
  setRewardsRedeem: (points: number) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      couponCode: null,
      couponDiscount: 0,
      giftCardCode: null,
      giftCardAmount: 0,
      rewardsPointsToRedeem: 0,

      addItem: (product, quantity = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.product.id === product.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product.id === product.id
                  ? { ...i, quantity: i.quantity + quantity }
                  : i,
              ),
            };
          }
          return { items: [...state.items, { product, quantity }] };
        }),

      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.product.id !== productId),
        })),

      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.product.id !== productId)
              : state.items.map((i) =>
                  i.product.id === productId ? { ...i, quantity } : i,
                ),
        })),

      clearCart: () =>
        set({
          items: [],
          couponCode: null,
          couponDiscount: 0,
          giftCardCode: null,
          giftCardAmount: 0,
          rewardsPointsToRedeem: 0,
        }),

      setCoupon: (code, discount) => set({ couponCode: code, couponDiscount: discount }),
      setGiftCard: (code, amount) => set({ giftCardCode: code, giftCardAmount: amount }),
      setRewardsRedeem: (points) => set({ rewardsPointsToRedeem: points }),
    }),
    { name: "csl-cart" },
  ),
);
