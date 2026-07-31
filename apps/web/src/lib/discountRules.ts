/**
 * Discount rules — one discount per item, no stacking:
 *   1. Flash Sale (salePrice < price)  → item uses salePrice, excluded from bundle & promo
 *   2. Bundle Eligible (!flash, bundleEligible=true) → item gets bundle %, excluded from promo
 *   3. Regular (no flash, not bundleEligible) → item eligible for promo code only
 */

export interface DiscountItem {
  productId?: string;
  price: number;
  salePrice?: number | null;
  bundleEligible?: boolean;
  couponExcluded?: boolean;
  quantity: number;
}

export interface BundleTierLike {
  minQty: number;
  discountPct: number;
  active?: boolean;
}

export interface UnlockDealLike {
  productId: string;
  minSpend: number;
  specialPrice: number;
  active?: boolean;
  sortOrder?: number;
}

export interface DiscountBreakdown {
  /** Subtotal at effective prices (salePrice for flash, regular price otherwise) */
  subtotal: number;
  /** Sum of (price - salePrice) * qty for flash items */
  flashSavings: number;
  /** Quantity of bundle-eligible items (non-flash) */
  bundleQty: number;
  /** Subtotal of bundle-eligible items at regular price */
  bundleSubtotal: number;
  /** Bundle discount % (0–1) */
  bundlePct: number;
  /** Bundle discount amount */
  bundleDiscount: number;
  /** Subtotal of regular items (no flash, not bundle-eligible) — promo applies here */
  promoBaseSubtotal: number;
  /** Total savings from active Unlock Deals matched in this cart */
  unlockDiscount: number;
  /** productId -> how many units unlocked and at what price, for per-item display */
  unlockApplied: Record<string, { qty: number; specialPrice: number }>;
}

export function calcDiscounts(
  items: DiscountItem[],
  bundleTiers: BundleTierLike[],
  unlockDeals: UnlockDealLike[] = [],
): DiscountBreakdown {
  let subtotal = 0;
  let flashSavings = 0;
  let bundleQty = 0;
  let bundleSubtotal = 0;
  let promoBaseSubtotal = 0;

  for (const item of items) {
    const isFlash = item.salePrice != null && item.salePrice < item.price;
    const effectivePrice = isFlash ? item.salePrice! : item.price;

    subtotal += effectivePrice * item.quantity;

    if (isFlash) {
      flashSavings += (item.price - item.salePrice!) * item.quantity;
    } else if (item.bundleEligible) {
      bundleQty += item.quantity;
      bundleSubtotal += item.price * item.quantity;
    } else if (!item.couponExcluded) {
      promoBaseSubtotal += item.price * item.quantity;
    }
  }

  // Find best bundle tier based on bundleEligible qty only
  const activeTiers = bundleTiers.filter(t => t.active !== false);
  const sorted = [...activeTiers].sort((a, b) => b.minQty - a.minQty);
  let bundlePct = 0;
  for (const tier of sorted) {
    if (bundleQty >= tier.minQty) { bundlePct = tier.discountPct / 100; break; }
  }

  const bundleDiscount = Math.round(bundleSubtotal * bundlePct * 100) / 100;

  // Unlock Deals: admin-configured "spend $X, get product Y at $Z" — a deal
  // item can't unlock itself, so eligibility checks the REST of the cart
  // (subtotal minus this item's own contribution) against the threshold.
  // Skips flash-sale items — that discount already wins, no stacking. Only
  // ONE Unlocked Deal may apply per order, and only for exactly ONE unit —
  // if several items each qualify for a different deal, the lowest sortOrder
  // wins (ties keep cart order, since Array.sort is stable); extra units of
  // the SAME winning product stay at full price too.
  const activeDeals = unlockDeals.filter(d => d.active !== false);
  let unlockDiscount = 0;
  const unlockApplied: Record<string, { qty: number; specialPrice: number }> = {};
  const qualifying: { item: DiscountItem; deal: UnlockDealLike }[] = [];
  for (const item of items) {
    const isFlash = item.salePrice != null && item.salePrice < item.price;
    if (isFlash || !item.productId) continue;
    const deal = activeDeals.find(d => d.productId === item.productId);
    if (!deal) continue;
    // Only the ONE unit that would actually be discounted is excluded from
    // the qualifying spend — extra units of this same product still count
    // (a customer buying 2 at $11.99 with nothing else should still qualify
    // off that 2nd unit, not get excluded entirely).
    const otherSubtotal = subtotal - item.price;
    if (otherSubtotal < deal.minSpend) continue;
    qualifying.push({ item, deal });
  }
  qualifying.sort((a, b) => (a.deal.sortOrder ?? 0) - (b.deal.sortOrder ?? 0));
  const winner = qualifying[0];
  if (winner) {
    const { item, deal } = winner;
    const qty = 1;
    const saved = Math.max(0, (item.price - deal.specialPrice) * qty);
    if (saved > 0) {
      unlockDiscount = Math.round(saved * 100) / 100;
      unlockApplied[item.productId!] = { qty, specialPrice: deal.specialPrice };
    }
  }

  return { subtotal, flashSavings, bundleQty, bundleSubtotal, bundlePct, bundleDiscount, promoBaseSubtotal, unlockDiscount, unlockApplied };
}


