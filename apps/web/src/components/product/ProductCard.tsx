"use client";

import Image from "next/image";
import Link from "next/link";
import { Plus, Check, Minus, Store } from "lucide-react";
import { useState, useRef, useEffect, useLayoutEffect, memo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCartStore } from "@/store/cartStore";
import type { Product } from "@/types";
import { categoryPlaceholder } from "@/lib/categoryPlaceholder";
import { fetchProductBySlug } from "@/lib/api/products";

// Product name in a fixed 2-line-height box. Long names shrink (14px → 9px,
// which lets them wrap to 3 lines) until the FULL name fits — never "…" cut.
// Re-measures after the custom font loads and when the card width changes.
// Compact mode (carousel half-size cards) starts at 10px with a 7px floor.
function FitName({ name, compact = false }: { name: string; compact?: boolean }) {
  const ref = useRef<HTMLHeadingElement | null>(null);
  const startSize = compact ? 10 : 14;
  const minSize = compact ? 7 : 9;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      let size = startSize;
      el.style.fontSize = `${size}px`;
      while (size > minSize && el.scrollHeight > el.clientHeight + 1) {
        size -= 0.5;
        el.style.fontSize = `${size}px`;
      }
    };
    fit();
    document.fonts?.ready.then(fit).catch(() => {});
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [name, startSize, minSize]);
  return (
    <h3
      ref={ref}
      className={`font-product font-bold text-gray-900 leading-snug hover:text-brand-600 transition-colors overflow-hidden ${compact ? "mb-1" : "mb-2"}`}
      style={{ fontSize: startSize, height: compact ? "2.4rem" : "2.75rem" }}
    >
      {name}
    </h3>
  );
}

interface ProductCardProps {
  product: Product;
  /** Set true for the first few above-the-fold cards to skip lazy-loading their image */
  priority?: boolean;
  /** Half-size card for the mobile category carousels — everything scales down */
  compact?: boolean;
}

// Platform (Apple-style shelf disc) eligibility — anh Sơn 29/07, All tab only:
// white background, a single standing bottle (boxes/multi-packs are wide),
// never Beer. The image is served through /_next/image (same origin), so the
// canvas is never CORS-tainted.
function canStandOnPlatform(img: HTMLImageElement): boolean {
  try {
    const S = 64;
    const c = document.createElement("canvas");
    c.width = S; c.height = S;
    const ctx = c.getContext("2d");
    if (!ctx) return false;
    ctx.drawImage(img, 0, 0, S, S);
    const d = ctx.getImageData(0, 0, S, S).data;
    const at = (x: number, y: number) => { const i = (y * S + x) * 4; return Math.min(d[i], d[i + 1], d[i + 2]); };
    // 1) The frame's inner ring must be white → photo backgrounds out.
    //    Skipped zones where a legit bottle shot has non-white pixels:
    //    top-centre (cap), the whole bottom row and lower flanks (many photos
    //    bake a soft floor shadow under the bottle).
    const m = Math.round(S * 0.08);
    const inner = Math.round(S * 0.3);
    for (let x = m; x < S - m; x += 2) {
      if (x > inner && x < S - inner) continue; // centre = cap zone
      if (at(x, m) < 238) return false;
    }
    const sideStop = Math.round(S * 0.72); // below this: floor-shadow zone
    for (let y = m; y < sideStop; y += 2) if (at(m, y) < 238 || at(S - 1 - m, y) < 238) return false;
    // 2) Content must be tall and narrow like a single bottle — a box,
    //    bottle+box combo, or multi-pack spreads wide → no platform
    let minX = S, maxX = -1, minY = S, maxY = -1;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        if (at(x, y) < 236) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return false;
    // Boxes / bottle+box combos / multi-packs are near-square (~1.0); squat
    // single bottles (1792, decanters) stay under this.
    return (maxX - minX + 1) / (maxY - minY + 1) <= 0.92;
  } catch {
    return false;
  }
}

const BOXED_NAME = /\b\d+\s*(?:pk|pack)\b|\bbox\b|\bgift\b|\bcombo\b/i;

// One canvas analysis per image URL for the whole session — the same product
// appears in several strips/pages, and re-running 64×64 getImageData during a
// swipe is exactly the kind of main-thread work that makes scrolling stutter.
const platformCache = new Map<string, boolean>();

// Run fn when the browser is idle (falls back to a timeout on Safari)
function whenIdle(fn: () => void) {
  if (typeof requestIdleCallback === "function") requestIdleCallback(fn, { timeout: 1500 });
  else setTimeout(fn, 200);
}

function ProductCardImpl({ product, priority = false, compact = false }: ProductCardProps) {
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
  // Image fades in when loaded — the disc is there from first paint, the
  // bottle materialising with a soft fade feels intentional, not laggy
  const [imgLoaded, setImgLoaded] = useState(false);
  // Square-ish photos keep object-cover (fills the tile, the approved look).
  // Clearly non-square photos (6-packs, bottle+box combos, tall shots) switch
  // to object-contain so nothing gets cropped — decided from the file's real
  // width/height, never pixel heuristics.
  const [imgFit, setImgFit] = useState<"cover" | "contain">("cover");
  // Compact cards use an Instacart-style stepper: adding opens a floating
  // − qty + pill OVER the card (no layout shift, nothing wraps), which
  // auto-collapses into a small qty button after a pause.
  const [stepperOpen, setStepperOpen] = useState(false);
  const stepperTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (stepperTimer.current) clearTimeout(stepperTimer.current); }, []);
  function pokeStepper() {
    setStepperOpen(true);
    if (stepperTimer.current) clearTimeout(stepperTimer.current);
    stepperTimer.current = setTimeout(() => setStepperOpen(false), 2500);
  }

  const qty = cartItem?.quantity ?? 0;

  // Small-format bottles (50/100/200/375 mL in the name or volume) render 30%
  // smaller than full-size bottles so a 375mL never looks as big as a 750mL
  // (anh Sơn, 29/07). Word boundaries keep 1000mL etc. from matching.
  const isSmallBottle = /\b(50|100|200|375)\s*ml\b/i.test(`${product.name} ${product.volume ?? ""}`);

  // Platform shelf disc — compact (All tab) cards only, never Beer, never
  // boxed/multi-pack names. The white-bg single-bottle verdict is pre-computed
  // server-side (product.platformOk) so the disc renders in the FIRST paint —
  // no canvas work on the phone, no late pop-in. The canvas check below only
  // covers products the batch hasn't flagged yet (fresh uploads).
  const platformEligible = compact && product.category !== "beer" && !BOXED_NAME.test(product.name);
  const [onPlatform, setOnPlatform] = useState(platformEligible && product.platformOk === true);

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
    if (compact) { pokeStepper(); return; }
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  }

  function handleIncrease(e: React.MouseEvent) {
    e.preventDefault();
    if (compact) pokeStepper();
    if (qty >= product.stockQty) return;
    addItem(product);
    triggerPop();
  }

  function handleDecrease(e: React.MouseEvent) {
    e.preventDefault();
    if (compact) pokeStepper();
    if (qty <= 1) removeItem(product.id);
    else updateQuantity(product.id, qty - 1);
  }

  return (
    <div className="group relative bg-white rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200 flex flex-col">

      {/* ── Image ────────────────────────────────────────────────── */}
      <div className={`relative rounded-xl overflow-hidden aspect-square ${compact ? "mx-1 mt-1" : "mx-2 mt-2"} ${imgFit === "contain" || isSmallBottle || onPlatform ? "bg-white" : "bg-gray-50"}`}>
        {/* Shelf disc UNDER the bottle (DOM order keeps the image on top);
            the bottle's white background melts into it via multiply blend */}
        {onPlatform && (
          <>
            <div className="csl-halo" aria-hidden="true" />
            <div className="csl-pshadow" aria-hidden="true" />
            <div className="csl-platform" aria-hidden="true" />
          </>
        )}
        <Link href={`/products/${product.slug}`} className="absolute inset-0" onMouseEnter={prefetchDetail}>
          {product.imageUrl && !imgError ? (
            /* next/image with `fill` can't have its height overridden, so the
               platform look shrinks THIS positioned frame instead: on the
               disc the frame is 85% tall (small bottles 64%) anchored just
               above the disc; otherwise it fills the tile. */
            <span
              className="absolute left-0 right-0 block"
              style={onPlatform ? { bottom: "6.5%", height: isSmallBottle ? "69%" : "92%" } : { top: 0, bottom: 0 }}
            >
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              // Compact carousel cards are ~30% of the viewport — asking for
              // 50vw made every card download a double-size image (jank on
              // scroll from decode work + wasted bandwidth).
              sizes={compact ? "30vw" : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"}
              className={`${isSmallBottle || onPlatform ? "object-contain" : imgFit === "cover" ? "object-cover" : "object-contain p-1.5"} ${imgLoaded ? "opacity-100" : "opacity-0"} rounded-xl card-img-zoom transition-[opacity,transform] duration-300`}
              // On the platform the white background melts away with multiply;
              // off it, small bottles keep the shelf-floor padding (77%).
              style={
                onPlatform
                  ? { mixBlendMode: "multiply" }
                  : isSmallBottle
                    ? { padding: "21% 11.5% 2%", objectPosition: "bottom" }
                    : undefined
              }
              loading={priority ? undefined : "lazy"}
              priority={priority}
              onLoad={(e) => {
                const img = e.currentTarget;
                setImgLoaded(true);
                const { naturalWidth: w, naturalHeight: h } = img;
                if (w && h && (w / h > 1.1 || w / h < 0.9)) setImgFit("contain");
                if (platformEligible && product.platformOk === undefined) {
                  const key = product.imageUrl!;
                  const cached = platformCache.get(key);
                  if (cached !== undefined) {
                    if (cached) setOnPlatform(true);
                  } else {
                    // Defer the canvas work to idle time — never mid-swipe.
                    // A detached img (card unmounted meanwhile) is skipped
                    // WITHOUT caching, so the next mount analyses it properly.
                    whenIdle(() => {
                      if (!img.isConnected) return;
                      const ok = canStandOnPlatform(img);
                      platformCache.set(key, ok);
                      if (ok) setOnPlatform(true);
                    });
                  }
                }
              }}
              onError={() => setImgError(true)}
            />
            </span>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-white">
              {/* Category illustration placeholder — replaced automatically once a real photo is uploaded */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={categoryPlaceholder(product.category)}
                alt={product.name}
                className="w-[64%] h-[64%] object-contain card-img-zoom transition-transform duration-300"
                loading="lazy"
              />
            </div>
          )}
        </Link>

        {/* Discount badge */}
        {discountPct > 0 && (
          <span className={`absolute z-10 bg-red-500 text-white font-bold rounded-md ${compact ? "top-1 left-1 text-[8px] px-1 py-px" : "top-2 left-2 text-[10px] px-1.5 py-0.5"}`}>
            -{discountPct}%
          </span>
        )}

        {/* Bundle badge */}
        {product.bundleEligible && !product.salePrice && (
          <span className={`absolute z-10 font-bold rounded-md flex items-center gap-0.5 ${compact ? "top-1 left-1 text-[8px] px-1 py-px" : "top-2 left-2 text-[10px] px-1.5 py-0.5"}`}
            style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)", color: "#fff" }}>
            📦{compact ? "" : " Bundle"}
          </span>
        )}

        {/* Pickup Only badge — stacked below discount/bundle badge, mode-independent.
            Compact pill (anh Sơn, 27/07: the old one covered the bottle): lucide
            Store icon instead of the chunky 🏬 emoji, 9px text, and
            text-size-adjust locked so mobile Safari can't auto-inflate it.
            Carousel compact card: icon-only dot so it never covers the bottle. */}
        {product.pickupOnly && (
          <span
            className={`absolute z-10 leading-none rounded-full flex items-center bg-blue-600/95 text-white shadow-sm ${
              compact
                ? "top-1 right-1 p-[3px]" // opposite corner from the sale badge — never stacked (anh Sơn)
                : `left-2 text-[7px] font-semibold pl-1 pr-1.5 py-[3px] gap-0.5 ${discountPct > 0 || (product.bundleEligible && !product.salePrice) ? "top-9" : "top-2"}`
            }`}
            style={{ WebkitTextSizeAdjust: "100%", textSizeAdjust: "100%" } as React.CSSProperties}
            title="Pickup Only"
          >
            <Store size={compact ? 7 : 8} strokeWidth={2.5} />{compact ? "" : " Pickup Only"}
          </span>
        )}

        {/* Out of stock overlay */}
        {!product.inStock && (
          <div className="absolute inset-0 z-10 bg-white/80 flex items-center justify-center">
            <span className={`font-semibold text-gray-400 tracking-wide ${compact ? "text-[9px]" : "text-xs"}`}>Out of Stock</span>
          </div>
        )}
      </div>

      {/* ── Info ─────────────────────────────────────────────────── */}
      <div className={`flex flex-col flex-1 ${compact ? "p-1.5" : "p-3"}`}>
        {/* Brand row is dropped in compact — no room, and it's often empty */}
        {!compact && (
          <p className="font-product text-[10px] text-gray-400 uppercase tracking-widest truncate mb-0.5 h-3.5">
            {product.brand ?? " "}
          </p>
        )}

        <Link href={`/products/${product.slug}`} className="flex-1" onMouseEnter={prefetchDetail}>
          <FitName name={product.name} compact={compact} />
        </Link>

        <div className={`flex items-center justify-between mt-auto ${compact ? "gap-1" : "gap-2"}`}>
          <div className="min-w-0">
            <span className={`font-product font-black block ${compact ? "text-[11px]" : "text-base"} ${product.salePrice ? "text-red-600" : "text-gray-900"}`}>
              ${(product.salePrice ?? product.price).toFixed(2)}
            </span>
            {product.salePrice && (
              <span className={`font-product text-gray-400 line-through block leading-tight ${compact ? "text-[8px]" : "text-[11px]"}`}>
                ${product.price.toFixed(2)}
              </span>
            )}
          </div>

          {!product.inStock ? (
            <button
              disabled
              className={`shrink-0 flex items-center justify-center rounded-lg bg-gray-100 text-gray-300 cursor-not-allowed ${compact ? "w-5 h-5" : "w-7 h-7"}`}
            >
              <Plus size={compact ? 11 : 14} strokeWidth={2.5} />
            </button>
          ) : qty > 0 && compact ? (
            /* Instacart-style collapsed state: the add button becomes a qty
               badge. Tapping it re-opens the floating stepper pill below. */
            <button
              onClick={(e) => { e.preventDefault(); pokeStepper(); }}
              className="shrink-0 w-5 h-5 flex items-center justify-center rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-[11px] font-bold tabular-nums"
              aria-label={`${qty} in cart — tap to adjust`}
            >
              {qty}
            </button>
          ) : qty > 0 ? (
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={handleDecrease}
                className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 transition-colors"
              >
                <Minus size={10} strokeWidth={2.5} />
              </button>
              <span className="font-bold text-center text-gray-900 tabular-nums text-xs w-5">
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
              className={`shrink-0 flex items-center justify-center rounded-lg bg-green-500 text-white ${compact ? "w-5 h-5" : "w-7 h-7"}`}
            >
              <Check size={compact ? 11 : 14} strokeWidth={2.5} />
            </button>
          ) : (
            <button
              onClick={handleAdd}
              className={`shrink-0 flex items-center justify-center rounded-lg bg-brand-500 hover:bg-brand-600 text-white transition-colors ${compact ? "w-5 h-5" : "w-7 h-7"} ${popping ? "animate-add-to-cart" : ""}`}
            >
              <Plus size={compact ? 11 : 14} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      {/* Floating − qty + pill (compact only): overlays the card bottom, so
          the price row never reflows or wraps. Auto-collapses back into the
          qty badge ~2.5s after the last tap. */}
      {compact && qty > 0 && product.inStock && stepperOpen && (
        <div className="absolute bottom-1 left-1 right-1 z-20 flex items-center justify-between bg-white rounded-full shadow-lg border border-gray-200 p-0.5 animate-add-to-cart">
          <button
            onClick={handleDecrease}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 transition-colors"
            aria-label="Decrease quantity"
          >
            <Minus size={11} strokeWidth={2.5} />
          </button>
          <span className="font-bold text-center text-gray-900 tabular-nums text-xs">
            {qty}
          </span>
          <button
            onClick={handleIncrease}
            disabled={qty >= product.stockQty}
            className={`w-6 h-6 flex items-center justify-center rounded-full transition-colors ${
              qty >= product.stockQty
                ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                : "bg-brand-500 hover:bg-brand-600 text-white"
            }`}
            aria-label="Increase quantity"
          >
            <Plus size={11} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  );
}

export const ProductCard = memo(ProductCardImpl);
