"use client";

import { useRouter, useSearchParams } from "next/navigation";

const PRICE_RANGES = [
  { label: "Any price",    min: "",    max: ""    },
  { label: "Under $20",   min: "",    max: "20"  },
  { label: "$20 – $50",   min: "20",  max: "50"  },
  { label: "$50 – $100",  min: "50",  max: "100" },
  { label: "Over $100",   min: "100", max: ""    },
];

export function ProductFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    params.delete("page");
    router.push(`/products?${params.toString()}`);
  }

  function setPrice(min: string, max: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (min) params.set("minPrice", min); else params.delete("minPrice");
    if (max) params.set("maxPrice", max); else params.delete("maxPrice");
    params.delete("page");
    router.push(`/products?${params.toString()}`);
  }

  const activeMin = searchParams.get("minPrice") ?? "";
  const activeMax = searchParams.get("maxPrice") ?? "";

  return (
    <div className="text-sm">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Filters</span>
        <button
          onClick={() => router.push("/products")}
          className="text-xs text-brand-600 hover:underline"
        >
          Clear
        </button>
      </div>

      {/* Price */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Price</p>
        <div className="space-y-1">
          {PRICE_RANGES.map((r) => {
            const active = activeMin === r.min && activeMax === r.max;
            return (
              <button
                key={r.label}
                onClick={() => setPrice(r.min, r.max)}
                className={`block w-full text-left text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                  active
                    ? "bg-gray-900 text-white font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Availability */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Availability</p>
        <label className="flex items-center gap-2 text-xs cursor-pointer px-2.5 py-1.5 rounded-lg hover:bg-gray-100">
          <input
            type="checkbox"
            className="accent-brand-500 rounded"
            checked={searchParams.get("inStock") === "true"}
            onChange={(e) => setParam("inStock", e.target.checked ? "true" : "")}
          />
          In stock only
        </label>
      </div>

      {/* Deals */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Deals</p>
        <label className="flex items-center gap-2 text-xs cursor-pointer px-2.5 py-1.5 rounded-lg hover:bg-gray-100">
          <input
            type="checkbox"
            className="accent-brand-500 rounded"
            checked={searchParams.get("sale") === "true"}
            onChange={(e) => setParam("sale", e.target.checked ? "true" : "")}
          />
          On sale
        </label>
      </div>
    </div>
  );
}
