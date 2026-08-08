import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product, CartItem } from "@/types";
import { isPreorderActive } from "@/lib/preorder";

export interface AppliedGiftCard {
  code: string;
  amount: number;
}

interface CartState {
  items: CartItem[];
  couponCode: string | null;
  couponDiscount: number;
  // Source of truth for gift cards — customers can stack several on one order.
  giftCards: AppliedGiftCard[];
  // Derived aggregates kept in sync with giftCards so every existing consumer
  // (cart summary, order payload, email/admin display) keeps working unchanged:
  // code = all codes joined with ", ", amount = sum of all cards.
  giftCardCode: string | null;
  giftCardAmount: number;
  rewardsPointsToRedeem: number;

  /** Returns false when blocked: pre-order bottles must be ordered separately from normal items */
  addItem: (product: Product, quantity?: number, extras?: { referenceImageUrl?: string; verificationNote?: string }) => boolean;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;

  setCoupon: (code: string | null, discount: number) => void;
  setGiftCard: (code: string | null, amount: number) => void;
  addGiftCard: (code: string, amount: number) => void;
  removeGiftCard: (code: string) => void;
  setRewardsRedeem: (points: number) => void;
}

function giftAggregates(giftCards: AppliedGiftCard[]) {
  return {
    giftCards,
    giftCardCode: giftCards.length ? giftCards.map((c) => c.code).join(", ") : null,
    giftCardAmount: Math.round(giftCards.reduce((a, c) => a + c.amount, 0) * 100) / 100,
  };
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      couponCode: null,
      couponDiscount: 0,
      giftCards: [],
      giftCardCode: null,
      giftCardAmount: 0,
      rewardsPointsToRedeem: 0,

      addItem: (product, quantity = 1, extras) => {
        // Pre-order rule (anh Sơn, 08/08): a pre-order bottle checks out as
        // its own separate order — never mixed with normal items, and never
        // mixed with a pre-order for a DIFFERENT release date.
        const current = useCartStore.getState().items;
        const newFrom = isPreorderActive(product.availableFrom) ? product.availableFrom : null;
        const clash = current.some((i) => {
          const itemFrom = isPreorderActive(i.product.availableFrom) ? i.product.availableFrom : null;
          return i.product.id !== product.id && itemFrom !== newFrom;
        });
        if (clash) return false;

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
        });
        return true;
      },

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
          giftCards: [],
          giftCardCode: null,
          giftCardAmount: 0,
          rewardsPointsToRedeem: 0,
        }),

      setCoupon: (code, discount) => set({ couponCode: code, couponDiscount: discount }),
      // Legacy single-card setter: null clears all cards, a code replaces the list
      setGiftCard: (code, amount) =>
        set(giftAggregates(code ? [{ code, amount }] : [])),
      addGiftCard: (code, amount) =>
        set((state) => giftAggregates([...state.giftCards.filter((c) => c.code !== code), { code, amount }])),
      removeGiftCard: (code) =>
        set((state) => giftAggregates(state.giftCards.filter((c) => c.code !== code))),
      setRewardsRedeem: (points) => set({ rewardsPointsToRedeem: points }),
    }),
    {
      name: "csl-cart",
      version: 1,
      // v0 carts persisted a single giftCardCode/giftCardAmount — convert to the array
      migrate: (persisted: any) => {
        if (persisted && !Array.isArray(persisted.giftCards)) {
          persisted.giftCards = persisted.giftCardCode
            ? [{ code: persisted.giftCardCode, amount: persisted.giftCardAmount ?? 0 }]
            : [];
        }
        return persisted;
      },
    },
  ),
);
