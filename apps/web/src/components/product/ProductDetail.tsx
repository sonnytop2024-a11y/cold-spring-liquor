"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useState, useCallback } from "react";
import { ShoppingCart, Zap, Star, Gift, Minus, Plus } from "lucide-react";
import { fetchProductBySlug } from "@/lib/api/products";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { formatCurrency } from "@/lib/utils";

function useBtnPop(): [boolean, () => void] {
  const [popping, setPopping] = useState(false);
  const trigger = useCallback(() => {
    setPopping(true);
    setTimeout(() => setPopping(false), 420);
  }, []);
  return [popping, trigger];
}

export function ProductDetail({ slug }: { slug: string }) {
  const [qty, setQty] = useState(1);
  const [cartPop, triggerCart] = useBtnPop();
  const [buyPop, triggerBuy] = useBtnPop();
  const [imgError, setImgError] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const { user, isLoggedIn } = useAuthStore();

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => fetchProductBySlug(slug),
  });

  // Check active flash deals — if this product has one, use its salePrice
  const { data: flashDeals } = useQuery({
    queryKey: ["flash-deals"],
    queryFn: () => fetch("/api/deals/flash").then(r => r.ok ? r.json() : []),
    staleTime: 60_000,
  });
  const flashDeal = product && Array.isArray(flashDeals)
    ? flashDeals.find((d: { slug: string; salePrice: number }) => d.slug === product.slug)
    : null;
  const effectiveProduct = flashDeal
    ? { ...product!, salePrice: flashDeal.salePrice }
    : product;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-pulse">
        <div className="bg-gray-100 rounded-2xl h-[480px]" />
        <div className="space-y-4">
          <div className="h-6 bg-gray-100 rounded w-1/3" />
          <div className="h-10 bg-gray-100 rounded w-2/3" />
          <div className="h-4 bg-gray-100 rounded w-1/4" />
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return <div className="text-center py-20 text-gray-500">Product not found.</div>;
  }

  const discountPct = effectiveProduct!.salePrice
    ? Math.round(((effectiveProduct!.price - effectiveProduct!.salePrice) / effectiveProduct!.price) * 100)
    : 0;

  // Reward / promo info for the bottom badge
  const hasPoints = isLoggedIn && user && user.points > 0;
  const rewardLine = hasPoints
    ? `You have ${user!.points.toLocaleString()} reward points · Use at checkout`
    : "Promo codes & rewards available at checkout";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
      {/* Image */}
      <div className="relative">
        <div className="bg-gray-50 rounded-2xl overflow-hidden aspect-square flex items-center justify-center relative">
          {product.imageUrl && !imgError ? (
            <>
              <Image
                src={product.imageUrl}
                alt={product.name}
                width={480}
                height={480}
                className="object-cover rounded-2xl w-full h-full"
                onError={() => setImgError(true)}
              />
              {/* Decorative champagne bottle — bottom-right corner, subtle watermark */}
              <div className="absolute bottom-3 right-3 opacity-10 pointer-events-none select-none hidden sm:block">
                <svg width="56" height="120" viewBox="0 0 46 96" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="17" y="1" width="12" height="12" rx="3" fill="#b8962e"/>
                  <rect x="19" y="13" width="8" height="28" rx="2" fill="#1a4a2e"/>
                  <path d="M19 41 Q10 50 9 58 L37 58 Q36 50 27 41 Z" fill="#1a4a2e"/>
                  <rect x="9" y="58" width="28" height="34" rx="4" fill="#1a4a2e"/>
                  <rect x="9" y="90" width="28" height="3" rx="1.5" fill="#0d2518"/>
                </svg>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center relative overflow-hidden rounded-2xl"
              style={{ background: "linear-gradient(160deg,#061a0e,#0d2f1a,#0a2214)" }}>
              {/* gold glow */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 rounded-full"
                  style={{ background: "radial-gradient(circle, rgba(212,175,55,0.18) 0%, transparent 70%)" }} />
              </div>
              {/* shimmer */}
              <div className="absolute inset-0 pointer-events-none animate-shimmer"
                style={{ background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.07) 50%, transparent 60%)" }} />
              {/* champagne bottle — larger for detail page */}
              <div className="relative z-10 animate-bottle-float">
                <svg width="90" height="190" viewBox="0 0 46 96" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="17" y="1" width="12" height="12" rx="3" fill="#b8962e"/>
                  <rect x="17" y="1" width="5" height="12" rx="1.5" fill="#d4af37" opacity="0.7"/>
                  <line x1="17" y1="4" x2="29" y2="4" stroke="#d4af37" strokeWidth="0.8" opacity="0.9"/>
                  <line x1="17" y1="7" x2="29" y2="7" stroke="#d4af37" strokeWidth="0.8" opacity="0.7"/>
                  <line x1="17" y1="10" x2="29" y2="10" stroke="#d4af37" strokeWidth="0.6" opacity="0.5"/>
                  <line x1="20" y1="1" x2="20" y2="13" stroke="#d4af37" strokeWidth="0.6" opacity="0.6"/>
                  <line x1="23" y1="1" x2="23" y2="13" stroke="#d4af37" strokeWidth="0.6" opacity="0.6"/>
                  <line x1="26" y1="1" x2="26" y2="13" stroke="#d4af37" strokeWidth="0.6" opacity="0.6"/>
                  <rect x="19" y="13" width="8" height="28" rx="2" fill="#1a4a2e"/>
                  <rect x="19" y="13" width="3" height="28" rx="1" fill="white" opacity="0.08"/>
                  <path d="M19 41 Q10 50 9 58 L37 58 Q36 50 27 41 Z" fill="#1a4a2e"/>
                  <path d="M19 41 Q13 46 12 53 L16 53 Q17 47 21 43 Z" fill="white" opacity="0.07"/>
                  <rect x="9" y="58" width="28" height="34" rx="4" fill="#1a4a2e"/>
                  <rect x="12" y="63" width="22" height="22" rx="2" fill="#f5f0dc" opacity="0.95"/>
                  <rect x="12" y="63" width="22" height="4" rx="1.5" fill="#d4af37" opacity="0.9"/>
                  <rect x="15" y="70" width="16" height="1.5" rx="0.75" fill="#5a3e00" opacity="0.5"/>
                  <rect x="17" y="73" width="12" height="1.5" rx="0.75" fill="#5a3e00" opacity="0.4"/>
                  <rect x="15" y="76" width="16" height="1" rx="0.5" fill="#5a3e00" opacity="0.3"/>
                  <rect x="17" y="79" width="12" height="1" rx="0.5" fill="#5a3e00" opacity="0.25"/>
                  <rect x="10" y="58" width="3" height="34" rx="1.5" fill="white" opacity="0.09"/>
                  <rect x="9" y="90" width="28" height="3" rx="1.5" fill="#0d2518"/>
                  <circle cx="22" cy="68" r="1" fill="white" opacity="0.15"/>
                  <circle cx="28" cy="74" r="0.8" fill="white" opacity="0.12"/>
                  <circle cx="19" cy="79" r="0.7" fill="white" opacity="0.1"/>
                </svg>
              </div>
              <span className="absolute bottom-3 right-3 text-white font-bold rounded-full z-10"
                style={{ background: "rgba(180,140,30,0.92)", fontSize: "10px", padding: "4px 10px", letterSpacing: "0.5px" }}>
                PHOTO SOON
              </span>
            </div>
          )}
        </div>
        {discountPct > 0 && (
          <span className="absolute top-4 left-4 bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">
            -{discountPct}% OFF
          </span>
        )}
      </div>

      {/* Info */}
      <div className="relative">
        {/* Decorative champagne bottle — top-right of info panel */}
        <div className="absolute -top-2 right-0 opacity-[0.06] pointer-events-none select-none hidden lg:block">
          <svg width="80" height="170" viewBox="0 0 46 96" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="17" y="1" width="12" height="12" rx="3" fill="#b8962e"/>
            <rect x="17" y="1" width="5" height="12" rx="1.5" fill="#d4af37" opacity="0.7"/>
            <line x1="17" y1="4" x2="29" y2="4" stroke="#d4af37" strokeWidth="0.8" opacity="0.9"/>
            <line x1="17" y1="7" x2="29" y2="7" stroke="#d4af37" strokeWidth="0.8" opacity="0.7"/>
            <rect x="19" y="13" width="8" height="28" rx="2" fill="#1a3a22"/>
            <rect x="19" y="13" width="3" height="28" rx="1" fill="white" opacity="0.08"/>
            <path d="M19 41 Q10 50 9 58 L37 58 Q36 50 27 41 Z" fill="#1a3a22"/>
            <rect x="9" y="58" width="28" height="34" rx="4" fill="#1a3a22"/>
            <rect x="12" y="63" width="22" height="22" rx="2" fill="#f5f0dc" opacity="0.9"/>
            <rect x="12" y="63" width="22" height="4" rx="1.5" fill="#d4af37" opacity="0.9"/>
            <rect x="9" y="90" width="28" height="3" rx="1.5" fill="#0a1f10"/>
          </svg>
        </div>

        <p className="text-sm font-medium text-brand-600 uppercase tracking-wide mb-1">
          {product.category} · {product.brand}
        </p>
        <h1 className="font-display text-3xl font-bold mb-3">{product.name}</h1>

        {(product.rating ?? 0) > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  className={
                    i < Math.round(product.rating ?? 0)
                      ? "fill-amber-400 text-amber-400"
                      : "text-gray-200"
                  }
                />
              ))}
            </div>
            <span className="text-sm text-gray-600">
              {(product.rating ?? 0).toFixed(1)} ({product.reviewCount ?? 0} reviews)
            </span>
          </div>
        )}

        <div className="flex items-baseline gap-3 mb-2">
          <span className="text-4xl font-bold">
            {formatCurrency(effectiveProduct!.salePrice ?? effectiveProduct!.price)}
          </span>
          {effectiveProduct!.salePrice && (
            <span className="text-xl text-gray-400 line-through">
              {formatCurrency(effectiveProduct!.price)}
            </span>
          )}
        </div>

        {/* Pills: abv only */}
        <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-6">
          {product.abv > 0 && (
            <span className="bg-gray-100 px-3 py-1 rounded-full">{product.abv}% ABV</span>
          )}
          {!product.inStock && (
            <span className="px-3 py-1 rounded-full font-medium bg-red-100 text-red-600">
              Out of Stock
            </span>
          )}
        </div>

        {product.description && (
          <p className="text-gray-600 leading-relaxed mb-6">{product.description}</p>
        )}

        {product.inStock && (
          <>
            {/* Quantity */}
            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm font-medium text-gray-700">Quantity</span>
              <div className="flex items-center border rounded-lg overflow-hidden">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="px-3 py-2 hover:bg-gray-50 transition-colors"
                >
                  <Minus size={16} />
                </button>
                <span className="px-4 py-2 font-semibold min-w-[3rem] text-center">
                  {qty}
                </span>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="px-3 py-2 hover:bg-gray-50 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => { triggerCart(); addItem(effectiveProduct!, qty); }}
                className={`flex-1 flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-6 py-3.5 rounded-xl transition-all ${cartPop ? "scale-95 shadow-[0_0_20px_4px_rgba(249,115,22,0.45)]" : "shadow-none"}`}
                style={{ transition: "transform 0.15s cubic-bezier(.36,.07,.19,.97), box-shadow 0.25s ease" }}
              >
                <ShoppingCart size={18} className={cartPop ? "animate-bounce" : ""} />
                Add to Cart
              </button>
              <button
                onClick={() => { triggerBuy(); addItem(effectiveProduct!, qty); window.location.href = "/checkout"; }}
                className={`flex-1 flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold px-6 py-3.5 rounded-xl transition-all ${buyPop ? "scale-95 shadow-[0_0_20px_4px_rgba(255,255,255,0.18)]" : "shadow-none"}`}
                style={{ transition: "transform 0.15s cubic-bezier(.36,.07,.19,.97), box-shadow 0.25s ease" }}
              >
                <Zap size={18} className={buyPop ? "animate-pulse" : ""} />
                Buy Now
              </button>
            </div>
          </>
        )}

        {/* Reward / promo badge — replaces old delivery info */}
        <div className="mt-6 flex items-center gap-3 bg-brand-50 rounded-xl p-4">
          <Gift size={20} className="text-brand-600 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-brand-700">10–30 Minute Delivery</p>
            <p className="text-brand-600">{rewardLine}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
