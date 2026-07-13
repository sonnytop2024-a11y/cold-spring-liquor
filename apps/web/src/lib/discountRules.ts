/**
 * Discount rules — one discount per item, no stacking:
 *   1. Flash Sale (salePrice < price)  → item uses salePrice, excluded from bundle & promo
 *   2. Bundle Eligible (!flash, bundleEligible=true) → item gets bundle %, excluded from promo
 *   3. Regular (no flash, not bundleEligible) → item eligible for promo code only
 */

export interface DiscountItem {
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
}

export function calcDiscounts(
  items: DiscountItem[],
  bundleTiers: BundleTierLike[],
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

  return { subtotal, flashSavings, bundleQty, bundleSubtotal, bundlePct, bundleDiscount, promoBaseSubtotal };
}


