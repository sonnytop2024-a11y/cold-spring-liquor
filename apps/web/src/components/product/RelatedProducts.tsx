"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchProductBySlug, fetchProducts } from "@/lib/api/products";
import { ProductCard } from "./ProductCard";

export function RelatedProducts({ slug }: { slug: string }) {
  const { data: current } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => fetchProductBySlug(slug),
  });

  const { data } = useQuery({
    queryKey: ["products", "related", current?.category],
    queryFn: () => fetchProducts({ category: current!.category, limit: 5 }),
    enabled: !!current,
  });

  const related = data?.products.filter((p) => p.id !== current?.id).slice(0, 4);
  if (!related?.length) return null;

  return (
    <section className="mt-16">
      <h2 className="font-heading text-2xl font-bold mb-6">You May Also Like</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {related.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
