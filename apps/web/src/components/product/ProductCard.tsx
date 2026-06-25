"use client";

import Image from "next/image";
import Link from "next/link";
import { Plus, Check, Minus } from "lucide-react";
import { useState } from "react";
import { useCartStore } from "@/store/cartStore";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { items, addItem, updateQuantity, removeItem } = useCartStore();
  const [justAdded, setJustAdded] = useState(false);

  const cartItem = items.find((i) => i.product.id === product.id);
  const qty = cartItem?.quantity ?? 0;

  const discountPct = product.salePrice
    ? Math.round(((product.price - product.salePrice) / product.price) * 100)
    : 0;

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    addItem(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  }

  function handleIncrease(e: React.MouseEvent) {
    e.preventDefault();
    addItem(product);
  }

  function handleDecrease(e: React.MouseEvent) {
    e.preventDefault();
    if (qty <= 1) removeItem(product.id);
    else updateQuantity(product.id, qty - 1);
  }

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col">

      {/* ── Image (fixed 1:1, always same size) ─────────────────── */}
      <Link
        href={`/products/${product.slug}`}
        className="relative block w-full bg-white overflow-hidden"
        style={{ paddingBottom: "100%" }} /* enforces 1:1 ratio cross-browser */
      >
        <div className="absolute inset-0">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              <span className="text-5xl opacity-20">🍾</span>
            </div>
          )}
        </div>

        {/* Badges */}
        {discountPct > 0 && (
          <span className="absolute top-2 left-2 z-10 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
            -{discountPct}%
          </span>
        )}
        {!product.inStock && (
          <div className="absolute inset-0 z-10 bg-white/80 flex items-center justify-center">
            <span className="text-xs font-semibold text-gray-400 tracking-wide">Out of Stock</span>
          </div>
        )}
      </Link>

      {/* ── Info (fixed structure, never causes height variance) ── */}
      <div className="p-3 flex flex-col flex-1">
        {/* Brand — always 1 line, truncated */}
        <p className="text-[10px] text-gray-400 uppercase tracking-widest truncate mb-0.5 h-3.5">
          {product.brand ?? " "}
        </p>

        {/* Name — always exactly 2 lines */}
        <Link href={`/products/${product.slug}`} className="flex-1">
          <h3 className="text-xs font-semibold text-gray-900 leading-snug hover:text-brand-600 transition-colors line-clamp-2 mb-2" style={{ minHeight: "2.5rem" }}>
            {product.name}
          </h3>
        </Link>

        {/* Price + Cart button */}
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

          {!product.inStock ? (
            <button
              disabled
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 text-gray-300 cursor-not-allowed"
            >
              <Plus size={14} strokeWidth={2.5} />
            </button>
          ) : qty > 0 ? (
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={handleDecrease}
                className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 transition-colors"
              >
                <Minus size={10} strokeWidth={2.5} />
              </button>
              <span className="text-xs font-bold w-5 text-center text-gray-900 tabular-nums">
                {qty}
              </span>
              <button
                onClick={handleIncrease}
                className="w-6 h-6 flex items-center justify-center rounded-md bg-brand-500 hover:bg-brand-600 text-white transition-colors"
              >
                <Plus size={10} strokeWidth={2.5} />
              </button>
            </div>
          ) : justAdded ? (
            <button
              disabled
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-green-500 text-white"
            >
              <Check size={14} strokeWidth={2.5} />
            </button>
          ) : (
            <button
              onClick={handleAdd}
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-brand-500 hover:bg-brand-600 text-white transition-colors active:scale-90"
            >
              <Plus size={14} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
