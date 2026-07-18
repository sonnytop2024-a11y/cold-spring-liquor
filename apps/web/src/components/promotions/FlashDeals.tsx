"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
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

/* Redesigned card UI (v2) — data, pricing, cart and countdown logic unchanged.
   The border streak is a rotating conic-gradient on ::before; the glow ring
   behind the bottle is static CSS. */
const flashCSS = `
  .fd-row{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;}
  @media (max-width:1180px){ .fd-row{ grid-template-columns:repeat(2,1fr); } }
  @media (max-width:760px){
    /* full-bleed scroll row: cards snap flush with the container's left edge,
       with a peek of the next card on the right */
    .fd-row{display:flex;overflow-x:auto;gap:12px;scroll-snap-type:x mandatory;
      margin-inline:-16px;padding-inline:16px;scroll-padding-left:16px;
      padding-bottom:6px;-webkit-overflow-scrolling:touch;scrollbar-width:none;}
    .fd-row::-webkit-scrollbar{display:none;}
    .fd-card{flex:0 0 80vw;scroll-snap-align:start;}
  }
  @media (max-width:480px){ .fd-card{ flex:0 0 76vw; } }

  .fd-card{position:relative;border-radius:26px;overflow:hidden;isolation:isolate;background:#000;}
  .fd-card::before{
    content:"";position:absolute;inset:-1.5px;border-radius:inherit;
    background:conic-gradient(from 0deg,
      transparent 0deg, transparent 331deg,
      rgba(255,122,0,0) 336deg, rgba(255,122,0,.9) 342deg,
      rgba(255,59,48,1) 347deg, rgba(246,185,74,.95) 352deg,
      rgba(255,122,0,0) 360deg);
    animation:fdSpin 5s linear infinite;
    z-index:0;
  }
  .fd-card.expiring::before{ animation-duration:2.5s; }
  .fd-card.expired::before,.fd-card.soldout::before{ animation:none; background:transparent; }
  .fd-card.expired,.fd-card.soldout{ border:1px solid #333; }
  .fd-card.paused::before{ animation-play-state:paused; }
  @media (prefers-reduced-motion:reduce){
    .fd-card::before{ animation:none !important; background:conic-gradient(#F6B94A,#FF7A00,#FF3B30,#F6B94A); }
  }
  @keyframes fdSpin{ to{ transform:rotate(360deg); } }

  .fd-card-inner{position:relative;z-index:1;margin:2px;border-radius:24px;background:#090909;padding:16px 16px 18px;display:flex;flex-direction:column;height:calc(100% - 4px);border:1px solid #1c1c1c;}
  @media (max-width:480px){ .fd-card-inner{ padding:12px 12px 14px; border-radius:20px; } }
  .fd-card.expired .fd-card-inner,.fd-card.soldout .fd-card-inner{ opacity:.55; }

  /* Full-bleed image area: the product photo itself, blurred and oversized,
     fills the whole area as a backdrop (so no rectangle edge shows on the
     dark card), the sharp photo sits centered on top with side-edge fades,
     and a vignette blends everything into the card body. Works with white
     catalog photos and dark scene photos alike — no per-image cropping. */
  .fd-imgwrap{position:relative;height:250px;margin-bottom:14px;overflow:hidden;border-radius:16px;background:#0D0D0D;}
  @media (max-width:480px){ .fd-imgwrap{ height:180px; margin-bottom:10px; border-radius:12px; } }
  .fd-bgblur{position:absolute;inset:-24px;z-index:0;pointer-events:none;}
  .fd-bgblur img{filter:blur(24px) saturate(1.1) brightness(.85);}
  .fd-card.expired .fd-bgblur img,.fd-card.soldout .fd-bgblur img{filter:blur(24px) grayscale(1) brightness(.5);}
  .fd-sharp{
    position:absolute;inset:0;z-index:2;
    -webkit-mask-image:linear-gradient(90deg, transparent 0, #000 16%, #000 84%, transparent 100%);
    mask-image:linear-gradient(90deg, transparent 0, #000 16%, #000 84%, transparent 100%);
  }
  .fd-sharp img{filter:drop-shadow(0 12px 28px rgba(0,0,0,.55));}
  .fd-card.expired .fd-sharp,.fd-card.soldout .fd-sharp{ filter:grayscale(.6); }
  .fd-vignette{
    position:absolute;inset:0;z-index:3;pointer-events:none;
    background:
      radial-gradient(115% 95% at 50% 45%, transparent 48%, rgba(9,9,9,.6) 100%),
      linear-gradient(180deg, rgba(9,9,9,.25), transparent 26%, transparent 74%, rgba(9,9,9,.45));
  }

  .fd-countdown .cd-time.critical{animation:cdPulse 1s ease-in-out infinite;}
  @keyframes cdPulse{ 0%,100%{opacity:1;} 50%{opacity:.55;} }
  @media (prefers-reduced-motion:reduce){ .fd-countdown .cd-time.critical{ animation:none; } }
`;

type DealState = "active" | "urgent" | "critical" | "expired" | "soldout";

function FlashDealCard({ deal }: { deal: Deal }) {
  const { h, m, s, remaining, expired } = useCountdown(deal.endsAt);
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

  const cardStateClass = state === "expired" ? "expired" : state === "soldout" ? "soldout" : state === "critical" ? "expiring" : "";
  const barColor = stockPct <= 20 ? "#FF3B30" : stockPct <= 50 ? "linear-gradient(90deg,#FF7A00,#FF3B30)" : "linear-gradient(90deg,#FF9F0A,#FF7A00)";
  const cdColor = state === "critical" ? "#FF3B30" : state === "urgent" ? "#FF9F0A" : "#F6B94A";
  const cdText = state === "expired" ? "00 : 00 : 00"
    : `${String(h).padStart(2, "0")} : ${String(m).padStart(2, "0")} : ${String(s).padStart(2, "0")}`;

  return (
    <div className={`fd-card ${cardStateClass}`}>
      <div className="fd-card-inner">
        <div className="fd-imgwrap">
          {deal.imageUrl && (
            <div className="fd-bgblur">
              <Image src={deal.imageUrl} alt="" aria-hidden fill className="object-cover" sizes="480px" />
            </div>
          )}

          {state === "soldout" ? (
            <div className="absolute top-2 left-2 z-[5] bg-[rgba(30,30,30,.7)] border border-[#555] rounded-full px-2.5 py-1 text-[10px] font-extrabold text-[#999] tracking-wide">SOLD OUT</div>
          ) : state === "expired" ? (
            <div className="absolute top-2 left-2 z-[5] bg-[rgba(30,30,30,.7)] border border-[#555] rounded-full px-2.5 py-1 text-[10px] font-extrabold text-[#999] tracking-wide">ENDED</div>
          ) : (
            <div className="absolute top-2 left-2 z-[5] flex items-center gap-1.5 bg-[rgba(10,20,12,.6)] border border-[#30D158] rounded-full px-2.5 py-1 text-[10px] font-extrabold text-[#30D158] tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-[#30D158]" style={{ boxShadow: "0 0 6px #30D158" }} />
              LIVE
            </div>
          )}

          {state !== "soldout" && (
            <div
              className="absolute top-1.5 right-1.5 z-[5] text-center text-white font-extrabold rounded-xl px-2.5 py-1.5 leading-tight"
              style={{ background: "linear-gradient(135deg,#FF3B30,#FF7A00)", boxShadow: "0 4px 10px rgba(0,0,0,.4)" }}
            >
              <div className="text-base max-[480px]:text-sm">{pct}%</div>
              <div className="text-[8px] tracking-widest">SAVE</div>
            </div>
          )}

          <Link href={`/products/${deal.slug}`} className="fd-sharp block hover:opacity-90 transition-opacity">
            {deal.imageUrl ? (
              <Image src={deal.imageUrl} alt={deal.name} fill className="object-contain py-2" sizes="(max-width: 480px) 76vw, 400px" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl max-[480px]:text-4xl">🥃</div>
            )}
          </Link>
          <div className="fd-vignette" />
        </div>

        <Link href={`/products/${deal.slug}`} className="text-white font-extrabold text-[19px] max-[480px]:text-[16px] leading-tight line-clamp-2 min-h-[2.5em] max-[480px]:min-h-[2.3em] hover:text-amber-400 transition-colors">
          {deal.name}
        </Link>
        <p className="text-xs max-[480px]:text-[11px] text-[#A4A4A4] mt-0.5 mb-2">{deal.volume}</p>

        <div className="flex items-baseline gap-2 mb-2.5">
          <span className="text-[28px] max-[480px]:text-[22px] font-black text-[#FF9F0A]">{formatCurrency(deal.salePrice)}</span>
          <span className="text-sm max-[480px]:text-xs text-[#8a8a8a] line-through">{formatCurrency(deal.price)}</span>
        </div>

        <div className="mb-2.5">
          <div className="bg-[#1c1c1c] rounded-full h-[7px] overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${stockPct}%`, background: barColor }} />
          </div>
          <div className={`flex justify-end text-[11px] max-[480px]:text-[10px] mt-1 ${stockPct <= 20 && state !== "soldout" ? "text-[#FF3B30] font-bold" : "text-[#A4A4A4]"}`}>
            {state === "soldout" ? "Sold Out" : `${deal.stockQty} left`}
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2.5 pt-2.5 border-t border-[#1c1c1c]">
          <div className="fd-countdown">
            <div className="flex items-center gap-1 text-[#8a8a8a] text-[10px] max-[480px]:text-[9px] mb-0.5">⏱ ENDS IN</div>
            <div className={`cd-time font-extrabold text-sm max-[480px]:text-[13px] tabular-nums tracking-wide ${state === "critical" ? "critical" : ""}`} style={{ color: cdColor }}>
              {cdText}
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={!buyable}
            className={`rounded-2xl px-5 py-3 max-[480px]:px-3.5 max-[480px]:py-2.5 min-h-[48px] max-[480px]:min-h-[42px] font-extrabold text-[15px] max-[480px]:text-[13px] whitespace-nowrap inline-flex items-center gap-1.5 transition-all
              ${buyable
                ? "text-white hover:-translate-y-0.5 hover:scale-[1.02]"
                : state === "soldout"
                  ? "bg-[#4a1414] text-[#d99] cursor-not-allowed"
                  : "bg-[#333] text-[#888] cursor-not-allowed"}
              ${popping ? "animate-add-to-cart" : ""}`}
            style={buyable ? { background: "linear-gradient(90deg,#FF9F0A,#FF3B30)", boxShadow: "0 6px 14px rgba(255,90,20,.35)" } : undefined}
          >
            {buyable ? <>🛒 BUY NOW</> : state === "soldout" ? "SOLD OUT" : "DEAL ENDED"}
          </button>
        </div>
      </div>
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
  const rowRef = useRef<HTMLDivElement>(null);

  const activeDeals = deals?.length ? deals : PLACEHOLDER_DEALS;

  // Pause the border animation for cards that are off-screen
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.target.classList.toggle("paused", !e.isIntersecting)),
      { threshold: 0.1 }
    );
    row.querySelectorAll(".fd-card").forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [activeDeals]);

  return (
    <section id="flash-deals" className="bg-[#050505] py-8">
      <style dangerouslySetInnerHTML={{ __html: flashCSS }} />
      <div className="container-main">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-[34px] max-[480px]:text-[26px]" style={{ filter: "drop-shadow(0 0 8px rgba(255,159,10,.6))" }}>⚡</span>
            <div>
              <h2 className="font-heading text-[28px] max-[480px]:text-[22px] font-black text-white leading-none">
                FLASH{" "}
                <span style={{ background: "linear-gradient(90deg,#FF9F0A,#FF7A00)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
                  DEALS
                </span>
              </h2>
              <p className="text-[#A4A4A4] text-sm max-[480px]:text-xs mt-1">Premium deals. Limited time only.</p>
            </div>
          </div>
          <Link
            href="/products?flashdeal=true"
            className="bg-black border-[1.5px] border-[#FF7A00] rounded-full text-white font-extrabold text-sm max-[480px]:text-xs px-6 py-3 max-[480px]:px-4 max-[480px]:py-2 inline-flex items-center gap-2 whitespace-nowrap transition-all hover:-translate-y-px hover:shadow-[0_0_18px_rgba(255,122,0,.55)]"
          >
            VIEW ALL DEALS →
          </Link>
        </div>

        {/* Cards */}
        <div className="fd-row" ref={rowRef}>
          {activeDeals.map((deal: Deal) => (
            <FlashDealCard key={deal.id} deal={deal} />
          ))}
        </div>

        {/* Benefit strip */}
        <div className="mt-6 bg-[#0B0B0B] border border-[#222] rounded-[20px] p-5 flex max-[700px]:flex-wrap max-[700px]:gap-4">
          {BENEFITS.map((b, i) => (
            <div key={b.title} className={`flex-1 max-[700px]:flex-none max-[700px]:w-[calc(50%-8px)] flex items-center gap-3 px-4 max-[700px]:px-0 relative ${i > 0 ? "min-[701px]:before:content-[''] min-[701px]:before:absolute min-[701px]:before:left-0 min-[701px]:before:top-[10%] min-[701px]:before:bottom-[10%] min-[701px]:before:w-px min-[701px]:before:bg-[#222]" : ""}`}>
              <div className="w-[42px] h-[42px] rounded-full border-[1.5px] border-[#F6B94A] flex items-center justify-center flex-none text-[#F6B94A] text-lg">
                {b.icon}
              </div>
              <div>
                <div className="text-[13px] font-extrabold text-white">{b.title}</div>
                <div className="text-[11px] text-[#A4A4A4] mt-px">{b.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
