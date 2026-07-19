"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";

function useCountdown(endsAt: string) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    function update() {
      const diff = new Date(endsAt).getTime() - Date.now();
      setRemaining(Math.max(diff, 0));
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  const h = Math.floor(remaining / 3_600_000);
  const m = Math.floor((remaining % 3_600_000) / 60_000);
  const s = Math.floor((remaining % 60_000) / 1000);
  return { h, m, s, remaining, expired: remaining === 0 };
}

async function fetchFlashDeals() {
  const res = await fetch("/api/deals/flash");
  if (!res.ok) return [];
  return res.json();
}

/* ── White-background removal for the dark card ─────────────────────────────
   Catalog photos are shot on white; on the dark card that shows as a white
   box. This erases only the CONTIGUOUS near-white region connected to the
   image border (flood fill), so white areas inside labels survive. Photos
   without a white background come back unchanged (null → original URL is
   used). Runs once per URL per session; falls back to the original image on
   any error (CORS, decode, …). */
const BG_WHITE_MIN = 232;   // r,g,b all above this count as background white
const BG_MAX_SIDE  = 480;   // image area renders ≤170px tall, 480px covers 2x retina
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
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, w, h);
        const id = ctx.getImageData(0, 0, w, h);
        const d = id.data;
        const isBg = (p: number) => d[p * 4] > BG_WHITE_MIN && d[p * 4 + 1] > BG_WHITE_MIN && d[p * 4 + 2] > BG_WHITE_MIN;

        // BFS flood fill from every near-white border pixel
        const visited = new Uint8Array(w * h);
        const queue: number[] = [];
        for (let x = 0; x < w; x++) queue.push(x, (h - 1) * w + x);
        for (let y = 0; y < h; y++) queue.push(y * w, y * w + w - 1);
        const pending: number[] = [];
        for (const p of queue) if (!visited[p] && isBg(p)) { visited[p] = 1; pending.push(p); }
        let head = 0;
        while (head < pending.length) {
          const p = pending[head++];
          const x = p % w, y = (p / w) | 0;
          if (x > 0 && !visited[p - 1] && isBg(p - 1)) { visited[p - 1] = 1; pending.push(p - 1); }
          if (x < w - 1 && !visited[p + 1] && isBg(p + 1)) { visited[p + 1] = 1; pending.push(p + 1); }
          if (y > 0 && !visited[p - w] && isBg(p - w)) { visited[p - w] = 1; pending.push(p - w); }
          if (y < h - 1 && !visited[p + w] && isBg(p + w)) { visited[p + w] = 1; pending.push(p + w); }
        }

        // No meaningful white background (dark/scene/transparent photo) — keep original
        if (pending.length < w * h * 0.02) return resolve(null);

        for (const p of pending) d[p * 4 + 3] = 0;

        // Feather: bright pixels touching the cleared region get partial alpha
        for (let p = 0; p < w * h; p++) {
          if (visited[p]) continue;
          const x = p % w, y = (p / w) | 0;
          const touches =
            (x > 0 && visited[p - 1]) || (x < w - 1 && visited[p + 1]) ||
            (y > 0 && visited[p - w]) || (y < h - 1 && visited[p + w]);
          if (!touches) continue;
          const i = p * 4;
          const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          if (lum > 200) d[i + 3] = Math.max(0, Math.min(255, Math.round(255 - ((lum - 200) * 255) / 55)));
        }

        ctx.putImageData(id, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null); // tainted canvas (no CORS) or decode issue — use original
      }
    };
    img.src = url;
  });
  bgRemovalCache.set(url, job);
  return job;
}

/* Bottle photo inside the fixed image frame: hidden until background removal
   resolves (either way) to avoid flashing the white box, then fades in.
   object-contain inside an absolutely-positioned box guarantees the product
   always fits the frame — never cropped, never overflowing. */
function BottleImg({ url, alt }: { url: string; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setSrc(null);
    removeWhiteBg(url).then((res) => { if (alive) setSrc(res ?? url); });
    return () => { alive = false; };
  }, [url]);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src ?? url}
      alt={alt}
      className="absolute inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)] object-contain rounded-[10px] transition-opacity duration-200"
      style={{ opacity: src ? 1 : 0, filter: "drop-shadow(0 8px 14px rgba(0,0,0,.5))" }}
      loading="lazy"
    />
  );
}

const PLACEHOLDER_DEALS = [
  {
    id: "1",
    name: "Casamigos Blanco Tequila",
    brand: "Casamigos",
    slug: "casamigos-blanco",
    price: 54.99,
    salePrice: 39.99,
    imageUrl: null,
    volume: "750ml",
    stockQty: 8,
    inStock: true,
    endsAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "2",
    name: "Tito's Handmade Vodka",
    brand: "Tito's",
    slug: "titos-handmade-vodka",
    price: 32.99,
    salePrice: 24.99,
    imageUrl: null,
    volume: "1L",
    stockQty: 15,
    inStock: true,
    endsAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "3",
    name: "Jameson Irish Whiskey",
    brand: "Jameson",
    slug: "jameson-irish-whiskey",
    price: 39.99,
    salePrice: 29.99,
    imageUrl: null,
    volume: "750ml",
    stockQty: 5,
    inStock: true,
    endsAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
  },
];

type Deal = (typeof PLACEHOLDER_DEALS)[0];

/* Carousel redesign (v3) — data, pricing, cart and countdown logic unchanged.
   One dark rounded box: left panel (title + shared countdown), right carousel
   of cards with scroll-snap, desktop arrow + mouse drag, dots below. */
const flashCSS = `
  .fd-box{
    position:relative;overflow:hidden;border-radius:28px;
    background:
      radial-gradient(ellipse 900px 500px at 0% 0%, rgba(210,90,20,.55), transparent 60%),
      linear-gradient(135deg,#1c0f05 0%,#0a0704 55%,#000 100%);
    border:1px solid #2a1c0e;
    padding:26px;
    display:flex;gap:26px;align-items:stretch;
  }
  .fd-box-bolt{
    position:absolute;left:-30px;top:-40px;width:260px;height:260px;
    opacity:.06;transform:rotate(-8deg);pointer-events:none;
  }
  .fd-panel{position:relative;z-index:1;flex:0 0 250px;display:flex;flex-direction:column;justify-content:flex-start;gap:16px;}
  .fd-panel-sub{color:#c9c2b8;font-size:14px;line-height:1.4;max-width:210px;}
  .fd-cd{background:rgba(0,0,0,.4);border:1px solid #3a2c18;border-radius:14px;padding:14px 16px;max-width:210px;}
  .fd-cd .lbl{font-size:11px;color:#a4a4a4;letter-spacing:.08em;text-align:center;margin-bottom:8px;}
  .fd-cd .digits{display:flex;justify-content:center;gap:6px;}
  .fd-cd .digit-block{text-align:center;}
  .fd-cd .digit{font-size:24px;font-weight:900;color:#F6B94A;font-variant-numeric:tabular-nums;}
  .fd-cd .digit-lbl{font-size:8px;color:#8a8a8a;letter-spacing:.05em;margin-top:2px;}
  .fd-cd .colon{font-size:22px;font-weight:900;color:#5a4a30;align-self:flex-start;}
  .fd-cd-name{display:block;margin-top:9px;padding-top:9px;border-top:1px solid #2a2010;font-size:11.5px;font-weight:800;color:#FF9F0A;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;}
  .fd-cd-name:hover{text-decoration:underline;}

  .fd-carousel-wrap{position:relative;flex:1;min-width:0;display:flex;align-items:center;}
  .fd-carousel{
    display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;
    -webkit-overflow-scrolling:touch;padding:2px 2px 6px;flex:1;
    scrollbar-width:none;cursor:grab;
  }
  .fd-carousel::-webkit-scrollbar{display:none;}
  .fd-carousel.dragging{cursor:grabbing;scroll-snap-type:none;}

  .fd-card{
    flex:0 0 82%;min-width:0;scroll-snap-align:start;
    background:linear-gradient(180deg,#161311,#0c0a08);
    border:1px solid #2a2420;
    border-radius:20px;padding:16px;position:relative;color:#fff;
    display:flex;flex-direction:column;
    box-shadow:0 14px 28px rgba(0,0,0,.45);
  }
  @media (min-width:640px){ .fd-card{ flex:0 0 300px; } }
  .fd-card.expired,.fd-card.soldout{ opacity:.55; }
  .fd-card.expired .fd-imgwrap,.fd-card.soldout .fd-imgwrap{ filter:grayscale(.6); }

  /* Fixed image frame: the product always renders INSIDE this box via
     object-contain — any aspect ratio fits, nothing is cropped or overflows. */
  .fd-imgwrap{position:relative;height:170px;flex:none;display:flex;align-items:center;justify-content:center;margin-bottom:12px;overflow:hidden;border-radius:14px;}
  .fd-spotlight{
    position:absolute;width:150px;height:150px;border-radius:50%;
    background:radial-gradient(circle, rgba(255,140,0,.16) 0%, rgba(255,140,0,0) 70%);
    z-index:0;
  }
  .fd-glow{
    position:absolute;width:115px;height:115px;border-radius:50%;
    box-shadow:0 0 26px 12px rgba(255,140,0,.22);
    z-index:0;
  }
  .fd-imglink{position:absolute;inset:0;z-index:1;display:block;}

  .fd-progress-track{background:#262220;border-radius:999px;height:6px;overflow:hidden;}
  .fd-progress-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,#FF9F0A,#FF7A00);}

  .fd-buy{
    margin-top:auto;border:1.5px solid #FF7A00;border-radius:999px;
    background:#000;color:#fff;font-weight:800;font-size:14px;
    padding:12px;display:flex;align-items:center;justify-content:center;gap:8px;
    cursor:pointer;transition:background .15s;min-height:46px;
  }
  .fd-buy:hover{background:#1e1512;}
  .fd-buy:disabled{border-color:#3a3a3a;color:#888;cursor:not-allowed;background:#111;}

  .fd-arrow{
    position:absolute;right:-4px;top:50%;transform:translateY(-50%);
    width:42px;height:42px;border-radius:50%;background:#111;border:1px solid #333;
    color:#fff;font-size:16px;display:flex;align-items:center;justify-content:center;
    cursor:pointer;z-index:3;box-shadow:0 6px 16px rgba(0,0,0,.4);
  }
  @media (max-width:760px){ .fd-arrow{ display:none; } }

  .fd-dots{display:flex;justify-content:center;gap:6px;margin-top:16px;}
  .fd-dot{width:6px;height:6px;border-radius:50%;background:#3a3a3a;cursor:pointer;transition:.2s;border:none;padding:0;}
  .fd-dot.active{width:18px;border-radius:3px;background:#FF9F0A;}

  /* Mobile: the panel collapses to just the compact clock (the "Flash Deals"
     title already appears in the section header above the box, so it isn't
     repeated here) with the product carousel right below it. */
  @media (max-width:760px){
    .fd-box{flex-direction:column;padding:16px 14px 20px;gap:14px;}
    .fd-panel{flex:none;flex-direction:row;align-items:center;gap:10px;}
    .fd-panel-sub{display:none;}
    .fd-cd{flex:none;max-width:186px;padding:7px 11px 8px;border-radius:12px;}
    .fd-cd .lbl{font-size:8.5px;margin-bottom:3px;}
    .fd-cd .digits{gap:4px;}
    .fd-cd .digit{font-size:16px;}
    .fd-cd .colon{font-size:14px;}
    .fd-cd .digit-lbl{font-size:6.5px;}
    .fd-cd-name{margin-top:4px;padding-top:4px;font-size:9.5px;max-width:164px;}
  }

  /* Very narrow screens (Galaxy Fold cover ~344px, small phones ≤420px):
     title + clock can't share one row — stack them full-width so nothing
     wraps or squeezes, and center the benefit tiles. */
  @media (max-width:420px){
    .fd-panel{flex-direction:column;align-items:stretch;gap:10px;}
    .fd-cd{max-width:100%;width:100%;padding:9px 12px 10px;}
    .fd-cd .digit{font-size:19px;}
    .fd-cd .colon{font-size:16px;}
    .fd-cd-name{max-width:100%;font-size:10.5px;}
    .fd-strip-item{flex-direction:column;text-align:center;gap:7px;}
    .fd-strip-item .fd-strip-icon{width:34px;height:34px;font-size:14px;}
    .fd-strip-item .fd-strip-title{font-size:12px;}
    .fd-strip-item .fd-strip-sub{font-size:10px;margin-top:1px;}
  }
`;

type DealState = "active" | "urgent" | "critical" | "expired" | "soldout";

function FlashDealCard({ deal }: { deal: Deal }) {
  const { remaining, expired } = useCountdown(deal.endsAt);
  const addItem = useCartStore((st) => st.addItem);
  const [popping, setPopping] = useState(false);

  const pct = Math.round(((deal.price - deal.salePrice) / deal.price) * 100);
  const maxStock = (deal as any).maxStock || 20;
  const stockPct = Math.max(0, Math.min((deal.stockQty / maxStock) * 100, 100));

  const state: DealState =
    deal.stockQty <= 0 ? "soldout"
    : expired ? "expired"
    : remaining <= 5 * 60 * 1000 ? "critical"
    : remaining <= 30 * 60 * 1000 ? "urgent"
    : "active";

  const buyable = state === "active" || state === "urgent" || state === "critical";

  const handleAdd = useCallback(() => {
    if (!buyable) return;
    addItem(deal as any);
    setPopping(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setPopping(true)));
    setTimeout(() => setPopping(false), 300);
  }, [addItem, deal, buyable]);

  const cardStateClass = state === "expired" ? "expired" : state === "soldout" ? "soldout" : "";

  return (
    <div className={`fd-card ${cardStateClass}`}>
      <div className="fd-imgwrap">
        {state === "soldout" ? (
          <span className="absolute top-0 left-0 z-[2] bg-[rgba(30,30,30,.7)] border border-[#555] rounded-full px-2.5 py-1 text-[10px] font-extrabold text-[#999] tracking-wide">SOLD OUT</span>
        ) : state === "expired" ? (
          <span className="absolute top-0 left-0 z-[2] bg-[rgba(30,30,30,.7)] border border-[#555] rounded-full px-2.5 py-1 text-[10px] font-extrabold text-[#999] tracking-wide">ENDED</span>
        ) : (
          <span className="absolute top-0 left-0 z-[2] flex items-center gap-[5px] bg-[rgba(0,0,0,.55)] border border-[rgba(255,159,10,.4)] rounded-full px-[11px] py-[5px] text-[10px] font-extrabold text-white tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF9F0A]" style={{ boxShadow: "0 0 5px #FF9F0A" }} />
            LIVE
          </span>
        )}

        {state !== "soldout" && (
          <span
            className="absolute top-0 right-0 z-[2] text-center text-white font-extrabold rounded-xl px-3 py-1.5 leading-tight"
            style={{ background: "linear-gradient(135deg,#FF9F0A,#FF3B30)", boxShadow: "0 4px 10px rgba(0,0,0,.4)" }}
          >
            <span className="block text-[15px]">{pct}%</span>
            <span className="block text-[8px] tracking-wide">OFF</span>
          </span>
        )}

        <div className="fd-spotlight" />
        <div className="fd-glow" />

        <Link href={`/products/${deal.slug}`} className="fd-imglink hover:opacity-90 transition-opacity" draggable={false}>
          {deal.imageUrl ? (
            <BottleImg url={deal.imageUrl} alt={deal.name} />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-6xl">🥃</span>
          )}
        </Link>
      </div>

      <Link href={`/products/${deal.slug}`} className="text-white font-extrabold text-base leading-tight truncate hover:text-amber-400 transition-colors" draggable={false}>
        {deal.name}
      </Link>
      <p className="text-xs text-[#9a9a9a] mt-0.5 mb-2">{deal.volume}</p>

      <div className="flex items-baseline gap-[9px] mb-2.5">
        <span className="text-[13px] text-[#7a7a7a] line-through">{formatCurrency(deal.price)}</span>
        <span className="text-[23px] font-black text-[#FF9F0A]">{formatCurrency(deal.salePrice)}</span>
      </div>

      <div className="mb-3.5">
        <div className="fd-progress-track">
          <div className="fd-progress-fill" style={{ width: `${stockPct}%`, background: stockPct <= 20 ? "#FF3B30" : undefined }} />
        </div>
        <div className={`flex justify-end text-[11px] mt-[5px] ${stockPct <= 20 && state !== "soldout" ? "text-[#FF3B30] font-bold" : "text-[#9a9a9a]"}`}>
          {state === "soldout" ? "Sold Out" : `${deal.stockQty} left`}
        </div>
      </div>

      <button className={`fd-buy ${popping ? "animate-add-to-cart" : ""}`} onClick={handleAdd} disabled={!buyable}>
        {buyable ? (
          <>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" strokeWidth="2" aria-hidden="true">
              <circle cx="9" cy="20" r="1.4" fill="#fff" stroke="none" />
              <circle cx="18" cy="20" r="1.4" fill="#fff" stroke="none" />
              <path d="M2 3h2l2.6 12.4a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L21 7H6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            BUY NOW
          </>
        ) : state === "soldout" ? "SOLD OUT" : "DEAL ENDED"}
      </button>
    </div>
  );
}

/* The panel clock always tracks the deal ending SOONEST (still in stock),
   shows that product's name under the digits, and rolls over to the next
   soonest deal automatically when one expires. */
function PanelCountdown({ deals }: { deals: Deal[] }) {
  const [nowTs, setNowTs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const soonest = useMemo(() => {
    const live = deals.filter((d) => new Date(d.endsAt).getTime() > nowTs && d.stockQty > 0);
    if (!live.length) return null;
    return live.reduce((a, b) => (new Date(a.endsAt).getTime() <= new Date(b.endsAt).getTime() ? a : b));
  }, [deals, nowTs]);

  if (!soonest) return null;

  const remaining = Math.max(0, new Date(soonest.endsAt).getTime() - nowTs);
  const h = Math.floor(remaining / 3_600_000);
  const m = Math.floor((remaining % 3_600_000) / 60_000);
  const s = Math.floor((remaining % 60_000) / 1000);
  const blocks = [
    { v: String(h).padStart(2, "0"), lbl: "HRS" },
    { v: String(m).padStart(2, "0"), lbl: "MINS" },
    { v: String(s).padStart(2, "0"), lbl: "SECS" },
  ];
  return (
    <div className="fd-cd">
      <div className="lbl">NEXT DEAL ENDS IN</div>
      <div className="digits">
        {blocks.map((b, i) => (
          <span key={b.lbl} className="contents">
            {i > 0 && <span className="colon">:</span>}
            <span className="digit-block">
              <span className="digit block">{b.v}</span>
              <span className="digit-lbl block">{b.lbl}</span>
            </span>
          </span>
        ))}
      </div>
      <Link href={`/products/${soonest.slug}`} className="fd-cd-name" title={soonest.name}>
        ⚡ {soonest.name}
      </Link>
    </div>
  );
}

const BENEFITS = [
  { icon: "🏷️", title: "Best Prices", sub: "Unbeatable deals" },
  { icon: "⚡", title: "Limited Time", sub: "Deals end soon" },
  { icon: "✔", title: "100% Authentic", sub: "Guaranteed quality" },
  { icon: "🚚", title: "Fast Pickup", sub: "Ready in store" },
];

export function FlashDeals() {
  const { data: deals } = useQuery({
    queryKey: ["flash-deals"],
    queryFn: fetchFlashDeals,
  });
  const carRef = useRef<HTMLDivElement>(null);
  const [activeDot, setActiveDot] = useState(0);

  const activeDeals: Deal[] = deals?.length ? deals : PLACEHOLDER_DEALS;

  // Scroll-driven dots
  const syncDots = useCallback(() => {
    const car = carRef.current;
    if (!car || !car.children.length) return;
    const center = car.scrollLeft + car.clientWidth / 2;
    let best = 0, bestDist = Infinity;
    Array.from(car.children).forEach((c, i) => {
      const el = c as HTMLElement;
      const dist = Math.abs(el.offsetLeft - car.offsetLeft + el.offsetWidth / 2 - center);
      if (dist < bestDist) { bestDist = dist; best = i; }
    });
    setActiveDot(best);
  }, []);

  const scrollToIndex = useCallback((i: number) => {
    const car = carRef.current;
    if (!car) return;
    const el = car.children[i] as HTMLElement | undefined;
    if (!el) return;
    car.scrollTo({ left: car.scrollLeft + el.getBoundingClientRect().left - car.getBoundingClientRect().left - 2, behavior: "smooth" });
  }, []);

  const arrowNext = useCallback(() => {
    const car = carRef.current;
    if (!car) return;
    const first = car.firstElementChild as HTMLElement | null;
    car.scrollBy({ left: first ? first.offsetWidth + 16 : 300, behavior: "smooth" });
  }, []);

  // Desktop mouse-drag scrolling; suppresses the click if the user dragged
  useEffect(() => {
    const car = carRef.current;
    if (!car) return;
    let down = false, dragged = false, startX = 0, startScroll = 0;
    const onDown = (e: MouseEvent) => {
      down = true; dragged = false;
      startX = e.pageX; startScroll = car.scrollLeft;
      car.classList.add("dragging");
    };
    const onMove = (e: MouseEvent) => {
      if (!down) return;
      if (Math.abs(e.pageX - startX) > 5) dragged = true;
      if (dragged) { e.preventDefault(); car.scrollLeft = startScroll - (e.pageX - startX); }
    };
    const onUp = () => {
      if (!down) return;
      down = false;
      car.classList.remove("dragging");
    };
    const onClick = (e: MouseEvent) => {
      if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; }
    };
    car.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    car.addEventListener("click", onClick, true);
    return () => {
      car.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      car.removeEventListener("click", onClick, true);
    };
  }, []);

  return (
    <section id="flash-deals" className="bg-[#050505] py-8">
      <style dangerouslySetInnerHTML={{ __html: flashCSS }} />
      <div className="container-main">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
          <div className="flex items-center gap-3">
            <span className="text-[30px] max-[480px]:text-[24px]" style={{ filter: "drop-shadow(0 0 8px rgba(255,159,10,.6))" }}>⚡</span>
            <div>
              <h2 className="font-heading text-[24px] max-[480px]:text-[20px] font-black text-white leading-none">
                FLASH <span className="text-[#FF9F0A]">DEALS</span>
              </h2>
              <p className="text-[#A4A4A4] text-[13px] max-[480px]:text-xs mt-1">Premium deals. Limited time only.</p>
            </div>
          </div>
          <Link
            href="/products?flashdeal=true"
            className="bg-transparent border-[1.5px] border-[#FF7A00] rounded-full text-white font-extrabold text-[13px] max-[480px]:text-xs px-[22px] py-[11px] max-[480px]:px-4 max-[480px]:py-2 inline-flex items-center gap-2 whitespace-nowrap transition-all hover:shadow-[0_0_16px_rgba(255,122,0,.5)]"
          >
            VIEW ALL DEALS →
          </Link>
        </div>

        {/* Dark box: left panel + carousel */}
        <div className="fd-box">
          <svg className="fd-box-bolt" viewBox="0 0 100 100" fill="#FF9F0A" aria-hidden="true">
            <path d="M55 0 L20 55 H45 L35 100 L85 40 H55 Z" />
          </svg>

          <div className="fd-panel">
            <div className="fd-panel-sub">Unbeatable deals for a limited time</div>
            <PanelCountdown deals={activeDeals} />
          </div>

          <div className="fd-carousel-wrap">
            <div className="fd-carousel" ref={carRef} onScroll={() => requestAnimationFrame(syncDots)}>
              {activeDeals.map((deal: Deal) => (
                <FlashDealCard key={deal.id} deal={deal} />
              ))}
            </div>
            {activeDeals.length > 1 && (
              <button className="fd-arrow" onClick={arrowNext} aria-label="Next deals">❯</button>
            )}
          </div>
        </div>

        {/* Dots */}
        {activeDeals.length > 1 && (
          <div className="fd-dots">
            {activeDeals.map((d: Deal, i: number) => (
              <button
                key={d.id}
                className={`fd-dot ${i === activeDot ? "active" : ""}`}
                onClick={() => scrollToIndex(i)}
                aria-label={`Go to deal ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* Benefit strip */}
        <div className="mt-5 bg-[#0B0B0B] border border-[#222] rounded-[20px] p-5 flex max-[700px]:flex-wrap max-[700px]:gap-4">
          {BENEFITS.map((b, i) => (
            <div key={b.title} className={`fd-strip-item flex-1 max-[700px]:flex-none max-[700px]:w-[calc(50%-8px)] flex items-center gap-3 px-4 max-[700px]:px-0 relative ${i > 0 ? "min-[701px]:before:content-[''] min-[701px]:before:absolute min-[701px]:before:left-0 min-[701px]:before:top-[10%] min-[701px]:before:bottom-[10%] min-[701px]:before:w-px min-[701px]:before:bg-[#222]" : ""}`}>
              <div className="fd-strip-icon w-[42px] h-[42px] rounded-full border-[1.5px] border-[#F6B94A] flex items-center justify-center flex-none text-[#F6B94A] text-lg">
                {b.icon}
              </div>
              <div>
                <div className="fd-strip-title text-[13px] font-extrabold text-white">{b.title}</div>
                <div className="fd-strip-sub text-[11px] text-[#A4A4A4] mt-px">{b.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
