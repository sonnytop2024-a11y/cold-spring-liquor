import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export const TAX_RATE = 0.0825;
export const MIN_ORDER = 20; // Delivery always FREE; minimum $20 to place order

export function calcCartTotals(
  subtotal: number,
  discount = 0,
  rewardsDiscount = 0,
  giftCardAmount = 0,
) {
  const discountedSubtotal = Math.max(subtotal - discount - rewardsDiscount, 0);
  const tax = discountedSubtotal * TAX_RATE;
  const appliedGiftCard = Math.min(giftCardAmount, discountedSubtotal + tax);
  const total = Math.max(discountedSubtotal + tax - appliedGiftCard, 0);
  return {
    deliveryFee: 0,
    tax,
    total,
    discountedSubtotal,
    appliedGiftCard,
  };
}

// Rewards calculation
export function calcPointsEarned(subtotal: number): number {
  return Math.floor(subtotal); // 1 point per $1
}

export function calcPointsValue(points: number): number {
  if (points >= 1000) return 75;
  if (points >= 500) return 35;
  if (points >= 250) return 15;
  if (points >= 100) return 5;
  return 0;
}

// VIP tier
export function getVipTier(totalSpend: number): "none" | "silver" | "gold" | "platinum" {
  if (totalSpend >= 3000) return "platinum";
  if (totalSpend >= 1500) return "gold";
  if (totalSpend >= 500) return "silver";
  return "none";
}
