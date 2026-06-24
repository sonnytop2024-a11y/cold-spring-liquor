"use client";

import { useRouter, useSearchParams } from "next/navigation";

const CATS = [
  { label: "All",       value: "",           emoji: "✨" },
  { label: "Whiskey",   value: "whiskey",    emoji: "🥃" },
  { label: "Vodka",     value: "vodka",      emoji: "🍸" },
  { label: "Tequila",   value: "tequila",    emoji: "🌵" },
  { label: "Rum",       value: "rum",        emoji: "🍹" },
  { label: "Gin",       value: "gin",        emoji: "🌿" },
  { label: "Wine",      value: "wine",       emoji: "🍷" },
  { label: "Champagne", value: "champagne",  emoji: "🍾" },
  { label: "Beer",      value: "beer",       emoji: "🍺" },
  { label: "Cognac",    value: "cognac",     emoji: "🥂" },
  { label: "RTD",       value: "rtd",        emoji: "🧃" },
  { label: "Liqueur",   value: "liqueur",    emoji: "🌸" },
];

export function CategoryPills() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get("category") ?? "";

  function select(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("category", value);
    else params.delete("category");
    params.delete("page");
    router.push(`/products?${params.toString()}`);
  }

  return (
    <div className="flex gap-2 mt-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
      {CATS.map((cat) => (
        <button
          key={cat.value}
          onClick={() => select(cat.value)}
          className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap border ${
            active === cat.value
              ? "bg-gray-900 text-white border-gray-900"
              : "bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-900"
          }`}
        >
          <span className="text-base leading-none">{cat.emoji}</span>
          {cat.label}
        </button>
      ))}
    </div>
  );
}
