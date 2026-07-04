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
  const [popping, setPopping] = useState(false);
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

  function triggerPop() {
    setPopping(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setPopping(true)));
    setTimeout(() => setPopping(false), 300);
  }

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    addItem(product);
    triggerPop();
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  }

  function handleIncrease(e: React.MouseEvent) {
    e.preventDefault();
    addItem(product);
    triggerPop();
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
              style={{ background: "linear-gradient(160deg,#061a0e,#0d2f1a,#0a2214)" }}>
              {/* gold ambient glow */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-28 h-28 rounded-full animate-pulse-glow"
                  style={{ background: "radial-gradient(circle, rgba(212,175,55,0.18) 0%, transparent 70%)" }} />
              </div>
              {/* shimmer sweep */}
              <div className="absolute inset-0 pointer-events-none animate-shimmer"
                style={{ background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.07) 50%, transparent 60%)" }} />
              {/* champagne bottle */}
              <div className="relative z-10 animate-bottle-float">
                <svg width="46" height="96" viewBox="0 0 46 96" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* foil cap */}
                  <rect x="17" y="1" width="12" height="12" rx="3" fill="#b8962e"/>
                  <rect x="17" y="1" width="5" height="12" rx="1.5" fill="#d4af37" opacity="0.7"/>
                  {/* wire cage */}
                  <line x1="17" y1="4" x2="29" y2="4" stroke="#d4af37" strokeWidth="0.8" opacity="0.9"/>
                  <line x1="17" y1="7" x2="29" y2="7" stroke="#d4af37" strokeWidth="0.8" opacity="0.7"/>
                  <line x1="17" y1="10" x2="29" y2="10" stroke="#d4af37" strokeWidth="0.6" opacity="0.5"/>
                  <line x1="20" y1="1" x2="20" y2="13" stroke="#d4af37" strokeWidth="0.6" opacity="0.6"/>
                  <line x1="23" y1="1" x2="23" y2="13" stroke="#d4af37" strokeWidth="0.6" opacity="0.6"/>
                  <line x1="26" y1="1" x2="26" y2="13" stroke="#d4af37" strokeWidth="0.6" opacity="0.6"/>
                  {/* long slender neck */}
                  <rect x="19" y="13" width="8" height="28" rx="2" fill="#1a4a2e"/>
                  <rect x="19" y="13" width="3" height="28" rx="1" fill="white" opacity="0.08"/>
                  {/* shoulder curve */}
                  <path d="M19 41 Q10 50 9 58 L37 58 Q36 50 27 41 Z" fill="#1a4a2e"/>
                  <path d="M19 41 Q13 46 12 53 L16 53 Q17 47 21 43 Z" fill="white" opacity="0.07"/>
                  {/* body */}
                  <rect x="9" y="58" width="28" height="34" rx="4" fill="#1a4a2e"/>
                  {/* label — cream/gold */}
                  <rect x="12" y="63" width="22" height="22" rx="2" fill="#f5f0dc" opacity="0.95"/>
                  <rect x="12" y="63" width="22" height="4" rx="1.5" fill="#d4af37" opacity="0.9"/>
                  <rect x="15" y="70" width="16" height="1.5" rx="0.75" fill="#5a3e00" opacity="0.5"/>
                  <rect x="17" y="73" width="12" height="1.5" rx="0.75" fill="#5a3e00" opacity="0.4"/>
                  <rect x="15" y="76" width="16" height="1" rx="0.5" fill="#5a3e00" opacity="0.3"/>
                  <rect x="17" y="79" width="12" height="1" rx="0.5" fill="#5a3e00" opacity="0.25"/>
                  {/* shine streak */}
                  <rect x="10" y="58" width="3" height="34" rx="1.5" fill="white" opacity="0.09"/>
                  {/* base */}
                  <rect x="9" y="90" width="28" height="3" rx="1.5" fill="#0d2518"/>
                  {/* bubbles */}
                  <circle cx="22" cy="68" r="1" fill="white" opacity="0.15"/>
                  <circle cx="28" cy="74" r="0.8" fill="white" opacity="0.12"/>
                  <circle cx="19" cy="79" r="0.7" fill="white" opacity="0.1"/>
                </svg>
              </div>
              {/* drop shadow */}
              <div className="absolute bottom-3 w-8 h-2 rounded-full animate-bottle-shadow"
                style={{ background: "radial-gradient(ellipse, rgba(0,0,0,0.5) 0%, transparent 70%)" }} />
              {/* badge */}
              <span className="absolute bottom-2 right-2 text-white font-bold rounded-full z-10"
                style={{ background: "rgba(180,140,30,0.92)", fontSize: "8px", padding: "3px 7px", letterSpacing: "0.5px" }}>
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

        {/* Bundle badge */}
        {product.bundleEligible && !product.salePrice && (
          <span className="absolute top-2 left-2 z-10 text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5"
            style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)", color: "#fff" }}>
            📦 Bundle
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
        <p className="font-product text-[10px] text-gray-400 uppercase tracking-widest truncate mb-0.5 h-3.5">
          {product.brand ?? " "}
        </p>

        <Link href={`/products/${product.slug}`} className="flex-1">
          <h3 className="font-product text-[14px] font-bold text-gray-900 leading-snug hover:text-brand-600 transition-colors line-clamp-2 mb-2" style={{ minHeight: "2.5rem" }}>
            {product.name}
          </h3>
        </Link>

        <div className="flex items-center justify-between gap-2 mt-auto">
          <div className="flex items-baseline gap-1 min-w-0">
            <span className="font-product text-base font-black text-gray-900 truncate">
              ${(product.salePrice ?? product.price).toFixed(2)}
            </span>
            {product.salePrice && (
              <span className="font-product text-[11px] text-gray-400 line-through shrink-0">
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
                className={`w-6 h-6 flex items-center justify-center rounded-md bg-brand-500 hover:bg-brand-600 text-white transition-colors ${popping ? "animate-add-to-cart" : ""}`}
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
              className={`shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-brand-500 hover:bg-brand-600 text-white transition-colors ${popping ? "animate-add-to-cart" : ""}`}
            >
              <Plus size={14} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
