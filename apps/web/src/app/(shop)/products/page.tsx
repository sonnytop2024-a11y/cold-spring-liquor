import { ProductGrid } from "@/components/product/ProductGrid";
import { ProductFilters } from "@/components/product/ProductFilters";
import { ProductSearch } from "@/components/product/ProductSearch";

type SearchParams = Record<string, string | undefined>;

export default function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="container-main py-8">
      <h1 className="text-3xl font-heading font-bold mb-6">Our Selection</h1>
      <ProductSearch />
      <div className="flex gap-8 mt-6">
        <aside className="hidden lg:block w-64 shrink-0">
          <ProductFilters />
        </aside>
        <div className="flex-1">
          <ProductGrid searchParams={searchParams} />
        </div>
      </div>
    </div>
  );
}
