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

  addItem: (product: Product, quantity?: number, extras?: { referenceImageUrl?: string; verificationNote?: string }) => void;
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

      addItem: (product, quantity = 1, extras) =>
        set((state) => {
          const cap = product.stockQty ?? Infinity;
          const existing = state.items.find((i) => i.product.id === product.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product.id === product.id
                  ? {
                      ...i,
                      quantity: Math.min(i.quantity + quantity, cap),
                      // Newest upload/note wins if the customer adds the same item again
                      referenceImageUrl: extras?.referenceImageUrl ?? i.referenceImageUrl,
                      verificationNote: extras?.verificationNote ?? i.verificationNote,
                    }
                  : i,
              ),
            };
          }
          return {
            items: [...state.items, {
              product,
              quantity: Math.min(quantity, cap),
              referenceImageUrl: extras?.referenceImageUrl,
              verificationNote: extras?.verificationNote,
            }],
          };
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
                  i.product.id === productId
                    ? { ...i, quantity: Math.min(quantity, i.product.stockQty ?? Infinity) }
                    : i,
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
