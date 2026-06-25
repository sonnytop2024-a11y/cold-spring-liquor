"use client";

import { useRouter, useSearchParams } from "next/navigation";

type CatType = "all" | "featured" | "category";

interface Cat {
  label: string;
  value: string;
  emoji: string;
  type: CatType;
  badge?: string;
}

const CATS: Cat[] = [
  { label: "All",          value: "",          emoji: "✨", type: "all" },
  { label: "New Products", value: "featured",  emoji: "⭐", type: "featured", badge: "NEW" },
  { label: "Hard to Find", value: "rare",      emoji: "💎", type: "category" },
  { label: "Whiskey",      value: "whiskey",   emoji: "🥃", type: "category" },
  { label: "Vodka",        value: "vodka",     emoji: "🍸", type: "category" },
  { label: "Tequila",      value: "tequila",   emoji: "🌵", type: "category" },
  { label: "Rum",          value: "rum",       emoji: "🍹", type: "category" },
  { label: "Gin",          value: "gin",       emoji: "🌿", type: "category" },
  { label: "Wine",         value: "wine",      emoji: "🍷", type: "category" },
  { label: "Champagne",    value: "champagne", emoji: "🍾", type: "category" },
  { label: "Beer",         value: "beer",      emoji: "🍺", type: "category" },
  { label: "Cognac",       value: "cognac",    emoji: "🥂", type: "category" },
  { label: "RTD",          value: "rtd",       emoji: "🧃", type: "category" },
  { label: "Liqueur",      value: "liqueur",   emoji: "🌸", type: "category" },
];

export function CategoryPills() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function isActive(cat: Cat) {
    if (cat.type === "all")
      return !searchParams.get("category") && searchParams.get("featured") !== "true";
    if (cat.type === "featured") return searchParams.get("featured") === "true";
    return searchParams.get("category") === cat.value;
  }

  function select(cat: Cat) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    params.delete("category");
    params.delete("featured");
    if (cat.type === "featured") params.set("featured", "true");
    else if (cat.value) params.set("category", cat.value);
    router.push(`/products?${params.toString()}`);
  }

  return (
    <div className="flex gap-2 mt-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
      {CATS.map((cat) => {
        const active = isActive(cat);
        return (
          <button
            key={cat.label}
            onClick={() => select(cat)}
            className={`relative shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap border-2 ${
              active
                ? "bg-gray-900 text-white border-gray-900 shadow-sm"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-900"
            }`}
          >
            <span className="text-base leading-none">{cat.emoji}</span>
            {cat.label}
            {cat.badge && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none">
                {cat.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
