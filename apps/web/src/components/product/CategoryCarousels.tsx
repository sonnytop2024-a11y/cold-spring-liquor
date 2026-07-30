"use client";

import { useState } from "react";
import Link from "next/link";
import { ProductCard } from "./ProductCard";
import type { AllTabCategory } from "@/lib/api/products";
import type { Product } from "@/types";

// "All" tab (mobile only): one horizontal, natively-swipeable strip per
// category instead of the old single long grid. Every in-stock product with a
// photo is reachable by swiping (anh Sơn, 28/07: no cap), but cards mount in
// batches as the customer approaches the end of the strip — 872 cards at once
// would jank a phone. Cards are the real ProductCard in compact mode.
// "View all ›" goes to the same page as tapping the category tab.

const INITIAL_CARDS = 10;
const BATCH_CARDS = 20;

function CarouselStrip({ products, eager }: { products: Product[]; eager: boolean }) {
  const [visible, setVisible] = useState(INITIAL_CARDS);

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    // Grow only on a real swipe (scrollLeft > 0) within one viewport of the
    // end — a wider lookahead fires on mount and defeats the batching.
    if (
      visible < products.length &&
      el.scrollLeft > 0 &&
      el.scrollLeft + el.clientWidth * 2 >= el.scrollWidth
    ) {
      setVisible(v => Math.min(v + BATCH_CARDS, products.length));
    }
  }

  return (
    <div
      className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1"
      style={{ scrollSnapType: "x proximity", WebkitOverflowScrolling: "touch", scrollPaddingLeft: "16px", scrollPaddingRight: "16px" }}
      onScroll={onScroll}
    >
      {products.slice(0, visible).map((product, i) => (
        <div key={product.id} className="shrink-0 w-[29.7%]" style={{ scrollSnapAlign: "start" }}>
          <ProductCard product={product} compact priority={eager && i < 5} />
        </div>
      ))}
    </div>
  );
}

export function CategoryCarousels({ categories }: { categories: AllTabCategory[] }) {
  return (
    <div>
      {categories.map((cat, ci) => (
        <section key={cat.id} className={`csl-strip-section ${ci === 0 ? "" : "mt-7"}`}>
          <div className="flex items-center justify-between mb-2.5">
            {/* Cinzel — engraved liquor-label face, bolder + bigger than the
                old inherited Playfair (anh Sơn, 28/07: "đậm hơn, to hơn,
                font riêng sang trọng") */}
            <h2 className="font-luxury font-bold text-[14px] tracking-wide text-gray-900 flex items-center gap-1.5">
              <span aria-hidden="true" className="text-[14px]">{cat.emoji}</span> {cat.label}
            </h2>
            <Link
              href={`/products?category=${encodeURIComponent(cat.value)}`}
              className="text-brand-600 font-bold text-[13px] shrink-0"
            >
              View all <span aria-hidden="true">›</span>
            </Link>
          </div>

          {/* -mx-4 px-4: bleed to the screen edge (same trick as CategoryPills)
              so a sliver of the next card peeks in — ~4.4 cards per viewport. */}
          <CarouselStrip products={cat.products} eager={ci < 2} />
        </section>
      ))}
    </div>
  );
}

// Loading placeholder shaped like carousel rows
export function CategoryCarouselsSkeleton() {
  return (
    <div>
      {[0, 1, 2].map(row => (
        <div key={row} className={row === 0 ? "" : "mt-7"}>
          <div className="h-5 w-36 bg-gray-100 rounded animate-pulse mb-3" />
          <div className="flex gap-3 overflow-hidden -mx-4 px-4">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="shrink-0 w-[29.7%] bg-gray-100 rounded-2xl aspect-[3/4] animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
