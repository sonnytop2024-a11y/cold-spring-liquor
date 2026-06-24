"use client";

import { useCartStore } from "@/store/cartStore";
import { formatCurrency, calcCartTotals } from "@/lib/utils";

export function OrderSummary() {
  const { items } = useCartStore();

  const subtotal = items.reduce(
    (acc, i) => acc + (i.product.salePrice ?? i.product.price) * i.quantity,
    0,
  );
  const { deliveryFee, tax, total } = calcCartTotals(subtotal);

  return (
    <div className="bg-white border rounded-xl p-5 sticky top-24">
      <h3 className="font-bold text-lg mb-4">Order Summary</h3>

      <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
        {items.map(({ product, quantity }) => (
          <div key={product.id} className="flex items-center gap-3 text-sm">
            <span className="bg-brand-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shrink-0 font-bold">
              {quantity}
            </span>
            <span className="flex-1 truncate text-gray-700">{product.name}</span>
            <span className="font-medium shrink-0">
              {formatCurrency((product.salePrice ?? product.price) * quantity)}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t pt-3 space-y-2 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-green-600 font-medium">
          <span>Delivery</span>
          <span>{deliveryFee === 0 ? "FREE 🚚" : formatCurrency(deliveryFee)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Tax (8.25%)</span>
          <span>{formatCurrency(tax)}</span>
        </div>
        <div className="flex justify-between text-green-600 text-xs">
          <span>Driver Tip</span>
          <span>NOT REQUIRED ✓</span>
        </div>
        <div className="border-t pt-2 flex justify-between font-bold text-base">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}
