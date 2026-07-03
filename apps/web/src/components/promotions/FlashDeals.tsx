"use client";

import { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Zap } from "lucide-react";
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
  return { h, m, s, expired: remaining === 0 };
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

function FlashDealRow({ deal }: { deal: Deal }) {
  const { h, m, s, expired } = useCountdown(deal.endsAt);
  const addItem = useCartStore((st) => st.addItem);
  const [popping, setPopping] = useState(false);
  const pct = Math.round(((deal.price - deal.salePrice) / deal.price) * 100);
  const maxStock = (deal as any).maxStock || 20;
  const stockPct = Math.min((deal.stockQty / maxStock) * 100, 100);
  const inStock = deal.stockQty > 0;

  const handleAdd = useCallback(() => {
    addItem(deal as any);
    setPopping(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setPopping(true)));
    setTimeout(() => setPopping(false), 300);
  }, [addItem, deal]);

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5 last:border-0">
      {/* Product image */}
      <Link href={`/products/${deal.slug}`} className="relative w-14 h-14 bg-white/5 rounded-xl overflow-hidden shrink-0 hover:opacity-80 transition-opacity">
        {deal.imageUrl ? (
          <Image src={deal.imageUrl} alt={deal.name} fill className="object-contain p-1" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">🥃</div>
        )}
      </Link>

      {/* Center: name, price, stock */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/products/${deal.slug}`}
          className="font-semibold text-white text-sm leading-snug line-clamp-1 hover:text-amber-400 transition-colors"
        >
          {deal.name}
        </Link>
        <p className="text-[11px] text-white/35 mb-1">{deal.volume}</p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-red-400 font-bold text-base leading-none">{formatCurrency(deal.salePrice)}</span>
          <span className="text-white/25 text-xs line-through">{formatCurrency(deal.price)}</span>
        </div>
        {/* Stock bar */}
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 bg-white/8 rounded-full h-[3px]">
            <div className="bg-red-500 h-[3px] rounded-full transition-all" style={{ width: `${stockPct}%` }} />
          </div>
          <span className="text-[10px] text-red-400 whitespace-nowrap shrink-0">
            {deal.stockQty} left
          </span>
        </div>
      </div>

      {/* Right: badge + timer + button */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className="bg-red-500 text-white text-[11px] font-black px-2 py-0.5 rounded-full leading-none">
          -{pct}%
        </span>
        {!expired ? (
          <span className="text-[10px] text-white/40 font-mono tabular-nums tracking-tight">
            ⏱ {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
          </span>
        ) : (
          <span className="text-[10px] text-white/30">Expired</span>
        )}
        <button
          onClick={handleAdd}
          disabled={expired || !inStock}
          className={`bg-red-500 hover:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${popping ? "animate-add-to-cart" : ""}`}
        >
          {expired ? "Expired" : !inStock ? "Out of Stock" : "+ Add"}
        </button>
      </div>
    </div>
  );
}

export function FlashDeals() {
  const { data: deals } = useQuery({
    queryKey: ["flash-deals"],
    queryFn: fetchFlashDeals,
  });

  const activeDeals = deals?.length ? deals : PLACEHOLDER_DEALS;

  return (
    <section id="flash-deals" className="bg-[#0a0a0a] py-6">
      <div className="container-main">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap size={15} className="text-red-400 fill-red-400 shrink-0" />
            <h2 className="font-heading text-base font-bold text-white leading-none">Flash Deals</h2>
            <span className="hidden sm:inline text-xs text-white/30 ml-1">Limited time · Limited stock</span>
          </div>
          <Link
            href="/products?flashdeal=true"
            className="text-xs text-white/40 hover:text-white transition-colors"
          >
            View all →
          </Link>
        </div>

        {/* Deal rows */}
        <div className="rounded-2xl border border-white/8 overflow-hidden">
          {activeDeals.map((deal: Deal) => (
            <FlashDealRow key={deal.id} deal={deal} />
          ))}
        </div>
      </div>
    </section>
  );
}
