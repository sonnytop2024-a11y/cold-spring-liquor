"use client";

import { useEffect, useState } from "react";
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

function TimerUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-dark-900 text-white rounded-lg px-2.5 py-1.5 text-center min-w-[3rem]">
      <p className="text-xl font-bold font-mono leading-none">{String(value).padStart(2, "0")}</p>
      <p className="text-[9px] uppercase tracking-widest text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

async function fetchFlashDeals() {
  const res = await fetch("/api/deals/flash");
  if (!res.ok) return [];
  return res.json();
}

// Placeholder deals for when API isn't ready
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

function FlashDealCard({ deal }: { deal: (typeof PLACEHOLDER_DEALS)[0] }) {
  const { h, m, s, expired } = useCountdown(deal.endsAt);
  const addItem = useCartStore((st) => st.addItem);
  const pct = Math.round(((deal.price - deal.salePrice) / deal.price) * 100);
  const stockPct = Math.min((deal.stockQty / 20) * 100, 100);

  return (
    <div className="bg-white rounded-2xl border-2 border-red-200 overflow-hidden">
      <div className="bg-red-500 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-white font-bold text-sm">
          <Zap size={14} className="fill-white" />
          FLASH DEAL — {pct}% OFF
        </div>
        {!expired ? (
          <div className="flex items-center gap-1">
            <TimerUnit value={h} label="hrs" />
            <span className="text-white font-bold text-sm">:</span>
            <TimerUnit value={m} label="min" />
            <span className="text-white font-bold text-sm">:</span>
            <TimerUnit value={s} label="sec" />
          </div>
        ) : (
          <span className="text-white text-sm font-bold">EXPIRED</span>
        )}
      </div>

      <div className="p-4 flex gap-4">
        <div className="relative w-20 h-20 bg-gray-50 rounded-xl overflow-hidden shrink-0">
          {deal.imageUrl ? (
            <Image src={deal.imageUrl} alt={deal.name} fill className="object-contain p-1" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl">🥃</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 uppercase tracking-wide">{deal.brand}</p>
          <Link href={`/products/${deal.slug}`} className="font-semibold hover:text-brand-600 line-clamp-2 text-sm">
            {deal.name}
          </Link>
          <p className="text-xs text-gray-400 mb-1">{deal.volume}</p>
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-red-600 text-lg">{formatCurrency(deal.salePrice)}</span>
            <span className="text-sm text-gray-400 line-through">{formatCurrency(deal.price)}</span>
          </div>
          {/* Stock bar */}
          <div className="mt-2">
            <div className="bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-red-500 h-1.5 rounded-full transition-all"
                style={{ width: `${stockPct}%` }}
              />
            </div>
            <p className="text-[10px] text-red-500 font-medium mt-0.5">
              Only {deal.stockQty} left!
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <button
          onClick={() => addItem(deal as any)}
          disabled={expired || !deal.inStock}
          className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-2.5 rounded-xl transition-colors text-sm"
        >
          {expired ? "Deal Expired" : "Add to Cart"}
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
    <section className="py-12 container-main">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-red-500 text-white p-2 rounded-lg">
            <Zap size={20} className="fill-white" />
          </div>
          <div>
            <h2 className="font-heading text-2xl font-bold leading-none">Flash Deals</h2>
            <p className="text-sm text-gray-500">Limited time · Limited stock</p>
          </div>
        </div>
        <Link href="/products?sale=flash" className="text-brand-600 hover:underline text-sm font-medium">
          View all deals →
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {activeDeals.map((deal: (typeof PLACEHOLDER_DEALS)[0]) => (
          <FlashDealCard key={deal.id} deal={deal} />
        ))}
      </div>
    </section>
  );
}
