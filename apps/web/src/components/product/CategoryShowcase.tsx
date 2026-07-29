"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";

interface Category {
  value: string;
  label: string;
  emoji: string;
  imageUrl?: string;
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

function CategoryCard({ value, label, emoji, imageUrl }: Category) {
  const [imgFailed, setImgFailed] = useState(false);
  // Admin-uploaded photo wins; otherwise the default artwork at the fixed
  // storage path; emoji is the last-resort fallback if neither loads.
  const src = imageUrl || catImg(value);
  return (
    <Link href={`/products?category=${encodeURIComponent(value)}`}
      className="group bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 active:scale-[.98] transition-all">
      {/* Photo — icon bubble is part of the artwork */}
      <div className="relative w-full aspect-[7/5] bg-gradient-to-br from-gray-50 to-gray-100">
        {!imgFailed ? (
          <Image src={src} alt={label} fill unoptimized
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

// Homepage "Shop By Category" (anh Sơn, 28/07): the photo-card grid that used
// to live on the retired /categories page, replacing the old round-icon strip.
// Photos stay fully admin-managed (Admin → Categories: add / edit / delete).
export function ShopByCategorySection() {
  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const r = await fetch("/api/categories");
      if (!r.ok) throw new Error("Failed to load categories");
      return r.json();
    },
    staleTime: 5 * 60_000,
  });

  return (
    <section className="py-16" style={{ background: "#0d0d0d" }}>
      <div className="container-main">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#f97316" }}>
              Browse
            </p>
            <h2 className="font-heading text-3xl md:text-4xl font-black text-white">Shop By Category</h2>
            <p className="text-sm text-gray-400 mt-1">Find exactly what you need.</p>
          </div>
          <Link
            href="/products"
            className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold transition-colors"
            style={{ color: "#f97316" }}
          >
            View All Products →
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {isLoading
            ? Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="rounded-2xl aspect-[7/6] animate-pulse" style={{ background: "#1a1a1a" }} />
              ))
            : categories.map((c) => <CategoryCard key={c.value} {...c} />)}
        </div>

        <Link href="/products" className="sm:hidden block text-center mt-6 text-sm font-semibold" style={{ color: "#f97316" }}>
          View All Products →
        </Link>
      </div>
    </section>
  );
}
