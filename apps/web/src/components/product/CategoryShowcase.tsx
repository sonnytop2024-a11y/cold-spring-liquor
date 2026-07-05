"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2, Zap, Sparkles } from "lucide-react";

interface Category {
  value: string;
  label: string;
  emoji: string;
}

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const catImg = (value: string) => `${SUPA}/storage/v1/object/public/csl-images/categories/${value}.webp`;

// Short blurbs per category — anything new added in Admin falls back to "Shop {label}"
const DESCRIPTIONS: Record<string, string> = {
  whiskey:   "Bourbon, Rye, Irish & more",
  scotch:    "Single Malt, Blended & more",
  vodka:     "Premium Vodka & more",
  tequila:   "Blanco, Reposado, Añejo & more",
  rum:       "White, Gold, Dark & Spiced",
  gin:       "London Dry, Flavored & more",
  wine:      "Red, White, Rosé & more",
  champagne: "Brut, Rosé, Vintage & more",
  beer:      "Domestic, Import & Craft",
  cognac:    "VS, VSOP, XO & more",
  rtd:       "Cocktails, Seltzers & more",
  mixer:     "Tonic, Soda, Juice & more",
  liqueur:   "Cream, Fruit, Herbal & more",
  rare:      "Rare, Limited & Exclusive",
  sake_soju: "Japanese Sake & Korean Soju",
  other:     "Other Spirits & More",
};

function CategoryCard({ value, label, emoji }: Category) {
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <Link href={`/products?category=${encodeURIComponent(value)}`}
      className="group bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 active:scale-[.98] transition-all">
      {/* Photo — icon bubble is part of the artwork */}
      <div className="relative w-full aspect-[7/5] bg-gradient-to-br from-gray-50 to-gray-100">
        {!imgFailed ? (
          <Image src={catImg(value)} alt={label} fill unoptimized
            className="object-cover group-hover:scale-[1.03] transition-transform duration-300"
            onError={() => setImgFailed(true)} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-5xl">{emoji}</div>
        )}
      </div>
      {/* Body */}
      <div className="relative px-3.5 py-3">
        <p className="font-heading font-bold text-sm sm:text-base text-gray-900 leading-tight">{label}</p>
        <p className="text-[11px] sm:text-xs text-gray-500 leading-snug mt-0.5 pr-9 min-h-[28px]">
          {DESCRIPTIONS[value] ?? `Shop ${label}`}
        </p>
        <span className="absolute right-3 bottom-3 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-brand-500 text-white flex items-center justify-center shadow-md shadow-brand-500/30 group-hover:translate-x-0.5 transition-transform">
          <ArrowRight size={14} />
        </span>
      </div>
    </Link>
  );
}

const SPECIALS = [
  { href: "/products?flashdeal=true", label: "Flash Sale",   desc: "Limited Time Offers",            Icon: Zap,      img: "special-flash",    badge: null },
  { href: "/products?featured=true",  label: "New Arrivals", desc: "Check out our latest additions", Icon: Sparkles, img: "special-new",      badge: "NEW" },
];

function SpecialCard({ href, label, desc, Icon, img, badge }: (typeof SPECIALS)[number]) {
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <Link href={href}
      className="group relative flex items-center gap-3 rounded-2xl px-4 py-3 overflow-hidden hover:shadow-md active:scale-[.98] transition-all"
      style={{ background: "#fff0e5" }}>
      <span className="relative w-11 h-11 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0">
        <Icon size={20} className="text-brand-500" />
        {badge && (
          <span className="absolute -top-1 -right-1.5 bg-brand-500 text-white text-[8px] font-black px-1.5 py-px rounded-full">{badge}</span>
        )}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-heading font-bold text-sm sm:text-base text-gray-900">{label}</span>
        <span className="block text-[11px] sm:text-xs text-gray-600 leading-snug">{desc}</span>
      </span>
      {!imgFailed && (
        <Image src={catImg(img)} alt="" width={86} height={56} unoptimized
          className="h-14 w-auto object-contain shrink-0 group-hover:scale-105 transition-transform"
          onError={() => setImgFailed(true)} />
      )}
      <span className="w-7 h-7 rounded-full bg-brand-500 text-white flex items-center justify-center shadow-md shadow-brand-500/30 shrink-0 group-hover:translate-x-0.5 transition-transform">
        <ArrowRight size={14} />
      </span>
    </Link>
  );
}

export function CategoryShowcase() {
  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const r = await fetch("/api/categories");
      if (!r.ok) throw new Error("Failed to load categories");
      return r.json();
    },
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return (
      <div className="py-16 flex items-center justify-center gap-3 text-gray-400">
        <Loader2 size={20} className="animate-spin" /> Loading categories…
      </div>
    );
  }

  return (
    <>
      {/* Category grid — 2 cols mobile, up to 5 on wide screens like the design */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {categories.map((c) => <CategoryCard key={c.value} {...c} />)}
      </div>

      {/* Special collections row */}
      <div className="mt-3 sm:mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {SPECIALS.map((s) => <SpecialCard key={s.label} {...s} />)}
      </div>

      <Link href="/products"
        className="mt-4 sm:mt-6 flex items-center justify-center gap-2 w-full bg-white border border-gray-200 hover:border-brand-400 text-brand-600 font-black py-3.5 rounded-full text-sm sm:text-base transition-colors">
        View All Products <ArrowRight size={16} />
      </Link>

      {/* Trust badges */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { icon: "🕐", title: "10–30 MINUTES", sub: "Fast Delivery" },
          { icon: "🚚", title: "FREE DELIVERY", sub: "No minimum. No tip." },
          { icon: "🪪", title: "21+ VERIFIED", sub: "ID checked on delivery" },
          { icon: "🔒", title: "SAFE & SECURE", sub: "Secure checkout" },
        ].map((b) => (
          <div key={b.title} className="flex items-center gap-2.5 bg-white border border-gray-100 rounded-xl px-3 py-2.5">
            <span className="text-lg">{b.icon}</span>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] font-black text-gray-800 leading-tight">{b.title}</p>
              <p className="text-[9px] sm:text-[10px] text-gray-400 leading-tight">{b.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
