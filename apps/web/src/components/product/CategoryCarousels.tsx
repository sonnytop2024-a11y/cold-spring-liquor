"use client";

import Link from "next/link";
import { ProductCard } from "./ProductCard";
import type { AllTabCategory } from "@/lib/api/products";

// "All" tab (mobile only): one horizontal, natively-swipeable strip per
// category instead of the old single long grid. Cards are the real
// ProductCard — badges, sale price, qty stepper, and add-to-cart all work
// exactly like the grid. "View all ›" goes to the same page as tapping the
// category tab; no new routes.
export function CategoryCarousels({ categories }: { categories: AllTabCategory[] }) {
  return (
    <div>
      {categories.map((cat, ci) => (
        <section key={cat.id} className={ci === 0 ? "" : "mt-7"}>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="font-bold text-[17px] text-gray-900 flex items-center gap-1.5">
              <span aria-hidden="true">{cat.emoji}</span> {cat.label}
            </h2>
            <Link
              href={`/products?category=${encodeURIComponent(cat.value)}`}
              className="text-brand-600 font-bold text-[13px] shrink-0"
            >
              View all <span aria-hidden="true">›</span>
            </Link>
          </div>

          {/* -mx-4 px-4: bleed to the screen edge (same trick as CategoryPills)
              so a sliver of card 3 peeks in — ~2.3 cards per viewport. */}
          <div
            className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1"
            style={{ scrollSnapType: "x proximity", WebkitOverflowScrolling: "touch" }}
          >
            {cat.products.map((product, i) => (
              <div key={product.id} className="shrink-0 w-[21.5%]" style={{ scrollSnapAlign: "start" }}>
                <ProductCard product={product} compact priority={ci === 0 && i < 3} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// Loading placeholder shaped like two carousel rows
export function CategoryCarouselsSkeleton() {
  return (
    <div>
      {[0, 1, 2].map(row => (
        <div key={row} className={row === 0 ? "" : "mt-7"}>
          <div className="h-5 w-36 bg-gray-100 rounded animate-pulse mb-3" />
          <div className="flex gap-3 overflow-hidden -mx-4 px-4">
            {[0, 1, 2].map(i => (
              <div key={i} className="shrink-0 w-[43%] bg-gray-100 rounded-2xl aspect-[3/4] animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
