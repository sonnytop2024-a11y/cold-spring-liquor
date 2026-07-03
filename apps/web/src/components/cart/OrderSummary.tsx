"use client";

import { useEffect, useState } from "react";
import { useCartStore } from "@/store/cartStore";
import { useCheckoutStore } from "@/store/checkoutStore";
import { calcDiscounts } from "@/lib/discountRules";
import { formatCurrency, calcPointsValue } from "@/lib/utils";
import { calcPickupDiscount, PICKUP_DISCOUNT_LABEL } from "@/lib/pickupWindows";

const TAX_RATE = 0.0825;

interface BundleTier {
  id: string; minQty: number; discountPct: number; label: string; sortOrder: number; active?: boolean;
}

export function OrderSummary({ mode = "delivery" }: { mode?: "delivery" | "pickup" } = {}) {
  const isPickup = mode === "pickup";
  const { items, rewardsPointsToRedeem, giftCardCode, giftCardAmount } = useCartStore();
  const { promoCode, promoDiscount } = useCheckoutStore();
  const [bundleTiers, setBundleTiers] = useState<BundleTier[]>([]);

  useEffect(() => {
    fetch("/api/deals/bundle-tiers")
      .then(r => r.json())
      .then(setBundleTiers)
      .catch(() => {});
  }, []);

  const totalQty = items.reduce((a, i) => a + i.quantity, 0);
  const { subtotal, flashSavings, bundlePct, bundleDiscount } = calcDiscounts(
    items.map(i => ({ price: i.product.price, salePrice: i.product.salePrice, bundleEligible: i.product.bundleEligible, quantity: i.quantity })),
    bundleTiers,
  );
  const rewardsDiscount = calcPointsValue(rewardsPointsToRedeem);
  // Pick Up In Store: automatic discount, tax on the discounted subtotal
  const pickupDiscount = isPickup ? calcPickupDiscount(subtotal) : 0;
  const tax = (subtotal - pickupDiscount) * TAX_RATE;
  const total = Math.max(0, subtotal - bundleDiscount - promoDiscount - rewardsDiscount - giftCardAmount - pickupDiscount + tax);
  const totalSavings = flashSavings + bundleDiscount + promoDiscount + rewardsDiscount + giftCardAmount + pickupDiscount;
  const pointsEarned = Math.floor(total);

  return (
    <div className="sticky top-20 bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base text-gray-800">Order Summary</h3>
          <span className="text-xs font-bold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
            {totalQty} {totalQty === 1 ? "item" : "items"}
          </span>
        </div>

        {/* Items */}
        <div className="space-y-3 mb-4 max-h-56 overflow-y-auto pr-1">
          {items.map(({ product, quantity }) => {
            const effectivePrice = product.salePrice ?? product.price;
            const hasFlash = product.salePrice != null && product.salePrice < product.price;
            return (
              <div key={product.id} className="flex items-start gap-3">
                <span className="w-5 h-5 bg-brand-500 rounded-full text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{quantity}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-700 text-xs leading-snug line-clamp-2">{product.name}</p>
                  {hasFlash && <span className="text-[10px] text-red-600 font-bold">⚡ Flash Deal</span>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-gray-900 text-sm font-medium">{formatCurrency(effectivePrice * quantity)}</p>
                  {hasFlash && <p className="text-xs text-gray-400 line-through">{formatCurrency(product.price * quantity)}</p>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 mb-4" />

        {/* Totals */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
          {flashSavings > 0 && <div className="flex justify-between text-red-600 font-medium"><span>⚡ Flash Deal savings</span><span>-{formatCurrency(flashSavings)}</span></div>}
          {bundleDiscount > 0 && <div className="flex justify-between text-purple-600 font-medium"><span>📦 Bundle ({Math.round(bundlePct * 100)}%)</span><span>-{formatCurrency(bundleDiscount)}</span></div>}
          {promoDiscount > 0 && <div className="flex justify-between text-green-600 font-medium"><span>🏷️ {promoCode}</span><span>-{formatCurrency(promoDiscount)}</span></div>}
          {rewardsDiscount > 0 && <div className="flex justify-between text-purple-600 font-medium"><span>🏆 Rewards</span><span>-{formatCurrency(rewardsDiscount)}</span></div>}
          {giftCardAmount > 0 && <div className="flex justify-between text-green-600 font-medium"><span>🎁 Gift Card ({giftCardCode})</span><span>-{formatCurrency(giftCardAmount)}</span></div>}
          {isPickup ? (
            <div className="flex justify-between text-green-600 font-bold"><span>Pick Up Discount ({PICKUP_DISCOUNT_LABEL})</span><span>-{formatCurrency(pickupDiscount)}</span></div>
          ) : (
            <>
              <div className="flex justify-between text-green-600 font-medium"><span>🚚 Delivery</span><span>FREE</span></div>
              <div className="flex justify-between text-green-600 font-medium"><span>💰 Driver Tip</span><span>NOT Required ✓</span></div>
            </>
          )}
          <div className="flex justify-between text-gray-500"><span>Tax (8.25%)</span><span>{formatCurrency(tax)}</span></div>
        </div>

        {/* Total */}
        <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between items-baseline">
          <span className="font-bold text-gray-800">Total</span>
          <span className="font-black text-xl text-gray-900">{formatCurrency(total)}</span>
        </div>

        {isPickup && (
          <div className="mt-3 flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-3.5 py-2.5">
            <span className="text-xl leading-none">🏬</span>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">Pick Up In Store</p>
              <p className="text-xs font-bold text-brand-600">Save {PICKUP_DISCOUNT_LABEL} on your order!</p>
            </div>
          </div>
        )}

        {totalSavings > 0 && (
          <div className="mt-3 bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-center">
            <p className="text-xs text-green-700 font-semibold">You save {formatCurrency(totalSavings)} on this order!</p>
          </div>
        )}

        <p className="text-xs text-center mt-3 font-medium text-brand-600">
          🏆 You&apos;ll earn <strong>{pointsEarned} CS Points</strong> on this order
        </p>

      </div>
    </div>
  );
}
