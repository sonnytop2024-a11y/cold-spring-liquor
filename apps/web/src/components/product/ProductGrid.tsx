"use client";

import { useQuery } from "@tanstack/react-query";
import { ProductCard } from "./ProductCard";
import { fetchProducts } from "@/lib/api/products";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ProductGridProps {
  searchParams: Record<string, string | undefined>;
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
        limit: 16,
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
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-xl h-80 animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-lg">Failed to load products. Please try again.</p>
      </div>
    );
  }

  if (!data?.products.length) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-4xl mb-4">🔍</p>
        <p className="text-lg font-medium">No products found</p>
        <p className="text-sm mt-2">Try adjusting your filters or search term</p>
      </div>
    );
  }

  const totalPages = Math.ceil((data.total ?? 0) / 16);

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        {data.total} product{data.total !== 1 ? "s" : ""} found
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {data.products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={18} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => goToPage(p)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                p === page
                  ? "bg-brand-500 text-white"
                  : "border hover:bg-gray-50 text-gray-700"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
            className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
