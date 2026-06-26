"use client";

import { useEffect, useState } from "react";
import { useCartStore } from "@/store/cartStore";
import { formatCurrency } from "@/lib/utils";

const TAX_RATE = 0.0825;

interface BundleTier {
  id: string; minQty: number; discountPct: number; label: string; sortOrder: number;
}

function calcBundlePct(totalQty: number, tiers: BundleTier[]): number {
  const sorted = [...tiers].sort((a, b) => b.minQty - a.minQty);
  for (const t of sorted) {
    if (totalQty >= t.minQty) return t.discountPct / 100;
  }
  return 0;
}

export function OrderSummary() {
  const { items } = useCartStore();
  const [bundleTiers, setBundleTiers] = useState<BundleTier[]>([]);

  useEffect(() => {
    fetch("/api/deals/bundle-tiers")
      .then(r => r.json())
      .then(setBundleTiers)
      .catch(() => {});
  }, []);

  const totalQty = items.reduce((a, i) => a + i.quantity, 0);

  // Flash sale savings per item
  const flashSavings = items.reduce((a, i) => {
    if (i.product.salePrice != null && i.product.salePrice < i.product.price) {
      return a + (i.product.price - i.product.salePrice) * i.quantity;
    }
    return a;
  }, 0);

  // Subtotal at effective (sale or regular) prices
  const subtotal = items.reduce(
    (a, i) => a + (i.product.salePrice ?? i.product.price) * i.quantity,
    0,
  );

  const bundlePct = calcBundlePct(totalQty, bundleTiers);
  const bundleDiscount = subtotal * bundlePct;
  const tax = subtotal * TAX_RATE;
  const total = subtotal - bundleDiscount + tax;

  return (
    <div className="bg-white border rounded-xl p-5 sticky top-24">
      <h3 className="font-bold text-lg mb-4">Order Summary</h3>

      {/* Item list */}
      <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
        {items.map(({ product, quantity }) => {
          const effectivePrice = product.salePrice ?? product.price;
          const hasFlash = product.salePrice != null && product.salePrice < product.price;
          return (
            <div key={product.id} className="flex items-start gap-3 text-sm">
              <span className="bg-brand-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shrink-0 font-bold mt-0.5">
                {quantity}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-gray-700 line-clamp-2">{product.name}</span>
                {hasFlash && (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full mt-0.5">
                    ⚡ Flash Sale
                  </span>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="font-medium">{formatCurrency(effectivePrice * quantity)}</p>
                {hasFlash && (
                  <p className="text-xs text-gray-400 line-through">{formatCurrency(product.price * quantity)}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Totals */}
      <div className="border-t pt-3 space-y-2 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal ({totalQty} {totalQty === 1 ? "item" : "items"})</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>

        {flashSavings > 0 && (
          <div className="flex justify-between text-red-500 font-medium">
            <span>⚡ Flash Sale savings</span>
            <span>-{formatCurrency(flashSavings)}</span>
          </div>
        )}

        {bundleDiscount > 0 && (
          <div className="flex justify-between text-purple-600 font-medium">
            <span>📦 Bundle discount ({Math.round(bundlePct * 100)}%)</span>
            <span>-{formatCurrency(bundleDiscount)}</span>
          </div>
        )}

        <div className="flex justify-between text-green-600 font-medium">
          <span>🚚 Delivery</span>
          <span>FREE</span>
        </div>
        <div className="flex justify-between text-green-600 font-medium">
          <span>💰 Driver Tip</span>
          <span>NOT REQUIRED ✓</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Tax (8.25%)</span>
          <span>{formatCurrency(tax)}</span>
        </div>

        <div className="border-t pt-2 flex justify-between font-bold text-base">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>

        {(flashSavings > 0 || bundleDiscount > 0) && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-center">
            <p className="text-xs text-green-700 font-semibold">
              You save {formatCurrency(flashSavings + bundleDiscount)} on this order!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
