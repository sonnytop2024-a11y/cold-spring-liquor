"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Plus, Check, Search } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import type { Product } from "@/types";

function highlightMatch(name: string, query: string) {
  if (!query.trim()) return name;
  const idx = name.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return name;
  return (
    <>
      {name.slice(0, idx)}
      <mark className="bg-transparent text-brand-600 font-extrabold">{name.slice(idx, idx + query.length)}</mark>
      {name.slice(idx + query.length)}
    </>
  );
}

function SuggestionRow({ product, query, onSelect }: { product: Product; query: string; onSelect: () => void }) {
  const addItem = useCartStore((s) => s.addItem);
  const [justAdded, setJustAdded] = useState(false);

  function handleQuickAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  }

  return (
    <Link
      href={`/products/${product.slug}`}
      onClick={onSelect}
      className="flex items-center gap-2.5 px-3 py-2 hover:bg-brand-50 transition-colors border-b border-gray-100 last:border-b-0"
    >
      <div className="relative w-11 h-11 rounded-[10px] bg-gray-50 shrink-0 overflow-hidden">
        {product.imageUrl && (
          <Image src={product.imageUrl} alt={product.name} fill sizes="44px" className="object-contain p-0.5" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-gray-900 truncate leading-tight">
          {highlightMatch(product.name, query)}
        </p>
        <p className="text-[11px] text-gray-400 truncate mt-0.5">
          {product.category} · {product.volume} · {product.brand}
        </p>
      </div>
      <button
        type="button"
        onClick={handleQuickAdd}
        aria-label={`Add ${product.name} to cart`}
        className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white transition-all active:scale-90 ${justAdded ? "bg-green-500" : "bg-brand-500 hover:bg-brand-600"}`}
      >
        {justAdded ? <Check size={13} /> : <Plus size={13} />}
      </button>
    </Link>
  );
}

interface SearchSuggestionsProps {
  query: string;
  open: boolean;
  products: Product[];
  total: number;
  loading: boolean;
  onClose: () => void;
}

export function SearchSuggestions({ query, open, products, total, loading, onClose }: SearchSuggestionsProps) {
  return (
    <div
      className={`absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 max-h-[60vh] overflow-y-auto transition-all duration-200 ${
        open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-1.5 pointer-events-none"
      }`}
    >
      {loading && products.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-gray-400">Searching…</div>
      ) : products.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-gray-400">No products found for &quot;{query}&quot;</div>
      ) : (
        <>
          {products.map((product) => (
            <SuggestionRow key={product.id} product={product} query={query} onSelect={onClose} />
          ))}
          {total > products.length && (
            <Link
              href={`/products?q=${encodeURIComponent(query)}`}
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2.5 text-[12.5px] font-bold text-brand-600 bg-gray-50 hover:bg-brand-50 transition-colors"
            >
              <Search size={13} />
              View all {total} results for &quot;{query}&quot;
            </Link>
          )}
        </>
      )}
    </div>
  );
}
