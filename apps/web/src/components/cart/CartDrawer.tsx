"use client";

import { X, Trash2, Plus, Minus, Truck, ShoppingBag, ChevronRight, AlertCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { formatCurrency, calcCartTotals, calcPointsEarned, calcPointsValue, MIN_ORDER } from "@/lib/utils";
import { calcDiscounts } from "@/lib/discountRules";
import { categoryPlaceholder } from "@/lib/categoryPlaceholder";
import type { Product } from "@/types";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, updateQuantity, removeItem, addItem, couponCode, couponDiscount, giftCardAmount, rewardsPointsToRedeem, setRewardsRedeem } = useCartStore();
  const { user } = useAuthStore();

  // Going to checkout is a forward action — skip the drawer's own slide-out-right
  // close animation so it doesn't read as "going back" while the page pushes in.
  const [skipCloseAnim, setSkipCloseAnim] = useState(false);
  useEffect(() => {
    if (open) setSkipCloseAnim(false);
  }, [open]);

  const [bundleTiers, setBundleTiers] = useState<{ id: string; minQty: number; discountPct: number; active?: boolean }[]>([]);
  useEffect(() => {
    fetch("/api/deals/bundle-tiers").then(r => r.json()).then(setBundleTiers).catch(() => {});
  }, []);

  // Clear stale rewards if user no longer has enough points
  useEffect(() => {
    if (rewardsPointsToRedeem > 0 && (user?.points ?? 0) < rewardsPointsToRedeem) {
      setRewardsRedeem(0);
    }
  }, [user?.points, rewardsPointsToRedeem, setRewardsRedeem]);

  // Add body class so PayPal/Venmo iframes hide themselves when cart is open
  useEffect(() => {
    document.body.classList.toggle("cart-open", open);
    return () => document.body.classList.remove("cart-open");
  }, [open]);

  const { subtotal, flashSavings, bundleDiscount, bundleQty } = useMemo(() => calcDiscounts(
    items.map(i => ({ price: i.product.price, salePrice: i.product.salePrice, bundleEligible: i.product.bundleEligible, couponExcluded: i.product.couponExcluded, quantity: i.quantity })),
    bundleTiers,
  ), [items, bundleTiers]);
  const totalQty = items.reduce((acc, i) => acc + i.quantity, 0);
  const rewardsDiscount = calcPointsValue(rewardsPointsToRedeem);
  const { tax, total } = calcCartTotals(subtotal, couponDiscount + bundleDiscount, rewardsDiscount, giftCardAmount);
  const pointsEarned = calcPointsEarned(subtotal);

  const { data: storeCfg } = useQuery({
    queryKey: ["delivery-status"],
    queryFn: async () => {
      const r = await fetch("/api/delivery/status");
      if (!r.ok) throw new Error("status failed");
      return r.json() as Promise<{ minOrder: number; timeMin: number; timeMax: number; freeDelivery: boolean; noTipRequired: boolean }>;
    },
    refetchInterval: 10_000,
  });
  const minOrder = storeCfg?.minOrder ?? MIN_ORDER;
  const meetsMinimum = subtotal >= minOrder;
  const amountToMin = Math.max(0, minOrder - subtotal);
  const progressPct = Math.min(100, (subtotal / minOrder) * 100);

  // Cheap real in-stock products to help reach the minimum, not just the top-priced catalog page
  const { data: addonProducts } = useQuery({
    queryKey: ["cart-addon-suggestions"],
    enabled: !meetsMinimum,
    queryFn: async () => {
      const r = await fetch("/api/products?limit=100");
      if (!r.ok) throw new Error("products failed");
      const json = await r.json();
      return (json.products ?? []) as Product[];
    },
    staleTime: 60_000,
  });

  // Suggest cheapest real products not already in cart
  const suggestions = useMemo(() => {
    return [...(addonProducts ?? [])]
      .filter(p => p.inStock && !items.find(i => i.product.id === p.id))
      .sort((a, b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price))
      .slice(0, 2);
  }, [addonProducts, items]);

  return (
    <>
      {open && <div className="fixed inset-0 z-[9999] bg-black/40" onClick={onClose} />}
      <div className={`fixed top-0 right-0 z-[9999] h-full w-full max-w-md bg-white shadow-2xl flex flex-col ${skipCloseAnim ? "" : "transition-transform duration-300"} ${open ? "translate-x-0" : "translate-x-full"}`}>
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
                <span>🎉 {[storeCfg?.freeDelivery !== false && "FREE Delivery", storeCfg?.noTipRequired !== false && "NO Tip Required", `${storeCfg?.timeMin ?? 10}–${storeCfg?.timeMax ?? 30} Minutes`].filter(Boolean).join(" · ")}</span>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span className="text-amber-700 flex items-center gap-1.5">
                    <AlertCircle size={13} /> Add <strong>{formatCurrency(amountToMin)}</strong> more to get delivery to you
                  </span>
                  <span className="text-gray-500">${subtotal.toFixed(2)} / ${minOrder}</span>
                </div>
                <div className="bg-amber-200 rounded-full h-2">
                  <div className="bg-amber-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                </div>
                <p className="text-xs text-amber-700 font-semibold mt-1.5">
                  ⚠️ Minimum order is ${minOrder.toFixed(2)}{storeCfg?.freeDelivery !== false ? " · Delivery always FREE" : ""}
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
              {/* Bundle deal notice — only shows for bundleEligible items */}
              {bundleDiscount > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700 font-medium">
                  🎉 Bundle discount applied to {bundleQty} bundle-eligible bottle{bundleQty !== 1 ? "s" : ""}!
                </div>
              )}
              {flashSavings > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 font-medium">
                  ⚡ Flash Sale savings: -{formatCurrency(flashSavings)}
                </div>
              )}

              {items.map(({ product, quantity }) => (
                <div key={product.id} className="flex gap-3">
                  <Link href={`/products/${product.slug}`} onClick={onClose} className="relative w-16 h-16 bg-gray-50 rounded-lg overflow-hidden shrink-0">
                    <Image src={product.imageUrl || categoryPlaceholder(product.category)} alt={product.name} fill sizes="64px" className="object-contain p-1" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/products/${product.slug}`} onClick={onClose} className="flex items-center gap-1.5 flex-wrap hover:text-brand-600">
                      <p className="text-sm font-semibold line-clamp-1">{product.name}</p>
                      {product.pickupOnly && (
                        <span className="text-[9px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded font-bold shrink-0">PICKUP ONLY</span>
                      )}
                    </Link>
                    {product.couponExcluded && couponCode && (
                      <p className="text-[10px] text-gray-400 italic">Coupon not applicable</p>
                    )}
                    <p className="text-sm font-bold text-brand-600 mt-0.5">{formatCurrency((product.salePrice ?? product.price) * quantity)}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <button onClick={() => updateQuantity(product.id, quantity - 1)} className="w-6 h-6 rounded border flex items-center justify-center hover:bg-gray-100">
                        <Minus size={12} />
                      </button>
                      <span className="text-sm font-medium w-4 text-center">{quantity}</span>
                      <button onClick={() => updateQuantity(product.id, quantity + 1)} disabled={quantity >= product.stockQty}
                        className="w-6 h-6 rounded border flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent">
                        <Plus size={12} />
                      </button>
                    </div>
                    {quantity >= product.stockQty && (
                      <p className="text-[10px] text-amber-600 font-medium mt-0.5">Only {product.stockQty} left in stock</p>
                    )}
                  </div>
                  <button onClick={() => removeItem(product.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>

            {/* Add-on suggestions when below minimum — pinned above the totals so it's
                always fully visible, instead of getting scrolled out of view when the
                item list is long. */}
            {!meetsMinimum && suggestions.length > 0 && (
              <div className="px-5 pt-3 border-t bg-gray-50">
                <div className="bg-white border border-gray-200 rounded-xl p-3 mb-3">
                  <p className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1">
                    <ShoppingBag size={12} /> Add items to reach $20 minimum:
                  </p>
                  <div className="space-y-2">
                    {suggestions.map(item => (
                      <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded-lg border px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="relative w-9 h-9 bg-white rounded shrink-0 overflow-hidden">
                            <Image
                              src={item.imageUrl || categoryPlaceholder(item.category)}
                              alt={item.name}
                              fill
                              sizes="36px"
                              className="object-contain p-0.5"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold line-clamp-1">{item.name}</p>
                            <p className="text-xs text-gray-400">{item.volume} · {formatCurrency(item.salePrice ?? item.price)}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => addItem(item)}
                          className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-0.5 shrink-0">
                          Add <Plus size={12} />
                        </button>
                      </div>
                    ))}
                    <Link href="/products" onClick={onClose} className="flex items-center justify-center gap-1 text-xs text-gray-500 hover:text-brand-600 pt-1">
                      See all products <ChevronRight size={11} />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            <div className={`px-5 py-4 space-y-2 text-sm ${!meetsMinimum && suggestions.length > 0 ? "" : "border-t"}`}>
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
                <Link href="/checkout" onClick={() => { setSkipCloseAnim(true); onClose(); }}
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
