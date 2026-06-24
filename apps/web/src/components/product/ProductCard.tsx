"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Star } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import type { Product } from "@/types";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem);

  const discountPct =
    product.salePrice
      ? Math.round(((product.price - product.salePrice) / product.price) * 100)
      : 0;

  return (
    <div className="group bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      <Link href={`/products/${product.slug}`} className="relative aspect-[3/4] bg-gray-50 overflow-hidden">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-contain p-4 group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">🍾</div>
        )}
        {discountPct > 0 && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
            -{discountPct}%
          </span>
        )}
        {!product.inStock && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="font-semibold text-gray-500">Out of Stock</span>
          </div>
        )}
      </Link>

      <div className="p-4 flex flex-col flex-1">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{product.brand}</p>
        <Link href={`/products/${product.slug}`}>
          <h3 className="font-semibold text-sm leading-tight mb-1 hover:text-brand-600 transition-colors line-clamp-2">
            {product.name}
          </h3>
        </Link>
        <p className="text-xs text-gray-400 mb-2">
          {product.volume} · {product.abv}% ABV
        </p>

        {product.rating && (
          <div className="flex items-center gap-1 mb-2">
            <Star size={12} className="fill-amber-400 text-amber-400" />
            <span className="text-xs text-gray-600">{product.rating.toFixed(1)}</span>
          </div>
        )}

        <div className="mt-auto">
          <div className="flex items-baseline gap-2 mb-3">
            <span className="font-bold text-lg">
              ${(product.salePrice ?? product.price).toFixed(2)}
            </span>
            {product.salePrice && (
              <span className="text-sm text-gray-400 line-through">${product.price.toFixed(2)}</span>
            )}
          </div>

          <button
            onClick={() => addItem(product)}
            disabled={!product.inStock}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors",
              product.inStock
                ? "bg-brand-500 hover:bg-brand-600 text-white"
                : "bg-gray-100 text-gray-400 cursor-not-allowed",
            )}
          >
            <ShoppingCart size={16} />
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
