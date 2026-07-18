"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { fetchProducts } from "@/lib/api/products";
import { SearchSuggestions } from "@/components/layout/SearchSuggestions";

export function ProductSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQ = searchParams.get("q") ?? "";
  const [value, setValue] = useState(urlQ);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Sync local input when URL q param changes (e.g. category pill clears it)
  useEffect(() => {
    setValue(urlQ);
  }, [urlQ]);

  const push = useDebouncedCallback((q: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (q) params.set("q", q);
    else params.delete("q");
    params.delete("page");
    router.push(`/products?${params.toString()}`);
  }, 400);

  // Live suggestions — same debounce + endpoint as the header search bar
  const [debouncedQ, setDebouncedQ] = useState("");
  const debounceSuggest = useDebouncedCallback((val: string) => setDebouncedQ(val), 200);
  useEffect(() => { debounceSuggest(value); }, [value, debounceSuggest]);

  const trimmedQ = debouncedQ.trim();
  const { data, isFetching } = useQuery({
    queryKey: ["search-suggestions", trimmedQ],
    queryFn: () => fetchProducts({ q: trimmedQ, limit: 5 }),
    enabled: trimmedQ.length > 0,
    staleTime: 60_000,
  });

  // Close the dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleChange(val: string) {
    setValue(val);
    setOpen(val.trim().length > 0);
    push(val);
  }

  return (
    <div ref={wrapRef} className="relative">
      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => { if (value.trim()) setOpen(true); }}
        onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
        placeholder="Search by name, brand, or category..."
        autoComplete="off"
        className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
      />
      {value && (
        <button
          onClick={() => handleChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X size={16} />
        </button>
      )}
      <SearchSuggestions
        query={trimmedQ}
        open={open && trimmedQ.length > 0}
        products={data?.products ?? []}
        total={data?.total ?? 0}
        loading={isFetching}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}
