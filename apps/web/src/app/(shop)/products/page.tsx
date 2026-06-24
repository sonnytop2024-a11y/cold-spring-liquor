import { Suspense } from "react";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ProductFilters } from "@/components/product/ProductFilters";
import { ProductSearch } from "@/components/product/ProductSearch";
import { CategoryPills } from "@/components/product/CategoryPills";

type SearchParams = Record<string, string | undefined>;

export default function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="container-main py-6">
      <h1 className="text-2xl font-heading font-bold mb-4">Our Selection</h1>

      {/* Search bar */}
      <Suspense>
        <ProductSearch />
      </Suspense>

      {/* Category pills — horizontal scroll on mobile, wraps on desktop */}
      <Suspense>
        <CategoryPills />
      </Suspense>

      {/* Main layout: sidebar (desktop) + grid */}
      <div className="flex gap-6 mt-5">
        <aside className="hidden lg:block w-48 shrink-0">
          <Suspense>
            <ProductFilters />
          </Suspense>
        </aside>

        <div className="flex-1 min-w-0">
          {/* Mobile-only filter button row */}
          <div className="flex items-center justify-between mb-3 lg:hidden">
            <Suspense>
              <MobileFilterLink />
            </Suspense>
          </div>

          <Suspense>
            <ProductGrid searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function MobileFilterLink() {
  return null;
}
