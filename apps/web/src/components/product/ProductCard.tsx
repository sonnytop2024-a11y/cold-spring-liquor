"use client";

import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
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
    <div className="group bg-white rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col">
      {/* Image */}
      <Link
        href={`/products/${product.slug}`}
        className="relative aspect-square bg-gray-50 overflow-hidden"
      >
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-contain p-3 group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl opacity-30">
            🍾
          </div>
        )}

        {discountPct > 0 && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
            -{discountPct}%
          </span>
        )}

        {!product.inStock && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <span className="text-xs font-semibold text-gray-400 tracking-wide">Out of Stock</span>
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1">
        {product.brand && (
          <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-0.5 truncate">
            {product.brand}
          </p>
        )}

        <Link href={`/products/${product.slug}`} className="flex-1">
          <h3 className="text-xs font-semibold text-gray-900 leading-snug hover:text-brand-600 transition-colors line-clamp-2 mb-2">
            {product.name}
          </h3>
        </Link>

        {/* Price + Button */}
        <div className="flex items-center justify-between gap-2 mt-auto">
          <div className="flex items-baseline gap-1 min-w-0">
            <span className="text-sm font-bold text-gray-900 truncate">
              ${(product.salePrice ?? product.price).toFixed(2)}
            </span>
            {product.salePrice && (
              <span className="text-[10px] text-gray-400 line-through shrink-0">
                ${product.price.toFixed(2)}
              </span>
            )}
          </div>

          <button
            onClick={(e) => { e.preventDefault(); addItem(product); }}
            disabled={!product.inStock}
            aria-label="Add to cart"
            className={cn(
              "shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-colors",
              product.inStock
                ? "bg-brand-500 hover:bg-brand-600 text-white"
                : "bg-gray-100 text-gray-300 cursor-not-allowed"
            )}
          >
            <Plus size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
