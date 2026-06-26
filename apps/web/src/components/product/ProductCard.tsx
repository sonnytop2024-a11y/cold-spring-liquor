"use client";

import Image from "next/image";
import Link from "next/link";
import { Plus, Check, Minus, Heart } from "lucide-react";
import { useState, useEffect } from "react";
import { useCartStore } from "@/store/cartStore";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { items, addItem, updateQuantity, removeItem } = useCartStore();
  const [justAdded, setJustAdded] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("csl_favorites") ?? "[]");
      setFavorited(saved.includes(product.id));
    } catch {}
  }, [product.id]);

  function toggleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    try {
      const saved: string[] = JSON.parse(localStorage.getItem("csl_favorites") ?? "[]");
      const next = favorited ? saved.filter((id) => id !== product.id) : [...saved, product.id];
      localStorage.setItem("csl_favorites", JSON.stringify(next));
      setFavorited(!favorited);
    } catch {}
  }

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
    <div className="group bg-white rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200 flex flex-col">

      {/* ── Image ────────────────────────────────────────────────── */}
      <div className="relative mx-2 mt-2 rounded-xl overflow-hidden aspect-square bg-gray-50">
        <Link href={`/products/${product.slug}`} className="absolute inset-0">
          {product.imageUrl && !imgError ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover rounded-xl group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center relative overflow-hidden"
              style={{ background: "linear-gradient(160deg,#1a1a1a,#2d2d2d)" }}>
              {/* ambient glow */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-24 h-24 rounded-full animate-pulse-glow"
                  style={{ background: "radial-gradient(circle, rgba(249,115,22,0.22) 0%, transparent 70%)" }} />
              </div>
              {/* shimmer sweep */}
              <div className="absolute inset-0 pointer-events-none animate-shimmer"
                style={{ background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.06) 50%, transparent 60%)" }} />
              {/* floating bottle */}
              <div className="relative z-10 animate-bottle-float">
                <svg width="52" height="90" viewBox="0 0 58 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="22" y="2" width="14" height="9" rx="3" fill="#4b5563"/>
                  <rect x="23" y="2" width="5" height="9" rx="1.5" fill="#6b7280" opacity="0.5"/>
                  <rect x="24" y="10" width="10" height="15" fill="#374151"/>
                  <path d="M24 25 Q14 34 13 45 L45 45 Q44 34 34 25 Z" fill="#374151"/>
                  <rect x="13" y="45" width="32" height="47" rx="5" fill="#374151"/>
                  <rect x="17" y="53" width="24" height="30" rx="3" fill="#111827" opacity="0.9"/>
                  <rect x="17" y="53" width="24" height="3" rx="1.5" fill="#f97316" opacity="0.85"/>
                  <rect x="21" y="60" width="16" height="2" rx="1" fill="#4b5563"/>
                  <rect x="23" y="64" width="12" height="2" rx="1" fill="#374151"/>
                  <rect x="21" y="68" width="16" height="1.5" rx="1" fill="#374151"/>
                  <rect x="23" y="72" width="12" height="1.5" rx="1" fill="#374151"/>
                  <rect x="18" y="47" width="3.5" height="38" rx="1.75" fill="white" opacity="0.1"/>
                  <rect x="22" y="47" width="1.5" height="20" rx="0.75" fill="white" opacity="0.07"/>
                  <rect x="13" y="90" width="32" height="2" rx="1" fill="#1f2937"/>
                </svg>
              </div>
              {/* drop shadow under bottle */}
              <div className="absolute bottom-3 w-8 h-2 rounded-full animate-bottle-shadow"
                style={{ background: "radial-gradient(ellipse, rgba(0,0,0,0.5) 0%, transparent 70%)" }} />
              {/* badge */}
              <span className="absolute bottom-2 right-2 text-white font-bold rounded-full z-10"
                style={{ background: "rgba(249,115,22,0.9)", fontSize: "8px", padding: "3px 7px", letterSpacing: "0.5px" }}>
                PHOTO SOON
              </span>
            </div>
          )}
        </Link>

        {/* Heart / Favorite */}
        <button
          onClick={toggleFavorite}
          className="absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-sm transition-transform active:scale-90"
        >
          <Heart
            size={14}
            strokeWidth={2}
            className={favorited ? "fill-red-500 text-red-500" : "text-gray-400"}
          />
        </button>

        {/* Discount badge */}
        {discountPct > 0 && (
          <span className="absolute top-2 left-2 z-10 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
            -{discountPct}%
          </span>
        )}

        {/* Out of stock overlay */}
        {!product.inStock && (
          <div className="absolute inset-0 z-10 bg-white/80 flex items-center justify-center">
            <span className="text-xs font-semibold text-gray-400 tracking-wide">Out of Stock</span>
          </div>
        )}
      </div>

      {/* ── Info ─────────────────────────────────────────────────── */}
      <div className="p-3 flex flex-col flex-1">
        <p className="text-[10px] text-gray-400 uppercase tracking-widest truncate mb-0.5 h-3.5">
          {product.brand ?? " "}
        </p>

        <Link href={`/products/${product.slug}`} className="flex-1">
          <h3 className="font-display text-[13px] font-bold text-gray-900 leading-snug hover:text-brand-600 transition-colors line-clamp-2 mb-2" style={{ minHeight: "2.5rem" }}>
            {product.name}
          </h3>
        </Link>

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
