"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useState } from "react";
import { ShoppingCart, Zap, Star, Gift, Minus, Plus } from "lucide-react";
import { fetchProductBySlug } from "@/lib/api/products";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { formatCurrency } from "@/lib/utils";

export function ProductDetail({ slug }: { slug: string }) {
  const [qty, setQty] = useState(1);
  const addItem = useCartStore((s) => s.addItem);
  const { user, isLoggedIn } = useAuthStore();

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => fetchProductBySlug(slug),
  });

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

  const discountPct = product.salePrice
    ? Math.round(((product.price - product.salePrice) / product.price) * 100)
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
        <div className="bg-gray-50 rounded-2xl overflow-hidden aspect-square flex items-center justify-center">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              width={480}
              height={480}
              className="object-contain p-8 w-full h-full"
            />
          ) : (
            <span className="text-9xl">🍾</span>
          )}
        </div>
        {discountPct > 0 && (
          <span className="absolute top-4 left-4 bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">
            -{discountPct}% OFF
          </span>
        )}
      </div>

      {/* Info */}
      <div>
        <p className="text-sm font-medium text-brand-600 uppercase tracking-wide mb-1">
          {product.category} · {product.brand}
        </p>
        <h1 className="font-heading text-3xl font-bold mb-3">{product.name}</h1>

        {product.rating && (
          <div className="flex items-center gap-2 mb-4">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  className={
                    i < Math.round(product.rating!)
                      ? "fill-amber-400 text-amber-400"
                      : "text-gray-200"
                  }
                />
              ))}
            </div>
            <span className="text-sm text-gray-600">
              {product.rating.toFixed(1)} ({product.reviewCount} reviews)
            </span>
          </div>
        )}

        <div className="flex items-baseline gap-3 mb-2">
          <span className="text-4xl font-bold">
            {formatCurrency(product.salePrice ?? product.price)}
          </span>
          {product.salePrice && (
            <span className="text-xl text-gray-400 line-through">
              {formatCurrency(product.price)}
            </span>
          )}
        </div>

        {/* Pills: volume, abv, country only — no stock qty */}
        <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-6">
          <span className="bg-gray-100 px-3 py-1 rounded-full">{product.volume}</span>
          {product.abv > 0 && (
            <span className="bg-gray-100 px-3 py-1 rounded-full">{product.abv}% ABV</span>
          )}
          {product.country && (
            <span className="bg-gray-100 px-3 py-1 rounded-full">{product.country}</span>
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
                onClick={() => addItem(product, qty)}
                className="flex-1 flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-6 py-3.5 rounded-xl transition-colors"
              >
                <ShoppingCart size={18} />
                Add to Cart
              </button>
              <button
                onClick={() => {
                  addItem(product, qty);
                  window.location.href = "/checkout";
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-dark-900 hover:bg-dark-800 text-white font-semibold px-6 py-3.5 rounded-xl transition-colors"
              >
                <Zap size={18} />
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
