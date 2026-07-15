"use client";

import Image from "next/image";
import Link from "next/link";
import { Trash2, Plus, Minus, Tag, Gift, Star, Truck } from "lucide-react";
import { useState, useEffect } from "react";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import {
  formatCurrency,
  calcCartTotals,
  calcPointsEarned,
  calcPointsValue,
  MIN_ORDER,
} from "@/lib/utils";
import { calcDiscounts } from "@/lib/discountRules";

export function CartView() {
  const {
    items, updateQuantity, removeItem,
    setCoupon, setGiftCard, setRewardsRedeem,
    couponCode, couponDiscount, giftCardCode, giftCardAmount, rewardsPointsToRedeem,
  } = useCartStore();
  const { user, isLoggedIn } = useAuthStore();
  const userPoints = user?.points ?? 0;

  const [couponInput, setCouponInput] = useState(couponCode ?? "");
  const [giftInput, setGiftInput] = useState(giftCardCode ?? "");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [bundleTiers, setBundleTiers] = useState<{ id: string; minQty: number; discountPct: number; active?: boolean }[]>([]);
  useEffect(() => {
    fetch("/api/deals/bundle-tiers").then(r => r.json()).then(setBundleTiers).catch(() => {});
  }, []);

  const { subtotal, flashSavings, bundleDiscount, bundleQty, promoBaseSubtotal } = calcDiscounts(
    items.map(i => ({ price: i.product.price, salePrice: i.product.salePrice, bundleEligible: i.product.bundleEligible, couponExcluded: i.product.couponExcluded, quantity: i.quantity })),
    bundleTiers,
  );
  const totalQty = items.reduce((acc, i) => acc + i.quantity, 0);
  const rewardsDiscount = calcPointsValue(rewardsPointsToRedeem);
  const { tax, total, appliedGiftCard } = calcCartTotals(
    subtotal, couponDiscount + bundleDiscount, rewardsDiscount, giftCardAmount,
  );
  const pointsEarned = calcPointsEarned(total);

  async function applyCoupon() {
    setApplyingCoupon(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput, subtotal: promoBaseSubtotal }),
      });
      if (res.ok) {
        const { discount, message } = await res.json();
        setCoupon(couponInput, discount);
        const hasExcluded = flashSavings > 0 || bundleDiscount > 0;
        if (hasExcluded) alert(message + " (applies to regular-priced items only)");
      } else {
        const json = await res.json().catch(() => ({}));
        setCoupon(null, 0);
        alert(json.error ?? "Invalid or expired coupon code.");
      }
    } catch {
      // If API not ready, check for WELCOME10
      if (couponInput === "WELCOME10" && promoBaseSubtotal >= 50) {
        setCoupon(couponInput, 10);
      } else {
        alert("Invalid coupon code.");
      }
    } finally {
      setApplyingCoupon(false);
    }
  }

  async function applyGiftCard() {
    try {
      const res = await fetch("/api/gift-cards/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: giftInput }),
      });
      if (res.ok) {
        const { balance } = await res.json();
        // Cap to pre-gift-card total so card isn't over-charged
        const preGiftTotal = Math.max(0, subtotal - couponDiscount - bundleDiscount - rewardsDiscount + tax);
        const appliedAmount = Math.min(balance, preGiftTotal);
        setGiftCard(giftInput, Math.round(appliedAmount * 100) / 100);
      } else {
        alert("Invalid or empty gift card.");
      }
    } catch {
      alert("Could not validate gift card.");
    }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-24">
        <p className="text-6xl mb-4">🛒</p>
        <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
        <Link href="/products" className="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-8 py-3 rounded-xl transition-colors inline-block mt-4">
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Items */}
      <div className="lg:col-span-2 space-y-4">
        {/* FREE delivery banner */}
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
          <Truck size={20} className="text-green-600 shrink-0" />
          <div>
            <p className="font-bold text-green-700">FREE Delivery — NO Tip Required</p>
            <p className="text-xs text-green-600">
              All orders to Leander, Cedar Park & Liberty Hill within 10 miles
            </p>
          </div>
        </div>

        {/* Bundle deal notice — only bundleEligible products qualify */}
        {bundleDiscount > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-sm text-purple-700 font-medium">
            📦 Bundle discount applied to {bundleQty} bundle-eligible bottle{bundleQty !== 1 ? "s" : ""}!
          </div>
        )}
        {flashSavings > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 font-medium">
            ⚡ Flash Sale savings: -{formatCurrency(flashSavings)}
          </div>
        )}

        {items.map(({ product, quantity }) => (
          <div key={product.id} className="flex gap-4 bg-white border rounded-xl p-4">
            <div className="relative w-20 h-20 bg-gray-50 rounded-lg overflow-hidden shrink-0">
              {product.imageUrl ? (
                <Image src={product.imageUrl} alt={product.name} fill className="object-contain p-2" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">🍾</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link href={`/products/${product.slug}`} className="font-semibold hover:text-brand-600 line-clamp-2">
                  {product.name}
                </Link>
                {product.pickupOnly && (
                  <span className="text-[9px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded font-bold shrink-0">PICKUP ONLY</span>
                )}
              </div>
              <p className="text-sm text-gray-500">{product.brand} · {product.volume}</p>
              {product.couponExcluded && couponCode && (
                <p className="text-[11px] text-gray-400 italic">Coupon not applicable</p>
              )}
              <p className="font-bold text-brand-600 mt-1">
                {formatCurrency((product.salePrice ?? product.price) * quantity)}
              </p>
            </div>
            <div className="flex flex-col items-end justify-between shrink-0">
              <button onClick={() => removeItem(product.id)} className="text-gray-400 hover:text-red-500">
                <Trash2 size={16} />
              </button>
              <div className="flex items-center border rounded-lg overflow-hidden">
                <button onClick={() => updateQuantity(product.id, quantity - 1)} className="px-2 py-1.5 hover:bg-gray-50">
                  <Minus size={14} />
                </button>
                <span className="px-3 text-sm font-semibold">{quantity}</span>
                <button onClick={() => updateQuantity(product.id, quantity + 1)} disabled={quantity >= product.stockQty}
                  className="px-2 py-1.5 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent">
                  <Plus size={14} />
                </button>
              </div>
              {quantity >= product.stockQty && (
                <p className="text-[10px] text-amber-600 font-medium">Only {product.stockQty} left</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="space-y-4">
        {/* Coupon */}
        <div className="bg-white border rounded-xl p-4">
          <p className="font-semibold mb-3 flex items-center gap-2 text-sm">
            <Tag size={15} className="text-brand-500" /> Coupon Code
          </p>
          <div className="flex gap-2">
            <input
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
              placeholder="e.g. WELCOME10"
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              onClick={applyCoupon}
              disabled={applyingCoupon}
              className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-lg"
            >
              Apply
            </button>
          </div>
          {couponDiscount > 0 && (
            <p className="text-xs text-green-600 font-medium mt-1.5">
              ✓ Coupon applied — saving {formatCurrency(couponDiscount)}
            </p>
          )}
        </div>

        {/* Gift Card */}
        <div className="bg-white border rounded-xl p-4">
          <p className="font-semibold mb-3 flex items-center gap-2 text-sm">
            <Gift size={15} className="text-brand-500" /> Gift Card
          </p>
          <div className="flex gap-2">
            <input
              value={giftInput}
              onChange={(e) => setGiftInput(e.target.value.toUpperCase())}
              placeholder="Gift card code"
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              onClick={applyGiftCard}
              className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-lg"
            >
              Apply
            </button>
          </div>
          {giftCardAmount > 0 && (
            <p className="text-xs text-green-600 font-medium mt-1.5">
              ✓ Gift card balance: {formatCurrency(giftCardAmount)}
            </p>
          )}
        </div>

        {/* CS Rewards redeem — only show if logged in with redeemable points */}
        {isLoggedIn && userPoints >= 250 && (
          <div className="bg-white border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold flex items-center gap-2 text-sm">
                <Star size={15} className="text-brand-500" /> CS Rewards Points
              </p>
              <span className="text-xs text-gray-500 font-medium">{userPoints.toLocaleString()} pts available</span>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => setRewardsRedeem(0)}
                className={`w-full text-left text-xs px-3 py-2 rounded-lg border transition-colors ${
                  rewardsPointsToRedeem === 0 ? "bg-brand-500 text-white border-brand-500" : "hover:bg-gray-50"
                }`}
              >
                Don&apos;t use points
              </button>
              {([250, 500, 1000] as const).filter(pts => userPoints >= pts).map((pts) => (
                <button
                  key={pts}
                  onClick={() => setRewardsRedeem(pts)}
                  className={`w-full text-left text-xs px-3 py-2 rounded-lg border transition-colors ${
                    rewardsPointsToRedeem === pts ? "bg-brand-500 text-white border-brand-500" : "hover:bg-gray-50"
                  }`}
                >
                  {pts} Points = {formatCurrency(calcPointsValue(pts))} Off
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Order Total */}
        <div className="bg-white border rounded-xl p-4 space-y-2.5">
          <h3 className="font-bold text-lg">Order Summary</h3>
          <div className="text-sm space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal ({totalQty} items)</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {bundleDiscount > 0 && (
              <div className="flex justify-between text-purple-600 font-medium">
                <span>📦 Bundle discount</span>
                <span>-{formatCurrency(bundleDiscount)}</span>
              </div>
            )}
            {flashSavings > 0 && (
              <div className="flex justify-between text-red-600 font-medium">
                <span>⚡ Flash Sale savings</span>
                <span>-{formatCurrency(flashSavings)}</span>
              </div>
            )}
            {couponDiscount > 0 && (
              <div className="flex justify-between text-green-600 font-medium">
                <span>Coupon ({couponCode})</span>
                <span>-{formatCurrency(couponDiscount)}</span>
              </div>
            )}
            {rewardsDiscount > 0 && (
              <div className="flex justify-between text-purple-600 font-medium">
                <span>Rewards ({rewardsPointsToRedeem} pts)</span>
                <span>-{formatCurrency(rewardsDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-green-600 font-bold">
              <span>🚚 Delivery</span>
              <span>FREE</span>
            </div>
            <div className="flex justify-between text-green-600 font-bold">
              <span>💰 Tip</span>
              <span>NOT Required</span>
            </div>
            {appliedGiftCard > 0 && (
              <div className="flex justify-between text-green-600 font-medium">
                <span>Gift card</span>
                <span>-{formatCurrency(appliedGiftCard)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Tax (8.25%)</span>
              <span>{formatCurrency(tax)}</span>
            </div>
          </div>
          <div className="border-t pt-2.5 flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
          <p className="text-xs text-center text-brand-600 font-medium">
            🎁 Earn <strong>{pointsEarned} CS Points</strong> on this order
          </p>
          <Link
            href="/checkout"
            className="block w-full text-center bg-brand-500 hover:bg-brand-600 text-white font-bold py-3.5 rounded-xl transition-colors"
          >
            Proceed to Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}
