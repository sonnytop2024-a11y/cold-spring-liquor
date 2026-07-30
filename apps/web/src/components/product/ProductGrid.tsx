"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProductCard } from "./ProductCard";
import { CategoryCarousels, CategoryCarouselsSkeleton } from "./CategoryCarousels";
import { fetchProducts, fetchAllTabPreview } from "@/lib/api/products";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ProductGridProps {
  searchParams: Record<string, string | undefined>;
}

const LIMIT = 40;

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}

export function ProductGrid({ searchParams: _serverSearchParams }: ProductGridProps) {
  const currentParams = useSearchParams();
  const router = useRouter();

  const category  = currentParams.get("category")  ?? undefined;
  const brand     = currentParams.get("brand")      ?? undefined;
  const q         = currentParams.get("q")          ?? undefined;
  const sale      = currentParams.get("sale")       === "true";
  const featured  = currentParams.get("featured")   === "true";
  const flashdeal = currentParams.get("flashdeal")  === "true";
  const bundle    = currentParams.get("bundle")     === "true";
  const minPrice  = currentParams.get("minPrice")   ? Number(currentParams.get("minPrice"))  : undefined;
  const maxPrice  = currentParams.get("maxPrice")   ? Number(currentParams.get("maxPrice"))  : undefined;
  const rawLetter = currentParams.get("letter") ?? undefined;
  const letter    = rawLetter && /^(#|[a-z])$/i.test(rawLetter) ? rawLetter.toUpperCase() : undefined;
  const page      = Number(currentParams.get("page") ?? 1);

  // The untouched "All" view (no filter of any kind). The A–Z bar never shows
  // here (anh Sơn, 29/07) and on mobile this view renders the carousels.
  const isAllView =
    !category && !brand && !q && !sale && !featured && !flashdeal && !bundle &&
    minPrice === undefined && maxPrice === undefined && !letter;

  // ── "All" tab on mobile → horizontal category carousels ──────────────────
  // Only the untouched All view qualifies: any search, filter chip, category,
  // price filter, letter, or page > 1 keeps the classic grid. Desktop always
  // keeps the grid (anh Sơn, 28/07). null = width unknown → grid path.
  const pureAll = isAllView && page === 1;
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const preview = useQuery({
    queryKey: ["all-tab-preview"],
    queryFn: fetchAllTabPreview,
    enabled: pureAll && isMobile === true,
    staleTime: 60_000,
  });
  // API error or empty payload → fall back to the classic grid, never a blank tab
  const useCarousels =
    pureAll && isMobile === true && !preview.isError && (preview.data?.categories.length ?? 1) > 0;

  const filters = { category, brand, q, sale, featured, flashdeal, bundle, minPrice, maxPrice, letter };
  const { data, isLoading, isError } = useQuery({
    queryKey: ["products", { ...filters, page }],
    queryFn: () => fetchProducts({ ...filters, page, limit: LIMIT }),
    // Keep the previous page's data ONLY while paging within the SAME filters
    // (smooth pagination). Across a tab/filter switch it must be dropped —
    // otherwise switching e.g. All → Vodka flashes the last grid's products
    // (Wine) before Vodka arrives (anh Sơn, 30/07).
    placeholderData: (prev: Awaited<ReturnType<typeof fetchProducts>> | undefined, prevQuery: { queryKey: readonly unknown[] } | undefined) => {
      const pk = prevQuery?.queryKey?.[1] as Record<string, unknown> | undefined;
      if (!pk) return undefined;
      const { page: _p, ...prevFilters } = pk;
      return JSON.stringify(prevFilters) === JSON.stringify(filters) ? prev : undefined;
    },
    staleTime: 30_000,
    enabled: !useCarousels,
  });

  if (useCarousels) {
    if (!preview.data) return <CategoryCarouselsSkeleton />;
    return <CategoryCarousels categories={preview.data.categories} />;
  }

  function goToPage(p: number) {
    const params = new URLSearchParams(currentParams.toString());
    params.set("page", String(p));
    router.replace(`/products?${params.toString()}`);
  }

  function setLetter(l: string | null) {
    const params = new URLSearchParams(currentParams.toString());
    if (l) params.set("letter", l);
    else params.delete("letter");
    params.delete("page"); // a new letter always starts at page 1
    const s = params.toString();
    router.replace(s ? `/products?${s}` : "/products");
  }

  // A–Z quick filter — top of the list, label-free, hidden on the All view
  // (anh Sơn, 29/07). Tapping the active letter (or "All") clears it.
  const alphaBar = !isAllView || letter ? (
    <div className="flex gap-1 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 mb-3">
      {["All", "#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map((l) => {
        const active = l === "All" ? !letter : letter === l;
        return (
          <button
            key={l}
            onClick={() => setLetter(l === "All" || letter === l ? null : l)}
            className={`shrink-0 min-w-[26px] h-[26px] px-1.5 rounded-md border text-[11px] font-bold leading-none transition-colors ${
              active
                ? l === "All"
                  ? "bg-gray-900 border-gray-900 text-white"
                  : "bg-brand-500 border-brand-500 text-white"
                : "bg-white border-gray-100 text-gray-500 hover:border-brand-300 hover:text-gray-800"
            }`}
          >
            {l}
          </button>
        );
      })}
    </div>
  ) : null;

  // First load — no previous data yet, show skeleton
  if (isLoading && !data) {
    return (
      <div>
        {alphaBar}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: LIMIT }).map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-2xl aspect-[3/4] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-4xl mb-3">⚠️</p>
        <p className="font-medium">Failed to load products. Please try again.</p>
      </div>
    );
  }

  if (!data?.products.length) {
    return (
      <div>
        {alphaBar}
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-medium">No products found</p>
          <p className="text-sm mt-1">Try adjusting your filters or search term</p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil((data.total ?? 0) / LIMIT);

  return (
    <div>
      {alphaBar}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
        {data.products.map((product, i) => (
          <ProductCard key={product.id} product={product} priority={page === 1 && i < 4} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-10">
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>

          {getPageNumbers(page, totalPages).map((p, i) =>
            p === "..." ? (
              <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-xs">…</span>
            ) : (
              <button
                key={p}
                onClick={() => goToPage(p)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                  p === page
                    ? "bg-gray-900 text-white"
                    : "border hover:bg-gray-50 text-gray-600"
                }`}
              >
                {p}
              </button>
            )
          )}

          <button
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
            className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
