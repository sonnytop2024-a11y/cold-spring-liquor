"use client";

/**
 * Rare Whiskey Vault — homepage section between the banner carousel and hero.
 *
 * The cabinet is ONE photo (/vault/cabinet.jpg): wood frame, shelves, lamps and
 * the gold title are all baked in. CSS only layers bottles, light beams, glass
 * and the bronze ornaments on top. The niche coordinates below are measured
 * from that photo — do not change them unless the photo itself is replaced.
 *
 * Data comes from /api/vault (admin-curated list joined live with the product
 * catalog). When the vault is switched off or empty this renders nothing, so
 * the homepage looks exactly as it did before this section existed.
 */

import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";
import type { Product } from "@/types";

const NICHE_COUNT = 5;
// Measured from /vault/cabinet.jpg via the lamp centres (see handoff README)
const NICHE_CENTERS = [14.68, 31.96, 49.92, 67.25, 84.24];

interface VaultProduct {
  id: string;
  handle: string;
  name: string;
  volume: string;
  price: number;
  stock: number;
  image: string | null;
  needsBgRemoval: boolean;
  product: Product;
}

interface VaultFeed {
  settings: { enabled: boolean; lightFx: boolean; hideSoldOut: boolean };
  products: VaultProduct[];
}

async function fetchVault(): Promise<VaultFeed | null> {
  const res = await fetch("/api/vault");
  if (!res.ok) return null;
  return res.json();
}

/* ── White-background removal fallback ──────────────────────────────────────
   Based on FlashDeals.tsx, extended for the cabinet. Dedicated vault uploads
   are already transparent; this only runs for items still using the catalog
   photo. Two extra rules vs FlashDeals:
   1. The border must be mostly white — busy backgrounds (smoke, bar photos)
      cannot be cleaned, and per shop policy they must NOT appear as a photo
      box in the cabinet, so we return null and the niche stays empty.
   2. After clearing we crop to the opaque bounding box, so the bottle's base
      sits exactly on the shelf instead of floating on invisible padding. */
const BG_WHITE_MIN = 232;
const BG_MAX_SIDE = 480;
const bgRemovalCache = new Map<string, Promise<string | null>>();

function removeWhiteBg(url: string): Promise<string | null> {
  const cached = bgRemovalCache.get(url);
  if (cached) return cached;
  const job = new Promise<string | null>((resolve) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onerror = () => resolve(null);
    img.onload = () => {
      try {
        const scale = Math.min(1, BG_MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * scale));
        const h = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, w, h);
        const id = ctx.getImageData(0, 0, w, h);
        const d = id.data;
        const isBg = (p: number) =>
          d[p * 4] > BG_WHITE_MIN && d[p * 4 + 1] > BG_WHITE_MIN && d[p * 4 + 2] > BG_WHITE_MIN;

        const visited = new Uint8Array(w * h);
        const queue: number[] = [];
        for (let x = 0; x < w; x++) queue.push(x, (h - 1) * w + x);
        for (let y = 0; y < h; y++) queue.push(y * w, y * w + w - 1);
        let cleared = 0;
        while (queue.length) {
          const p = queue.pop() as number;
          if (visited[p] || !isBg(p)) continue;
          visited[p] = 1;
          d[p * 4 + 3] = 0;
          cleared++;
          const x = p % w;
          if (x > 0) queue.push(p - 1);
          if (x < w - 1) queue.push(p + 1);
          if (p >= w) queue.push(p - w);
          if (p < w * (h - 1)) queue.push(p + w);
        }
        // Rule 1: mostly-white border required
        let borderTotal = 0;
        let borderCleared = 0;
        const countBorder = (p: number) => {
          borderTotal++;
          if (d[p * 4 + 3] === 0) borderCleared++;
        };
        for (let x = 0; x < w; x++) {
          countBorder(x);
          countBorder((h - 1) * w + x);
        }
        for (let y = 1; y < h - 1; y++) {
          countBorder(y * w);
          countBorder(y * w + w - 1);
        }
        if (cleared === 0 || borderCleared / borderTotal < 0.5) return resolve(null);

        // Rule 2: crop to the opaque bounding box (bottle feet on the shelf)
        let minX = w, minY = h, maxX = -1, maxY = -1;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (d[(y * w + x) * 4 + 3] !== 0) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
        if (maxX < 0) return resolve(null);
        ctx.putImageData(id, 0, 0);
        const out = document.createElement("canvas");
        out.width = maxX - minX + 1;
        out.height = maxY - minY + 1;
        const octx = out.getContext("2d");
        if (!octx) return resolve(null);
        octx.drawImage(canvas, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
        resolve(out.toDataURL("image/png"));
      } catch {
        resolve(null); // CORS/decode issues → no bottle image shown
      }
    };
    img.src = url;
  });
  bgRemovalCache.set(url, job);
  return job;
}

function useBottleImage(url: string | null, needsBgRemoval: boolean) {
  const [src, setSrc] = useState<string | null>(needsBgRemoval ? null : url);
  useEffect(() => {
    let alive = true;
    if (!url) return setSrc(null);
    if (!needsBgRemoval) return setSrc(url);
    setSrc(null);
    removeWhiteBg(url).then((out) => {
      // null = catalog photo isn't on a clean white background → show no
      // bottle rather than an ugly photo box; admin sees a warning for it
      if (alive) setSrc(out);
    });
    return () => {
      alive = false;
    };
  }, [url, needsBgRemoval]);
  return src;
}

const badgeLabel = (stock: number) => (stock <= 0 ? "Sold Out" : `Only ${stock} Left`);

function NicheBottle({
  item,
  centerPct,
  delaySec,
}: {
  item: VaultProduct;
  centerPct: number;
  delaySec: number;
}) {
  const stagger = { animationDelay: `${delaySec}s` };
  const src = useBottleImage(item.image, item.needsBgRemoval);
  return (
    <>
      <span className="niche-light" style={{ left: `${centerPct}%`, ...stagger }} aria-hidden="true" />
      <span className="lamp-glow" style={{ left: `${centerPct}%`, ...stagger }} aria-hidden="true" />
      <span className="shelf-glow" style={{ left: `${centerPct}%`, ...stagger }} aria-hidden="true" />
      <span className="niche-badge" style={{ left: `${centerPct + 5.2}%` }}>{badgeLabel(item.stock)}</span>
      <span className="niche-shadow" style={{ left: `${centerPct}%` }} aria-hidden="true" />
      <Link
        className="niche-bottle"
        style={{ left: `${centerPct}%` }}
        href={`/products/${item.handle || item.id}`}
        aria-label={`View ${item.name}`}
      >
        {src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={item.name} loading="lazy" />
        )}
      </Link>
    </>
  );
}

function InfoCell({
  item,
  qty,
  onQtyChange,
  onAdded,
}: {
  item: VaultProduct;
  qty: number;
  onQtyChange: (id: string, qty: number) => void;
  onAdded: (item: VaultProduct, qty: number) => void;
}) {
  const addItem = useCartStore((st) => st.addItem);
  const soldOut = item.stock <= 0;
  const [state, setState] = useState<"idle" | "adding" | "added">("idle");

  const handleAdd = () => {
    if (soldOut || state !== "idle") return;
    setState("adding");
    addItem(item.product, qty);
    setTimeout(() => {
      setState("added");
      onAdded(item, qty);
      setTimeout(() => setState("idle"), 1100);
    }, 350);
  };

  const label = soldOut ? "Sold Out" : state === "adding" ? "Adding…" : state === "added" ? "✓ Added" : "Add to Cart";

  return (
    <div className="info-cell">
      <h3 className="product-name">{item.name}</h3>
      <p className="product-meta">
        {item.volume}
        {item.volume ? " · " : ""}
        {soldOut ? <span className="oos">Sold Out</span> : `Only ${item.stock} left`}
      </p>
      <p className="product-price">{formatCurrency(item.price)}</p>

      <div className="qty-control" aria-label={`Choose quantity for ${item.name}`}>
        <button
          type="button"
          disabled={soldOut || qty <= 1}
          aria-label={`Decrease quantity for ${item.name}`}
          onClick={() => onQtyChange(item.id, Math.max(1, qty - 1))}
        >
          −
        </button>
        <output aria-live="polite">{qty}</output>
        <button
          type="button"
          disabled={soldOut || qty >= item.stock}
          aria-label={`Increase quantity for ${item.name}`}
          onClick={() => onQtyChange(item.id, Math.min(item.stock, qty + 1))}
        >
          +
        </button>
      </div>

      <button
        className="add-to-cart"
        type="button"
        disabled={soldOut || state !== "idle"}
        aria-label={soldOut ? "Sold out" : `Add ${item.name} to cart`}
        onClick={handleAdd}
      >
        {label}
      </button>
    </div>
  );
}

export function RareWhiskeyVault() {
  const { data } = useQuery({
    queryKey: ["vault"],
    queryFn: fetchVault,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});
  const [page, setPage] = useState(0);
  const [fading, setFading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const products = data?.products ?? [];
  const pageCount = Math.max(1, Math.ceil(products.length / NICHE_COUNT));

  useEffect(() => {
    setPage((prev) => Math.min(prev, pageCount - 1));
  }, [pageCount]);

  // Admin switched the section off, or nothing to display → render nothing.
  if (!data || !data.settings.enabled || products.length === 0) return null;

  const goToPage = (next: number) => {
    if (next === page || fading) return;
    setFading(true);
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    fadeTimer.current = setTimeout(() => {
      setPage(next);
      setFading(false);
    }, 220);
  };

  const showToast = (item: VaultProduct, qty: number) => {
    setToast(`${qty} × ${item.name} added to cart`);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2300);
  };

  const pageItems = products.slice(page * NICHE_COUNT, page * NICHE_COUNT + NICHE_COUNT);
  const fadeCls = fading ? " is-fading" : "";

  return (
    <section className="bg-[#050505] py-4 rwv">
      <style dangerouslySetInnerHTML={{ __html: vaultCSS }} />
      <div className="container-main">
        <section className={`rare-vault ${data.settings.lightFx ? "fx-on" : ""}`} aria-labelledby="vault-title">
          <h2 id="vault-title" className="vault-heading-sr">
            Rare Whiskey Vault
          </h2>

          <div className="vault-shell">
            {pageCount > 1 && (
              <button
                className="vault-arrow vault-arrow--left"
                type="button"
                aria-label="Previous bottles"
                disabled={page === 0 || fading}
                onClick={() => goToPage(Math.max(0, page - 1))}
              >
                ‹
              </button>
            )}

            <div className="cabinet-scroll">
              <div className="cabinet-inner">
                <div className="cabinet-stage">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="cabinet-bg" src="/vault/cabinet.jpg" alt="Rare Whiskey Vault display cabinet" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="vault-ornament ornament-left" src="/vault/ornament-deer.webp" alt="" aria-hidden="true" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="vault-ornament ornament-right" src="/vault/ornament-bison.webp" alt="" aria-hidden="true" />

                  <div className={`vault-page${fadeCls}`}>
                    {pageItems.map((p, i) => (
                      <NicheBottle key={p.id} item={p} centerPct={NICHE_CENTERS[i]} delaySec={i * 0.89} />
                    ))}
                  </div>

                  <div className="cabinet-depth" aria-hidden="true" />
                  <div className="cabinet-glass" aria-hidden="true" />
                </div>

                <div className={`info-row${fadeCls}`}>
                  {NICHE_CENTERS.map((_, i) => {
                    const p = pageItems[i];
                    if (!p) return <div key={`empty-${i}`} className="info-cell is-empty" />;
                    return (
                      <InfoCell
                        key={p.id}
                        item={p}
                        qty={qtyMap[p.id] || 1}
                        onQtyChange={(id, val) => setQtyMap((prev) => ({ ...prev, [id]: val }))}
                        onAdded={showToast}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {pageCount > 1 && (
              <button
                className="vault-arrow vault-arrow--right"
                type="button"
                aria-label="More bottles"
                disabled={page >= pageCount - 1 || fading}
                onClick={() => goToPage(Math.min(pageCount - 1, page + 1))}
              >
                ›
              </button>
            )}
          </div>

          {pageCount > 1 && (
            <div className="page-dots" role="tablist" aria-label="Vault pages">
              {Array.from({ length: pageCount }, (_, i) => (
                <button
                  key={i}
                  className="page-dot"
                  data-active={i === page}
                  role="tab"
                  aria-selected={i === page}
                  aria-label={`Page ${i + 1} of ${pageCount}`}
                  onClick={() => goToPage(i)}
                />
              ))}
            </div>
          )}

          <Link className="view-all" href="/products?tag=rare">
            View All Rare Items <span aria-hidden="true">→</span>
          </Link>
        </section>
      </div>

      <div className={`vault-toast ${toast ? "is-visible" : ""}`} role="status" aria-live="polite">
        {toast}
      </div>
    </section>
  );
}

/* CSS is inlined (same pattern as FlashDeals) so this section ships as one
   self-contained unit. Source of truth: rare-whiskey-vault.css in the handoff
   package — approved preview v4 (ornaments in header band, 5.46s lamp blink,
   auto-fit bottle slots). Scoped under .rwv to keep homepage styles safe. */
const vaultCSS = `/* ===========================================================================
   Rare Whiskey Vault — Cold Spring Liquor
   Everything here layers on top of assets/cabinet.jpg. The niche geometry
   (percentages below) is measured from that photo — if the photo is replaced,
   re-measure before changing these numbers. See README.md.
   =========================================================================== */

@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Poppins:wght@500;600;700&display=swap');

.rwv {
    --orange: #ff5a0a;
    --orange-dark: #c83c00;
    --gold: #d8a657;
    --gold-light: #f3d49a;
    --cream: #fff4df;
    --black: #050505;
    --wood-1: #1b0f08;
    --wood-2: #321809;
    --wood-3: #4a260f;
    --border: rgba(216, 166, 87, .72);
    --vault-width: 100%;
}
/* ---------- animated spotlights ----------
     NOTE: the cabinet photo already contains the lamp fixtures. We only overlay
     the light BEAM below them — drawing a second lamp disc doubles them up. */
.rwv .niche-light { position: absolute; top: 21%; width: 19%; height: 66%; transform: translateX(-50%); pointer-events: none; z-index: 1;
    background: radial-gradient(ellipse 50% 100% at 50% 0%, rgba(255,203,124,.72), rgba(255,178,84,.34) 38%, rgba(255,160,60,.12) 66%, transparent 82%);
    mix-blend-mode: screen; opacity: .72; }

/* pool of warm light spilling onto the shelf under the bottle */
.rwv .shelf-glow { position: absolute; bottom: 10.5%; width: 21%; height: 5.5%; transform: translateX(-50%); pointer-events: none; z-index: 1;
    border-radius: 50%; background: radial-gradient(ellipse at center, rgba(255,196,116,.4), rgba(255,170,70,.14) 45%, transparent 72%);
    mix-blend-mode: screen; }

/* interior depth: darkens the compartment corners so it reads recessed */
.rwv .cabinet-depth { position: absolute; inset: 0; pointer-events: none; z-index: 4;
    box-shadow: inset 0 0 55px 14px rgba(0,0,0,.5), inset 0 22px 30px -12px rgba(0,0,0,.55); }

/* bronze stag / bison ornaments — kept as separate high-res transparent
     images layered over the cabinet so they stay sharp instead of being
     softened by the background photo's downscale + JPEG compression */
.rwv .vault-ornament { position: absolute; top: 4.6%; height: 12.2%; width: auto; transform: translateX(-50%);
    pointer-events: none; z-index: 5; filter: drop-shadow(2px 4px 5px rgba(0,0,0,.7)); }
.rwv .ornament-left { left: 10.3%; }
.rwv .ornament-right { left: 89.9%; }

/* glass showcase front — deliberately faint (~6%) so it reads as glass, not haze */
.rwv .cabinet-glass { position: absolute; inset: 0; pointer-events: none; z-index: 6;
    background:
      radial-gradient(ellipse 42% 30% at 7% 5%, rgba(255,255,255,.11), transparent 72%),
      radial-gradient(ellipse 34% 24% at 94% 7%, rgba(255,255,255,.075), transparent 72%),
      linear-gradient(104deg, rgba(255,255,255,.055) 0%, rgba(255,255,255,0) 17%, rgba(255,255,255,0) 45%, rgba(255,255,255,.042) 51%, rgba(255,255,255,0) 59%),
      repeating-linear-gradient(90deg, rgba(255,255,255,.02) 0 1px, transparent 1px 52px); }

/* lamp twinkle — bright halo on each fixture; each niche gets a staggered
   animation-delay from the component so the bulbs take turns flaring */
.rwv .lamp-glow { position: absolute; top: 19.2%; width: 7.5%; height: 6%; transform: translateX(-50%);
    pointer-events: none; z-index: 2; border-radius: 50%;
    background: radial-gradient(ellipse 50% 50% at 50% 50%, rgba(255,214,140,.95), rgba(255,180,90,.4) 45%, transparent 70%);
    mix-blend-mode: screen; opacity: .5; }
.rwv .fx-on .lamp-glow { animation: lampBlink 5.46s ease-in-out infinite; }
.rwv .fx-on .niche-light { animation: beamBlink 5.46s ease-in-out infinite, beamTint 14s ease-in-out infinite; }
.rwv .fx-on .shelf-glow { animation: beamBlink 5.46s ease-in-out infinite, beamTint 14s ease-in-out infinite; }

@keyframes lampBlink { 0%,100%{opacity:.5} 8%{opacity:1} 13%{opacity:.3} 18%{opacity:.95} 48%{opacity:.75} 56%{opacity:.25} 62%{opacity:1} 80%{opacity:.6} }
@keyframes beamBlink { 0%,100%{opacity:.55} 8%{opacity:.95} 13%{opacity:.3} 18%{opacity:.9} 48%{opacity:.7} 56%{opacity:.28} 62%{opacity:.92} 80%{opacity:.6} }
@keyframes beamTint {
    0%,100% { filter: hue-rotate(0deg) saturate(1); }
    30%     { filter: hue-rotate(-14deg) saturate(1.25); }
    60%     { filter: hue-rotate(16deg) saturate(.9); }
}
/* fast blinking is a photosensitivity risk — respect the OS setting */
@media (prefers-reduced-motion: reduce) {
    .rwv .fx-on .niche-light, .rwv .fx-on .shelf-glow, .rwv .fx-on .lamp-glow { animation: none; }
}

/* ---------- pagination (cross-fade, no remount jump) ---------- */
.rwv .vault-page { position: absolute; inset: 0; opacity: 1; transition: opacity .22s ease; }
.rwv .vault-page.is-fading, .rwv .info-row.is-fading { opacity: 0; }
.rwv .info-row { transition: opacity .22s ease; }
.rwv .page-dots { display: flex; justify-content: center; gap: 7px; padding: 8px 0 0; }
.rwv .page-dot { width: 7px; height: 7px; padding: 0; border-radius: 50%; border: 1px solid var(--gold); background: transparent; cursor: pointer; transition: background .2s ease; }
.rwv .page-dot[data-active="true"] { background: var(--gold); }
.rwv .info-cell.is-empty { opacity: 0; pointer-events: none; }

/* ---------- vault removed / empty state ---------- */

/* ---------- admin panel ---------- */


.rwv .rare-vault { position: relative; overflow: hidden; margin: 12px 0; border-radius: 16px;
    border: 1px solid rgba(216,166,87,.5);
    background: linear-gradient(180deg, #1a1108 0%, #0e0905 55%, #080503 100%);
    box-shadow: 0 16px 42px rgba(0,0,0,.55), 0 0 78px 12px rgba(188,140,72,.14);
    padding-bottom: 12px; }

/* heading text is baked into the cabinet photo itself now — keep an
     accessible, visually-hidden heading for screen readers only */
.rwv .vault-heading-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; }

.rwv .cabinet-scroll { overflow-x: auto; overscroll-behavior-inline: contain; scrollbar-width: none; }
.rwv .cabinet-scroll::-webkit-scrollbar { display: none; }
.rwv .cabinet-inner { position: relative; width: var(--vault-width, 100%); }

/* overlays are positioned against the IMAGE ONLY, not image + info row */
.rwv .cabinet-stage { position: relative; line-height: 0; }
.rwv .cabinet-bg { display: block; width: 100%; height: auto; user-select: none; pointer-events: none; }

/* measured from the cabinet photo: shelf surface at 84.6%, spotlight at 22.5% */
.rwv .niche-bottle { position: absolute; bottom: 12.5%; height: 31%; width: 7.8%; transform: translateX(-50%); display: flex; align-items: flex-end; justify-content: center; z-index: 3; }
.rwv .niche-bottle img { width: 100%; height: 100%; object-fit: contain; object-position: center bottom; filter: drop-shadow(0 4px 6px rgba(0,0,0,.75)); transition: transform .22s ease; }
.rwv .niche-bottle:hover img { transform: translateY(-3px) scale(1.03); }

/* contact shadow pooled on the shelf under each bottle */
.rwv .niche-shadow { position: absolute; bottom: 11.5%; width: 9%; height: 2.4%; transform: translateX(-50%); border-radius: 50%; background: radial-gradient(ellipse at center, rgba(0,0,0,.85) 0%, rgba(0,0,0,.45) 45%, rgba(0,0,0,0) 72%); pointer-events: none; z-index: 2; }

/* badge sits in the niche's top-right corner, clear of the bottle */
.rwv .niche-badge { position: absolute; top: 25%; width: 30px; height: 30px; transform: translateX(-50%); display: grid; place-items: center; border: 1px solid var(--gold); border-radius: 50%; color: var(--gold-light); background: rgba(10,6,2,.94); font-size: 6px; font-weight: 800; line-height: 1.05; text-align: center; text-transform: uppercase; z-index: 8; }

/* info columns line up with the photo's actual niche widths and read as a
     continuation of the cabinet, not a separate black strip below it */
.rwv .info-row { position: relative; display: flex; align-items: stretch; padding: 0 7.06% 0 5.99%;
    background: linear-gradient(180deg, #1c130b 0%, #120c07 60%, #0c0805 100%); }
.rwv .info-cell { flex: 0 0 20%; width: 20%; display: flex; flex-direction: column; padding: 10px 5px 12px; text-align: center;
    border-left: 1px solid rgba(126,84,42,.38); min-width: 0; }
.rwv .info-cell:first-child { border-left: none; }

/* fixed-height text slots keep every column's rows on the same baseline */
.rwv .product-name { margin: 0; font-family: "Poppins", Inter, Arial, sans-serif; color: #fff7e8; font-size: 11px; font-weight: 600; line-height: 1.25; height: 28px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.rwv .product-meta { margin: 4px 0 0; font-family: "Poppins", Inter, Arial, sans-serif; color: #b7a68e; font-size: 7.5px; font-weight: 600; line-height: 1.2; letter-spacing: .08em; text-transform: uppercase; height: 10px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.rwv .product-meta .oos { color: #e06a5a; }
.rwv .product-price { margin: 3px 0 8px; color: var(--gold-light); font-family: "Cormorant Garamond", Georgia, serif; font-size: 19px; font-weight: 700; line-height: 1; height: 20px; }

.rwv .qty-control { margin-top: auto; display: grid; grid-template-columns: 1fr 1fr 1fr; min-height: 24px; border: 1px solid #737373; border-radius: 6px; overflow: hidden; background: #090909; }
.rwv .qty-control button, .rwv .qty-control output { border: 0; color: #fff; background: transparent; display: grid; place-items: center; font: inherit; }
.rwv .qty-control button { cursor: pointer; font-size: 13px; }
.rwv .qty-control button:hover:not(:disabled) { background: rgba(255,255,255,.08); }
.rwv .qty-control button:disabled { opacity: .28; cursor: not-allowed; }
.rwv .qty-control output { font-size: 10px; }

.rwv .add-to-cart { width: 100%; height: 26px; margin-top: 5px; border: 1px solid #ff7d39; border-radius: 6px; color: #fff; background: linear-gradient(#ff681a, #d94300); box-shadow: inset 0 1px rgba(255,255,255,.18); font-family: "Poppins", Inter, Arial, sans-serif; font-weight: 600; font-size: clamp(6.5px, 1.85vw, 9px); letter-spacing: -.01em; cursor: pointer; padding: 0 2px; white-space: nowrap; }


.rwv .add-to-cart:hover:not(:disabled) { filter: brightness(1.08); }
.rwv .add-to-cart:disabled { opacity: .42; cursor: not-allowed; }

.rwv .vault-shell { position: relative; }
.rwv .vault-arrow { position: absolute; top: 40%; z-index: 8; width: 38px; height: 38px; border: 1px solid var(--gold); border-radius: 50%; color: #fff; background: rgba(19,9,4,.9); font-size: 24px; line-height: 1; cursor: pointer; transform: translateY(-50%); display: flex; align-items: center; justify-content: center; }
.rwv .vault-arrow--left { left: 4px; }
.rwv .vault-arrow--right { right: 4px; }
.rwv .vault-arrow:disabled { opacity: .22; cursor: default; }

.rwv .view-all { width: fit-content; min-width: 180px; min-height: 34px; margin: 10px auto 0; padding: 0 18px; border: 1px solid rgba(216,166,87,.7); border-radius: 8px; color: #f3e7d0; background: rgba(6,4,2,.7); display: flex; align-items: center; justify-content: center; gap: 12px; text-decoration: none; font-family: "Cormorant Garamond", serif; font-size: 14.5px; font-weight: 700; cursor: pointer; }


@media (min-width: 700px) {
    .rwv .niche-badge { width: 44px; height: 44px; font-size: 8px; }
    .rwv .info-cell { padding: 18px 12px 22px; }
    .rwv .product-name { font-size: 15px; height: 38px; }
    .rwv .product-meta { font-size: 10px; height: 13px; margin-top: 6px; }
    .rwv .product-price { font-size: 27px; height: 28px; margin: 6px 0 12px; }
    .rwv .qty-control { min-height: 32px; }
    .rwv .qty-control output { font-size: 13px; }
    .rwv .add-to-cart { height: 34px; font-size: 11px; }
}
@media (max-width: 430px) {
    .rwv .rare-vault { border-radius: 14px; margin-inline: 4px; }
}

/* component-level extras (not part of the handoff cabinet css) */
.rwv * { box-sizing: border-box; }
.rwv .vault-toast { position: fixed; left: 50%; bottom: 24px; z-index: 99; max-width: calc(100vw - 32px);
  padding: 12px 18px; border: 1px solid rgba(255,255,255,.15); border-radius: 999px; color: #fff;
  background: rgba(20,20,20,.94); box-shadow: 0 10px 30px rgba(0,0,0,.4); opacity: 0; pointer-events: none;
  transform: translate(-50%, 12px); transition: .2s ease; font-size: 13px; }
.rwv .vault-toast.is-visible { opacity: 1; transform: translate(-50%, 0); }
`;
