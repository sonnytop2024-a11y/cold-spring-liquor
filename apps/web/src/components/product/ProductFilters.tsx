"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

const CATEGORIES = [
  { label: "All", value: "" },
  { label: "Whiskey", value: "whiskey" },
  { label: "Vodka", value: "vodka" },
  { label: "Tequila", value: "tequila" },
  { label: "Rum", value: "rum" },
  { label: "Gin", value: "gin" },
  { label: "Cognac", value: "cognac" },
  { label: "Wine", value: "wine" },
  { label: "Champagne", value: "champagne" },
  { label: "Beer", value: "beer" },
  { label: "Ready-to-Drink", value: "rtd" },
];

const PRICE_RANGES = [
  { label: "Any price", min: "", max: "" },
  { label: "Under $20", min: "", max: "20" },
  { label: "$20 – $50", min: "20", max: "50" },
  { label: "$50 – $100", min: "50", max: "100" },
  { label: "Over $100", min: "100", max: "" },
];

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b pb-4 mb-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full font-semibold text-sm mb-3"
      >
        {title}
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && children}
    </div>
  );
}

export function ProductFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`/products?${params.toString()}`);
  }

  function setPrice(min: string, max: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (min) params.set("minPrice", min);
    else params.delete("minPrice");
    if (max) params.set("maxPrice", max);
    else params.delete("maxPrice");
    params.delete("page");
    router.push(`/products?${params.toString()}`);
  }

  const activeCategory = searchParams.get("category") ?? "";
  const activeMin = searchParams.get("minPrice") ?? "";
  const activeMax = searchParams.get("maxPrice") ?? "";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-sm uppercase tracking-wide">Filters</h3>
        <button
          onClick={() => router.push("/products")}
          className="text-xs text-brand-600 hover:underline"
        >
          Clear all
        </button>
      </div>

      <FilterSection title="Category">
        <div className="space-y-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setParam("category", cat.value)}
              className={`block w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${
                activeCategory === cat.value
                  ? "bg-brand-500 text-white font-medium"
                  : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Price Range">
        <div className="space-y-1.5">
          {PRICE_RANGES.map((range) => {
            const active = activeMin === range.min && activeMax === range.max;
            return (
              <button
                key={range.label}
                onClick={() => setPrice(range.min, range.max)}
                className={`block w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${
                  active
                    ? "bg-brand-500 text-white font-medium"
                    : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                {range.label}
              </button>
            );
          })}
        </div>
      </FilterSection>

      <FilterSection title="Availability">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            className="accent-brand-500"
            checked={searchParams.get("inStock") === "true"}
            onChange={(e) => setParam("inStock", e.target.checked ? "true" : "")}
          />
          In stock only
        </label>
      </FilterSection>

      <FilterSection title="Deals">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            className="accent-brand-500"
            checked={searchParams.get("sale") === "true"}
            onChange={(e) => setParam("sale", e.target.checked ? "true" : "")}
          />
          On sale
        </label>
      </FilterSection>
    </div>
  );
}
