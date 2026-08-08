import { Suspense } from "react";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ProductFilters } from "@/components/product/ProductFilters";
import { CategoryPills } from "@/components/product/CategoryPills";

type SearchParams = Record<string, string | undefined>;

export default function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="bg-white min-h-screen">
      <div className="container-main py-6">
        {/* No page title / tagline / second search bar here — the sticky
            header right above already carries all three (anh Sơn, 04/08:
            "bị trùng"). Straight into the filter chips. */}

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
    </div>
  );
}

function MobileFilterLink() {
  return null;
}
