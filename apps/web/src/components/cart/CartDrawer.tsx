"use client";

import { X, Trash2, Plus, Minus, Truck, ShoppingBag, ChevronRight, AlertCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useCartStore } from "@/store/cartStore";
import { formatCurrency, calcCartTotals, calcBundleDiscount, calcPointsEarned, MIN_ORDER } from "@/lib/utils";

// Cheap add-on suggestions to help reach the $20 minimum
const ADDONS = [
  { id: "p10", name: "Blue Moon Belgian White", price: 11.99, volume: "6-pack", emoji: "🍺" },
  { id: "p11", name: "Josh Cellars Cabernet", price: 14.99, volume: "750ml", emoji: "🍷" },
  { id: "p5", name: "Modelo Especial", price: 19.99, volume: "12-pack", emoji: "🍺" },
];

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, updateQuantity, removeItem, addItem, couponDiscount, giftCardAmount, rewardsPointsToRedeem } = useCartStore();

  const subtotal = items.reduce((acc, i) => acc + (i.product.salePrice ?? i.product.price) * i.quantity, 0);
  const totalQty = items.reduce((acc, i) => acc + i.quantity, 0);
  const bundleDiscount = calcBundleDiscount(totalQty, subtotal);
  const rewardsDiscount = rewardsPointsToRedeem >= 100 ? Math.floor(rewardsPointsToRedeem / 100) * 5 : 0;
  const { tax, total } = calcCartTotals(subtotal, couponDiscount + bundleDiscount, rewardsDiscount, giftCardAmount);
  const pointsEarned = calcPointsEarned(subtotal);

  const meetsMinimum = subtotal >= MIN_ORDER;
  const amountToMin = Math.max(0, MIN_ORDER - subtotal);
  const progressPct = Math.min(100, (subtotal / MIN_ORDER) * 100);

  // Suggest items not already in cart
  const suggestions = ADDONS.filter(a => !items.find(i => i.product.id === a.id)).slice(0, 2);

  return (
    <>
      {open && <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />}
      <div className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white shadow-2xl flex flex-col transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b bg-dark-900 text-white">
          <h2 className="font-heading text-lg font-bold">Your Cart ({items.length})</h2>
          <button onClick={onClose}><X size={22} /></button>
        </div>

        {/* Minimum order progress bar */}
        {items.length > 0 && (
          <div className={`px-5 py-3 border-b ${meetsMinimum ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
            {meetsMinimum ? (
              <div className="flex items-center gap-2 text-green-700 text-sm font-semibold">
                <Truck size={16} />
                <span>🎉 FREE Delivery · NO Tip Required · 10–30 Minutes</span>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span className="text-amber-700 flex items-center gap-1.5">
                    <AlertCircle size={13} /> Add <strong>{formatCurrency(amountToMin)}</strong> more for FREE delivery
                  </span>
                  <span className="text-gray-500">${subtotal.toFixed(2)} / $20</span>
                </div>
                <div className="bg-amber-200 rounded-full h-2">
                  <div className="bg-amber-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                </div>
                <p className="text-xs text-amber-700 font-semibold mt-1.5">
                  ⚠️ Minimum order is $20.00 · Delivery always FREE
                </p>
              </div>
            )}
          </div>
        )}

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400">
            <span className="text-5xl">🛒</span>
            <p>Your cart is empty</p>
            <Link href="/products" onClick={onClose} className="text-brand-600 hover:underline text-sm font-medium">Browse products →</Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Bundle deal notice */}
              {totalQty >= 2 && totalQty < 3 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700 font-medium">
                  Add 1 more bottle → <strong>10% off</strong> your order!
                </div>
              )}
              {totalQty >= 3 && totalQty < 6 && (
                <div className="bg-brand-50 border border-brand-200 rounded-lg px-3 py-2 text-xs text-brand-700 font-medium">
                  🎉 <strong>10% bundle discount</strong> applied! Add {6 - totalQty} more for 15% off.
                </div>
              )}
              {totalQty >= 6 && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700 font-medium">
                  🎉 <strong>15% bundle discount</strong> applied!
                </div>
              )}

              {items.map(({ product, quantity }) => (
                <div key={product.id} className="flex gap-3">
                  <div className="relative w-16 h-16 bg-gray-50 rounded-lg overflow-hidden shrink-0">
                    {product.imageUrl ? (
                      <Image src={product.imageUrl} alt={product.name} fill className="object-contain p-1" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">🍾</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold line-clamp-1">{product.name}</p>
                    <p className="text-xs text-gray-400">{product.volume}</p>
                    <p className="text-sm font-bold text-brand-600 mt-0.5">{formatCurrency((product.salePrice ?? product.price) * quantity)}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <button onClick={() => updateQuantity(product.id, quantity - 1)} className="w-6 h-6 rounded border flex items-center justify-center hover:bg-gray-100">
                        <Minus size={12} />
                      </button>
                      <span className="text-sm font-medium w-4 text-center">{quantity}</span>
                      <button onClick={() => updateQuantity(product.id, quantity + 1)} className="w-6 h-6 rounded border flex items-center justify-center hover:bg-gray-100">
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                  <button onClick={() => removeItem(product.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                </div>
              ))}

              {/* Add-on suggestions when below minimum */}
              {!meetsMinimum && suggestions.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1">
                    <ShoppingBag size={12} /> Add items to reach $20 minimum:
                  </p>
                  <div className="space-y-2">
                    {suggestions.map(item => (
                      <div key={item.id} className="flex items-center justify-between bg-white rounded-lg border px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{item.emoji}</span>
                          <div>
                            <p className="text-xs font-semibold">{item.name}</p>
                            <p className="text-xs text-gray-400">{item.volume} · {formatCurrency(item.price)}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => addItem({ id: item.id, name: item.name, price: item.price, salePrice: null, imageUrl: null, stockQty: 99, inStock: true, volume: item.volume } as any)}
                          className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-0.5">
                          Add <Plus size={12} />
                        </button>
                      </div>
                    ))}
                    <Link href="/products" onClick={onClose} className="flex items-center justify-center gap-1 text-xs text-gray-500 hover:text-brand-600 pt-1">
                      See all products <ChevronRight size={11} />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t px-5 py-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between font-semibold text-green-600">
                <span className="flex items-center gap-1"><Truck size={13} /> Delivery</span>
                <span>FREE</span>
              </div>
              {bundleDiscount > 0 && (
                <div className="flex justify-between text-blue-600 font-medium">
                  <span>Bundle discount</span>
                  <span>-{formatCurrency(bundleDiscount)}</span>
                </div>
              )}
              {couponDiscount > 0 && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Coupon</span>
                  <span>-{formatCurrency(couponDiscount)}</span>
                </div>
              )}
              {rewardsDiscount > 0 && (
                <div className="flex justify-between text-brand-600 font-medium">
                  <span>Rewards</span>
                  <span>-{formatCurrency(rewardsDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Tax (8.25%)</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2 border-t">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <p className="text-xs text-brand-600 text-center font-medium">
                🎁 You&apos;ll earn <strong>{pointsEarned} CS Points</strong> on this order!
              </p>

              {meetsMinimum ? (
                <Link href="/checkout" onClick={onClose}
                  className="block w-full text-center bg-brand-500 hover:bg-brand-600 text-white font-bold py-3.5 rounded-xl transition-colors mt-2">
                  Checkout — {formatCurrency(total)}
                </Link>
              ) : (
                <div className="space-y-2 mt-2">
                  <div className="w-full text-center bg-gray-200 text-gray-500 font-bold py-3.5 rounded-xl cursor-not-allowed text-sm">
                    Add {formatCurrency(amountToMin)} more to Continue
                  </div>
                  <Link href="/products" onClick={onClose}
                    className="block w-full text-center border-2 border-brand-500 text-brand-600 hover:bg-brand-50 font-bold py-3 rounded-xl transition-colors text-sm">
                    + Add More Items
                  </Link>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
