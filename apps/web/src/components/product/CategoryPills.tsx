"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface Category {
  id: string;
  value: string;
  label: string;
  emoji: string;
  sortOrder: number;
  active: boolean;
}

type CatType = "all" | "featured" | "flashdeal" | "bundle" | "category";

interface Cat {
  label: string;
  value: string;
  emoji: string;
  type: CatType;
}

const PROMO_PILLS: Cat[] = [
  { label: "Flash Deal",    value: "flashdeal", emoji: "🔥", type: "flashdeal" },
  { label: "Bundle & Save", value: "bundle",    emoji: "📦", type: "bundle"    },
  { label: "New Arrivals",  value: "featured",  emoji: "⭐", type: "featured"  },
];

const PROMO_STYLE: Record<string, { active: string; idle: string }> = {
  flashdeal: {
    active: "bg-orange-500 text-white border-orange-500",
    idle:   "bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100",
  },
  bundle: {
    active: "bg-violet-600 text-white border-violet-600",
    idle:   "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100",
  },
  featured: {
    active: "bg-amber-500 text-white border-amber-500",
    idle:   "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
  },
};

const FALLBACK_CATS: Cat[] = [
  { label: "Whiskey",   value: "whiskey",   emoji: "🥃", type: "category" },
  { label: "Vodka",     value: "vodka",     emoji: "🍸", type: "category" },
  { label: "Tequila",   value: "tequila",   emoji: "🌵", type: "category" },
  { label: "Wine",      value: "wine",      emoji: "🍷", type: "category" },
  { label: "Beer",      value: "beer",      emoji: "🍺", type: "category" },
];

function dbCatsToPills(cats: Category[]): Cat[] {
  return cats.map(c => ({ label: c.label, value: c.value, emoji: c.emoji, type: "category" as CatType }));
}

export function CategoryPills() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [cats, setCats] = useState<Cat[]>(FALLBACK_CATS);

  useEffect(() => {
    fetch("/api/categories")
      .then(r => r.ok ? r.json() : null)
      .then((data: Category[] | null) => {
        if (data && data.length > 0) setCats(dbCatsToPills(data));
      })
      .catch(() => {});
  }, []);

  const activeCategory  = searchParams.get("category");
  const activeFlashdeal = searchParams.get("flashdeal") === "true";
  const activeBundle    = searchParams.get("bundle")    === "true";
  const activeFeatured  = searchParams.get("featured")  === "true";
  const isAllActive     = !activeCategory && !activeFlashdeal && !activeBundle && !activeFeatured;

  function select(cat: Cat) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    params.delete("category");
    params.delete("featured");
    params.delete("flashdeal");
    params.delete("bundle");
    params.delete("sale");
    params.delete("q");
    if (cat.type === "featured")       params.set("featured",  "true");
    else if (cat.type === "flashdeal") params.set("flashdeal", "true");
    else if (cat.type === "bundle")    params.set("bundle",    "true");
    else if (cat.value)                params.set("category",  cat.value);
    router.replace(`/products?${params.toString()}`);
  }

  function selectAll() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page"); params.delete("category"); params.delete("featured");
    params.delete("flashdeal"); params.delete("bundle"); params.delete("sale"); params.delete("q");
    router.replace(`/products?${params.toString()}`);
  }

  return (
    <div className="mt-3 space-y-2">

      {/* ── Row 1: Promotions ────────────────────────────────────── */}
      {/* scroll on mobile, wraps naturally on desktop */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap pb-0.5">
{PROMO_PILLS.map(cat => {
          const isActive = cat.type === "flashdeal" ? activeFlashdeal
                         : cat.type === "bundle"    ? activeBundle
                         : activeFeatured;
          const s = PROMO_STYLE[cat.type] ?? PROMO_STYLE.featured;
          return (
            <button
              key={cat.value}
              onClick={() => select(cat)}
              className={`shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-[12px] font-bold border transition-all whitespace-nowrap ${isActive ? s.active : s.idle}`}
            >
              <span className="leading-none">{cat.emoji}</span>
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* ── Row 2: Categories (always scrollable) ───────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 scroll-smooth">
        <button
          onClick={selectAll}
          className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all whitespace-nowrap border ${
            isAllActive
              ? "bg-gray-900 text-white border-gray-900"
              : "bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-900"
          }`}
        >
          ✨ All
        </button>

        <div className="shrink-0 w-px h-5 bg-gray-200" />

        {cats.map(cat => {
          const active = activeCategory === cat.value;
          return (
            <button
              key={cat.value + cat.label}
              onClick={() => select(cat)}
              className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all whitespace-nowrap border ${
                active
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-900"
              }`}
            >
              <span className="leading-none">{cat.emoji}</span>
              {cat.label}
            </button>
          );
        })}
      </div>

    </div>
  );
}
