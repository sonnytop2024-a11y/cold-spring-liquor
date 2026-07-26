"use client";

/**
 * Rare Whiskey Vault — admin controls for the homepage cabinet section.
 *
 * The vault stores only { productId, order, visible, bottle photo }.
 * Name / price / stock always come live from the product catalog, so editing
 * a product in Inventory updates the vault automatically.
 *
 * The cabinet has exactly 5 niches; more visible bottles paginate on the
 * storefront by themselves. When the vault is switched off — or no bottle is
 * left to display — the homepage section disappears completely.
 */

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2, Search, Plus, Trash2, ChevronUp, ChevronDown,
  ToggleLeft, ToggleRight, ImagePlus, AlertTriangle, ExternalLink, X, Wine,
} from "lucide-react";
import { API } from "@/lib/api";

const NICHE_COUNT = 5;

interface VaultItemRow {
  productId: string;
  visible: boolean;
  imageUrl: string | null;
  addedAt: string;
  name: string;
  brand: string;
  price: number | null;
  stockQty: number;
  catalogImageUrl: string | null;
  productActive: boolean;
}

interface VaultData {
  enabled: boolean;
  lightFx: boolean;
  hideSoldOut: boolean;
  items: VaultItemRow[];
}

interface CatalogProduct {
  id: string;
  name: string;
  brand: string;
  price: number;
  salePrice: number | null;
  stockQty: number;
  imageUrl: string | null;
}

async function fetchVault(): Promise<VaultData> {
  const res = await fetch(`${API}/admin/vault`);
  if (!res.ok) throw new Error("Failed to load vault");
  return res.json();
}

export default function VaultPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-vault"], queryFn: fetchVault });

  const mutate = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(`${API}/admin/vault`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Save failed");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-vault"] }),
    onError: (e: Error) => alert(e.message),
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading vault…
      </div>
    );
  }

  const shownCount = data.items.filter(
    (i) => i.visible && i.productActive && (!data.hideSoldOut || i.stockQty > 0),
  ).length;
  const pageCount = Math.max(1, Math.ceil(shownCount / NICHE_COUNT));
  const liveOnHomepage = data.enabled && shownCount > 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Wine className="w-7 h-7 text-amber-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rare Whiskey Vault</h1>
            <p className="text-sm text-gray-500">
              Homepage cabinet — between the banner and the hero
            </p>
          </div>
        </div>
        <a
          href="https://coldspringliquor.com/#"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700"
        >
          View on site <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Live status */}
      <div
        className={`rounded-lg border px-4 py-3 text-sm ${
          liveOnHomepage
            ? "border-green-200 bg-green-50 text-green-700"
            : "border-gray-200 bg-gray-50 text-gray-500"
        }`}
      >
        {liveOnHomepage ? (
          <>Vault is <b>LIVE</b> on the homepage — {shownCount} bottle{shownCount > 1 ? "s" : ""} across {pageCount} page{pageCount > 1 ? "s" : ""} of {NICHE_COUNT}.</>
        ) : (
          <>Vault is <b>hidden</b> from customers{!data.enabled ? " (switched off)" : " (no bottles to display)"} — the homepage looks unchanged.</>
        )}
      </div>

      {/* Toggles */}
      <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
        <ToggleRow
          label="Show vault on homepage"
          hint="Master switch — off hides the whole section instantly"
          value={data.enabled}
          onChange={(v) => mutate.mutate({ action: "settings", enabled: v })}
        />
        <ToggleRow
          label="Animated spotlights"
          hint="Slow lamp twinkle (5.5s cycle, epilepsy-safe, respects Reduce Motion)"
          value={data.lightFx}
          onChange={(v) => mutate.mutate({ action: "settings", lightFx: v })}
        />
        <ToggleRow
          label="Auto-hide sold-out bottles"
          hint="Bottles with 0 stock disappear until restocked"
          value={data.hideSoldOut}
          onChange={(v) => mutate.mutate({ action: "settings", hideSoldOut: v })}
        />
      </div>

      {/* Items */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Bottles in the vault</h2>
          <span className="text-xs text-gray-400">
            Order here = order on the shelf (top = first niche)
          </span>
        </div>

        {data.items.length === 0 ? (
          <div className="px-4 py-10 text-center text-gray-400 text-sm">
            No bottles yet — add your first rare bottle below and the vault will
            appear on the homepage.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {data.items.map((item, idx) => (
              <VaultRow
                key={item.productId}
                item={item}
                first={idx === 0}
                last={idx === data.items.length - 1}
                busy={mutate.isPending}
                onVisible={(v) => mutate.mutate({ action: "visible", productId: item.productId, visible: v })}
                onRemove={() => {
                  if (confirm(`Remove "${item.name}" from the vault? The product itself is not affected.`)) {
                    mutate.mutate({ action: "remove", productId: item.productId });
                  }
                }}
                onMove={(dir) => {
                  const ids = data.items.map((i) => i.productId);
                  const j = idx + dir;
                  if (j < 0 || j >= ids.length) return;
                  [ids[idx], ids[j]] = [ids[j], ids[idx]];
                  mutate.mutate({ action: "reorder", ids });
                }}
                onImage={(url) => mutate.mutate({ action: "image", productId: item.productId, imageUrl: url })}
              />
            ))}
          </ul>
        )}
      </div>

      <AddProduct
        existingIds={data.items.map((i) => i.productId)}
        onAdd={(id) => mutate.mutate({ action: "add", productId: id })}
        busy={mutate.isPending}
      />
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
    >
      <span>
        <span className="block text-sm font-medium text-gray-900">{label}</span>
        <span className="block text-xs text-gray-400">{hint}</span>
      </span>
      {value ? (
        <ToggleRight className="w-8 h-8 text-green-500 shrink-0" />
      ) : (
        <ToggleLeft className="w-8 h-8 text-gray-300 shrink-0" />
      )}
    </button>
  );
}

function VaultRow({
  item,
  first,
  last,
  busy,
  onVisible,
  onRemove,
  onMove,
  onImage,
}: {
  item: VaultItemRow;
  first: boolean;
  last: boolean;
  busy: boolean;
  onVisible: (v: boolean) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onImage: (url: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const thumb = item.imageUrl ?? item.catalogImageUrl;

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const r = await fetch(`${API}/admin/upload?folder=vault`, { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Upload failed");
      onImage(j.url);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      {/* thumb — dark backdrop mimics the cabinet so transparent photos read right */}
      <div className="w-12 h-16 rounded bg-[#1b0f08] border border-gray-200 flex items-end justify-center overflow-hidden shrink-0">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="max-w-full max-h-full object-contain" />
        ) : (
          <Wine className="w-5 h-5 text-white/20 m-auto" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate">
          {item.brand ? `${item.brand} — ` : ""}{item.name}
        </p>
        <p className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
          {item.price != null && <span>${item.price.toFixed(2)}</span>}
          {item.stockQty <= 0 ? (
            <span className="text-red-600 font-semibold">SOLD OUT</span>
          ) : (
            <span>{item.stockQty} left</span>
          )}
          {!item.productActive && (
            <span className="text-red-600 font-semibold">product inactive — not shown</span>
          )}
          {!item.imageUrl && (
            <span className="inline-flex items-center gap-1 text-amber-600">
              <AlertTriangle className="w-3 h-3" /> needs transparent bottle photo
            </span>
          )}
        </p>
      </div>

      {/* bottle photo upload (transparent PNG/WebP — server trims + validates) */}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/webp"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
      />
      <button
        type="button"
        title="Upload transparent bottle photo (PNG/WebP)"
        disabled={uploading}
        onClick={() => fileRef.current?.click()}
        className="p-2 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 disabled:opacity-40"
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
      </button>
      {item.imageUrl && (
        <button
          type="button"
          title="Clear bottle photo (fall back to catalog image)"
          onClick={() => onImage(null)}
          className="p-2 rounded hover:bg-gray-100 text-gray-300 hover:text-gray-700"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* show/hide */}
      <button
        type="button"
        title={item.visible ? "Shown in cabinet" : "Hidden"}
        disabled={busy}
        onClick={() => onVisible(!item.visible)}
        className="p-1"
      >
        {item.visible ? (
          <ToggleRight className="w-7 h-7 text-green-500" />
        ) : (
          <ToggleLeft className="w-7 h-7 text-gray-300" />
        )}
      </button>

      {/* order */}
      <div className="flex flex-col">
        <button
          type="button"
          disabled={first || busy}
          onClick={() => onMove(-1)}
          className="p-0.5 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-25"
          aria-label="Move up"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <button
          type="button"
          disabled={last || busy}
          onClick={() => onMove(1)}
          className="p-0.5 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-25"
          aria-label="Move down"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      <button
        type="button"
        title="Remove from vault"
        disabled={busy}
        onClick={onRemove}
        className="p-2 rounded hover:bg-red-50 text-gray-300 hover:text-red-600"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </li>
  );
}

function AddProduct({
  existingIds,
  onAdd,
  busy,
}: {
  existingIds: string[];
  onAdd: (productId: string) => void;
  busy: boolean;
}) {
  const [q, setQ] = useState("");

  const { data, isFetching } = useQuery({
    queryKey: ["vault-product-search", q],
    queryFn: async (): Promise<CatalogProduct[]> => {
      const res = await fetch(`${API}/admin/products?q=${encodeURIComponent(q)}&limit=8`);
      if (!res.ok) return [];
      const j = await res.json();
      return j.products ?? j ?? [];
    },
    enabled: q.trim().length >= 2,
  });

  const results = (data ?? []).filter((p) => !existingIds.includes(p.id));

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add a bottle from the catalog
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Price, name and stock stay linked to the product — edit them in Inventory as usual. Catalog photos must be on a white background; for the cleanest look, upload a transparent bottle photo after adding.
        </p>
      </div>
      <div className="p-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products… (min 2 characters)"
            className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-400"
          />
        </div>

        {q.trim().length >= 2 && (
          <ul className="mt-3 divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
            {isFetching && (
              <li className="px-3 py-3 text-sm text-gray-400 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Searching…
              </li>
            )}
            {!isFetching && results.length === 0 && (
              <li className="px-3 py-3 text-sm text-gray-400">No matching products (already added ones are hidden).</li>
            )}
            {results.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2 bg-white">
                <div className="w-8 h-10 rounded bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt="" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <Wine className="w-4 h-4 text-gray-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900 truncate">{p.name}</p>
                  <p className="text-xs text-gray-500">
                    ${(p.salePrice ?? p.price).toFixed(2)} · {p.stockQty > 0 ? `${p.stockQty} in stock` : "sold out"}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onAdd(p.id)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold disabled:opacity-40"
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
