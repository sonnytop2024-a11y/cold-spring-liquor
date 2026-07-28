"use client";

import Image from "next/image";
import Link from "next/link";
import { Plus, Check, Minus, Store } from "lucide-react";
import { useState, useRef, useLayoutEffect, memo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCartStore } from "@/store/cartStore";
import type { Product } from "@/types";
import { categoryPlaceholder } from "@/lib/categoryPlaceholder";
import { fetchProductBySlug } from "@/lib/api/products";

// Product name in a fixed 2-line-height box. Long names shrink (14px → 9px,
// which lets them wrap to 3 lines) until the FULL name fits — never "…" cut.
// Re-measures after the custom font loads and when the card width changes.
function FitName({ name }: { name: string }) {
  const ref = useRef<HTMLHeadingElement | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      let size = 14;
      el.style.fontSize = `${size}px`;
      while (size > 9 && el.scrollHeight > el.clientHeight + 1) {
        size -= 0.5;
        el.style.fontSize = `${size}px`;
      }
    };
    fit();
    document.fonts?.ready.then(fit).catch(() => {});
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [name]);
  return (
    <h3
      ref={ref}
      className="font-product font-bold text-gray-900 leading-snug hover:text-brand-600 transition-colors overflow-hidden mb-2"
      style={{ fontSize: 14, height: "2.75rem" }}
    >
      {name}
    </h3>
  );
}

interface ProductCardProps {
  product: Product;
  /** Set true for the first few above-the-fold cards to skip lazy-loading their image */
  priority?: boolean;
}

function ProductCardImpl({ product, priority = false }: ProductCardProps) {
  // Narrow selectors — each ProductCard only re-renders when ITS OWN cart
  // entry changes, not on every add/remove/update anywhere in the cart.
  const cartItem = useCartStore((s) => s.items.find((i) => i.product.id === product.id));
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const queryClient = useQueryClient();
  const [justAdded, setJustAdded] = useState(false);
  const [popping, setPopping] = useState(false);
  const [imgError, setImgError] = useState(false);

  const qty = cartItem?.quantity ?? 0;

  function prefetchDetail() {
    queryClient.prefetchQuery({
      queryKey: ["product", product.slug],
      queryFn: () => fetchProductBySlug(product.slug),
      staleTime: 30_000,
    });
  }

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
    if (qty >= product.stockQty) return;
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
        <Link href={`/products/${product.slug}`} className="absolute inset-0" onMouseEnter={prefetchDetail}>
          {product.imageUrl && !imgError ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover rounded-xl group-hover:scale-105 transition-transform duration-300"
              loading={priority ? undefined : "lazy"}
              priority={priority}
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-white">
              {/* Category illustration placeholder — replaced automatically once a real photo is uploaded */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={categoryPlaceholder(product.category)}
                alt={product.name}
                className="w-[64%] h-[64%] object-contain group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>
          )}
        </Link>

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

        {/* Pickup Only badge — stacked below discount/bundle badge, mode-independent.
            Compact pill (anh Sơn, 27/07: the old one covered the bottle): lucide
            Store icon instead of the chunky 🏬 emoji, 9px text, and
            text-size-adjust locked so mobile Safari can't auto-inflate it. */}
        {product.pickupOnly && (
          <span
            className={`absolute left-2 z-10 text-[7px] font-semibold leading-none pl-1 pr-1.5 py-[3px] rounded-full flex items-center gap-0.5 bg-blue-600/95 text-white shadow-sm ${
              discountPct > 0 || (product.bundleEligible && !product.salePrice) ? "top-9" : "top-2"
            }`}
            style={{ WebkitTextSizeAdjust: "100%", textSizeAdjust: "100%" } as React.CSSProperties}
          >
            <Store size={8} strokeWidth={2.5} /> Pickup Only
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

        <Link href={`/products/${product.slug}`} className="flex-1" onMouseEnter={prefetchDetail}>
          <FitName name={product.name} />
        </Link>

        <div className="flex items-center justify-between gap-2 mt-auto">
          <div className="min-w-0">
            <span className={`font-product text-base font-black block ${product.salePrice ? "text-red-600" : "text-gray-900"}`}>
              ${(product.salePrice ?? product.price).toFixed(2)}
            </span>
            {product.salePrice && (
              <span className="font-product text-[11px] text-gray-400 line-through block leading-tight">
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
                disabled={qty >= product.stockQty}
                className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors ${
                  qty >= product.stockQty
                    ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                    : `bg-brand-500 hover:bg-brand-600 text-white ${popping ? "animate-add-to-cart" : ""}`
                }`}
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

export const ProductCard = memo(ProductCardImpl);
