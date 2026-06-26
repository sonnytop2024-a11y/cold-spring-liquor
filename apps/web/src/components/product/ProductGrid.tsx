"use client";

import { useQuery } from "@tanstack/react-query";
import { ProductCard } from "./ProductCard";
import { fetchProducts } from "@/lib/api/products";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ProductGridProps {
  searchParams: Record<string, string | undefined>;
}

const LIMIT = 20;

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}

export function ProductGrid({ searchParams }: ProductGridProps) {
  const page = Number(searchParams.page ?? 1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["products", searchParams],
    queryFn: () =>
      fetchProducts({
        category: searchParams.category,
        brand: searchParams.brand,
        q: searchParams.q,
        sale: searchParams.sale === "true",
        featured: searchParams.featured === "true",
        minPrice: searchParams.minPrice ? Number(searchParams.minPrice) : undefined,
        maxPrice: searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined,
        page,
        limit: LIMIT,
      }),
  });

  const router = useRouter();
  const currentParams = useSearchParams();

  function goToPage(p: number) {
    const params = new URLSearchParams(currentParams.toString());
    params.set("page", String(p));
    router.push(`/products?${params.toString()}`);
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
        {Array.from({ length: LIMIT }).map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-2xl aspect-[3/4] animate-pulse" />
        ))}
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
      <div className="text-center py-16 text-gray-400">
        <p className="text-4xl mb-3">🔍</p>
        <p className="font-medium">No products found</p>
        <p className="text-sm mt-1">Try adjusting your filters or search term</p>
      </div>
    );
  }

  const totalPages = Math.ceil((data.total ?? 0) / LIMIT);

  return (
    <div>
      <p className="text-xs text-gray-400 mb-3">
        {data.total} product{data.total !== 1 ? "s" : ""}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
        {data.products.map((product) => (
          <ProductCard key={product.id} product={product} />
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
