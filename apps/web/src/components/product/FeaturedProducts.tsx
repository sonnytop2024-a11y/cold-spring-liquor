"use client";

import { useQuery } from "@tanstack/react-query";
import { ProductCard } from "./ProductCard";
import { fetchProducts } from "@/lib/api/products";

export function FeaturedProducts() {
  const { data, isLoading } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => fetchProducts({ featured: true, limit: 8 }),
  });

  return (
    <section className="py-12 container-main">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-2xl font-bold">Featured Products</h2>
        <a href="/products" className="text-brand-600 hover:text-brand-700 text-sm font-medium">
          View all →
        </a>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-xl h-72 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data?.products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
