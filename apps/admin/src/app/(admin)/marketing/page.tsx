"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Tag, Edit2, Trash2, Loader2, X, Check,
  ToggleLeft, ToggleRight, AlertTriangle, Zap, Package, Search, ChevronRight,
  Image as ImageIcon, GripVertical, ExternalLink,
} from "lucide-react";
import { API } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Coupon {
  id: string; code: string; type: "fixed" | "percentage" | "free_delivery";
  value: number; label: string; minOrder: number;
  maxUsage: number | null; usagePerCustomer: number | null; usageCount: number;
  active: boolean; startDate: string | null; endDate: string | null;
  categoryRestriction: string | null; createdAt: string;
}

interface FlashDeal {
  id: string; name: string; brand: string; slug: string;
  price: number; salePrice: number; imageUrl: string | null;
  volume: string; stockQty: number; maxStock: number;
  active: boolean; startAt: string | null; endsAt: string | null;
  createdAt: string; productId?: string;
}

interface InventoryProduct {
  id: string; name: string; brand: string; category: string;
  price: number; salePrice: number | null; imageUrl: string | null;
  volume: string; stockQty: number; slug: string;
}

interface BundleTier {
  id: string; minQty: number; discountPct: number;
  label: string; active: boolean; sortOrder: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COUPON_EMPTY: Partial<Coupon> = { code: "", type: "fixed", value: 0, label: "", minOrder: 0, maxUsage: null, usagePerCustomer: null, startDate: null, endDate: null, categoryRestriction: null, active: true };
const TYPE_LABELS = { fixed: "Fixed ($)", percentage: "Percentage (%)", free_delivery: "Free Delivery" };

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
function isExpired(iso: string | null) { return !!iso && new Date(iso) < new Date(); }
function discountPct(price: number, sale: number) { return Math.round((1 - sale / price) * 100); }

function toLocalDatetimeInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteConfirm({ onConfirm, onCancel, busy }: { onConfirm: () => void; onCancel: () => void; busy: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
        <AlertTriangle size={32} className="text-red-500 mx-auto mb-3" />
        <h3 className="font-bold text-lg mb-1">Delete?</h3>
        <p className="text-gray-500 text-sm mb-5">This cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 border rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">Cancel</button>
          <button onClick={onConfirm} disabled={busy}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-60">
            {busy ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Coupon Modal ─────────────────────────────────────────────────────────────

function CouponModal({ coupon, onClose, onSave }: { coupon: Partial<Coupon> | null; onClose: () => void; onSave: (d: any) => void }) {
  const isEdit = !!coupon?.id;
  const [form, setForm] = useState<Partial<Coupon>>(coupon ?? { ...COUPON_EMPTY });
  const [saving, setSaving] = useState(false);
  function set(k: keyof Coupon, v: any) { setForm(f => ({ ...f, [k]: v })); }
  async function handleSave() { setSaving(true); await onSave(form); setSaving(false); }

  const [rawInputs, setRawInputs] = useState<Record<string, string>>({});
  function setNum(k: keyof Coupon, raw: string, nullable = false) {
    setRawInputs(r => ({ ...r, [k]: raw }));
    if (raw === "") { set(k, nullable ? null : 0); return; }
    const n = parseFloat(raw);
    if (!isNaN(n)) set(k, n);
  }
  function numVal(k: keyof Coupon): string {
    return k in rawInputs ? rawInputs[k] : String((form as any)[k] ?? "");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-lg">{isEdit ? "Edit Coupon" : "Create Coupon"}</h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Code *</label>
              <input value={form.code ?? ""} onChange={e => set("code", e.target.value.toUpperCase())} placeholder="SAVE10"
                className="w-full border rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Type *</label>
              <select value={form.type ?? "fixed"} onChange={e => set("type", e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          {form.type !== "free_delivery" && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Value ({form.type === "fixed" ? "$" : "%"}) *</label>
              <input type="text" inputMode="decimal" value={numVal("value")} onChange={e => setNum("value", e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Display Label</label>
            <input value={form.label ?? ""} onChange={e => set("label", e.target.value)} placeholder="Auto-generated if empty"
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Min Order ($)</label>
              <input type="text" inputMode="decimal" value={numVal("minOrder")} onChange={e => setNum("minOrder", e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Max Uses</label>
              <input type="text" inputMode="decimal" value={numVal("maxUsage")} placeholder="Unlimited"
                onChange={e => setNum("maxUsage", e.target.value, true)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Per Customer</label>
              <input type="text" inputMode="decimal" value={numVal("usagePerCustomer")} placeholder="Unlimited"
                onChange={e => setNum("usagePerCustomer", e.target.value, true)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Start Date</label>
              <input type="date" value={form.startDate?.slice(0, 10) ?? ""}
                onChange={e => set("startDate", e.target.value ? new Date(e.target.value).toISOString() : null)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">End Date</label>
              <input type="date" value={form.endDate?.slice(0, 10) ?? ""}
                onChange={e => set("endDate", e.target.value ? new Date(e.target.value).toISOString() : null)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Category Restriction</label>
            <input value={form.categoryRestriction ?? ""} placeholder="e.g. Whiskey (leave blank for all)"
              onChange={e => set("categoryRestriction", e.target.value || null)}
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => set("active", !form.active)}>
              {form.active ? <ToggleRight size={28} className="text-green-500" /> : <ToggleLeft size={28} className="text-gray-300" />}
            </div>
            <span className="text-sm font-medium">{form.active ? "Active" : "Inactive"}</span>
          </label>
        </div>
        <div className="flex gap-3 p-5 border-t">
          <button onClick={onClose} className="flex-1 border rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.code}
            className="flex-1 flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            {isEdit ? "Save Changes" : "Create Coupon"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Flash Deal Modal ─────────────────────────────────────────────────────────

const FD_EMPTY: Partial<FlashDeal> = { name: "", brand: "", slug: "", price: 0, salePrice: 0, volume: "750ml", stockQty: 10, maxStock: 10, active: true, startAt: null, endsAt: null, imageUrl: null, productId: undefined };

function FlashDealModal({ deal, onClose, onSave }: { deal: Partial<FlashDeal> | null; onClose: () => void; onSave: (d: any) => void }) {
  const isEdit = !!deal?.id;
  const [form, setForm] = useState<Partial<FlashDeal>>(deal ?? { ...FD_EMPTY });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [showPicker, setShowPicker] = useState(!isEdit);

  // Products for picker — fetch fresh each time picker opens, no cache
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);

  useEffect(() => {
    if (!showPicker) return;
    setLoadingProducts(true);
    setProductError(null);
    fetch(`${API}/admin/products`)
      .then(r => {
        if (!r.ok) throw new Error(`Server returned ${r.status}`);
        return r.json();
      })
      .then(json => {
        const list: InventoryProduct[] = Array.isArray(json) ? json : (json.products ?? json.data ?? []);
        setProducts(list);
      })
      .catch(e => setProductError(String(e)))
      .finally(() => setLoadingProducts(false));
  }, [showPicker]);

  function set(k: keyof FlashDeal, v: any) { setForm(f => ({ ...f, [k]: v })); }
  async function handleSave() { setSaving(true); await onSave(form); setSaving(false); }

  // Raw string inputs to preserve decimals while typing (e.g. "12." → Number("12.") = 12 → loses dot)
  const [rawInputs, setRawInputs] = useState<Record<string, string>>({});
  function setNum(k: keyof FlashDeal, raw: string) {
    setRawInputs(r => ({ ...r, [k]: raw }));
    const n = parseFloat(raw);
    if (!isNaN(n)) set(k, n);
    else if (raw === "" || raw === "-") set(k, 0);
  }
  function numVal(k: keyof FlashDeal): string {
    return k in rawInputs ? rawInputs[k] : String((form as any)[k] ?? "");
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return products.slice(0, 40);
    return products.filter(p => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)).slice(0, 40);
  }, [products, search]);

  function selectProduct(p: InventoryProduct) {
    setForm(f => ({
      ...f,
      productId: p.id,
      name: p.name,
      brand: p.brand,
      volume: p.volume,
      price: p.price,
      imageUrl: p.imageUrl,
      slug: p.slug,
      stockQty: f.stockQty ?? 10,
      maxStock: f.maxStock ?? 10,
    }));
    setShowPicker(false);
    setSearch("");
  }

  const pct = form.price && form.salePrice ? discountPct(form.price, form.salePrice) : 0;
  const hasProduct = !!form.name;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b shrink-0">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Zap size={18} className="text-yellow-500" />
            {isEdit ? "Edit Flash Deal" : "New Flash Deal"}
          </h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* ── Product Picker ── */}
          {showPicker ? (
            <div className="p-5 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Select a product from inventory</p>

              {/* Search */}
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name, brand or category…"
                  className="w-full pl-9 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              {/* Product Grid */}
              {loadingProducts ? (
                <div className="py-12 flex items-center justify-center gap-2 text-gray-400">
                  <Loader2 size={20} className="animate-spin" /> Loading products…
                </div>
              ) : productError ? (
                <div className="py-10 text-center">
                  <p className="text-red-500 text-sm font-medium mb-2">Failed to load products</p>
                  <p className="text-xs text-gray-400 mb-3">{productError}</p>
                  <button onClick={() => { setShowPicker(false); setTimeout(() => setShowPicker(true), 50); }}
                    className="text-xs bg-yellow-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-yellow-600">
                    Retry
                  </button>
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-center text-gray-400 py-10 text-sm">
                  {products.length === 0 ? "No products in inventory" : "No products match your search"}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 max-h-[52vh] overflow-y-auto pr-1">
                  {filtered.map(p => (
                    <button
                      key={p.id}
                      onClick={() => selectProduct(p)}
                      className="flex items-center gap-3 p-3 rounded-xl border hover:border-yellow-400 hover:bg-yellow-50 transition-colors text-left group"
                    >
                      {/* Thumbnail */}
                      <div className="w-14 h-14 rounded-lg border bg-gray-50 flex items-center justify-center shrink-0 overflow-hidden">
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.imageUrl} alt="" className="w-full h-full object-contain p-1" />
                        ) : (
                          <Package size={22} className="text-gray-300" />
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-800 leading-tight line-clamp-2">{p.name}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{p.brand}</p>
                        <p className="text-xs font-semibold text-gray-700 mt-1">${p.price.toFixed(2)}</p>
                      </div>
                      <ChevronRight size={14} className="text-gray-300 group-hover:text-yellow-500 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-5 space-y-4">
              {/* Selected Product Card */}
              <div className="flex items-center gap-3 p-3 rounded-xl border border-yellow-300 bg-yellow-50">
                <div className="w-14 h-14 rounded-lg border bg-white flex items-center justify-center shrink-0 overflow-hidden">
                  {form.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.imageUrl} alt="" className="w-full h-full object-contain p-1" />
                  ) : (
                    <Package size={22} className="text-gray-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm leading-tight truncate">{form.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{form.brand}</p>
                  <p className="text-xs font-semibold text-gray-600 mt-0.5">Original: ${form.price?.toFixed(2)}</p>
                </div>
                <button
                  onClick={() => setShowPicker(true)}
                  className="text-xs font-semibold text-yellow-700 bg-white border border-yellow-300 px-3 py-1.5 rounded-lg hover:bg-yellow-100 transition-colors shrink-0"
                >
                  Change
                </button>
              </div>

              {/* Sale Price + Discount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Sale Price ($) *</label>
                  <input
                    autoFocus
                    type="text" inputMode="decimal"
                    value={numVal("salePrice")}
                    onChange={e => setNum("salePrice", e.target.value)}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Discount</label>
                  <div className={`border rounded-xl px-3 py-2.5 text-sm font-bold ${pct > 0 ? "bg-green-50 text-green-600 border-green-200" : "bg-gray-50 text-gray-400"}`}>
                    {pct > 0 ? `-${pct}%` : "—"}
                  </div>
                </div>
              </div>

              {/* Stock */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Flash Stock</label>
                  <input type="text" inputMode="decimal" value={numVal("stockQty")} onChange={e => setNum("stockQty", e.target.value)}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                  <p className="text-[11px] text-gray-400 mt-1">Available units for this deal</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Max Stock</label>
                  <input type="text" inputMode="decimal" value={numVal("maxStock")} onChange={e => setNum("maxStock", e.target.value)}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                  <p className="text-[11px] text-gray-400 mt-1">For progress bar display</p>
                </div>
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Start (optional)</label>
                  <input type="datetime-local" value={toLocalDatetimeInput(form.startAt ?? null)}
                    onChange={e => set("startAt", e.target.value ? new Date(e.target.value).toISOString() : null)}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Ends At</label>
                  <input type="datetime-local" value={toLocalDatetimeInput(form.endsAt ?? null)}
                    onChange={e => set("endsAt", e.target.value ? new Date(e.target.value).toISOString() : null)}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                </div>
              </div>

              {/* Active toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => set("active", !form.active)}>
                  {form.active ? <ToggleRight size={28} className="text-green-500" /> : <ToggleLeft size={28} className="text-gray-300" />}
                </div>
                <span className="text-sm font-medium">{form.active ? "Active — visible on website" : "Inactive — hidden"}</span>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t shrink-0">
          <button onClick={onClose} className="flex-1 border rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">Cancel</button>
          {!showPicker && (
            <button onClick={handleSave} disabled={saving || !hasProduct || !form.salePrice}
              className="flex-1 flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              {isEdit ? "Save Changes" : "Create Deal"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Bundle Tier Modal ────────────────────────────────────────────────────────

function BundleTierModal({ tier, onClose, onSave }: { tier: Partial<BundleTier> | null; onClose: () => void; onSave: (d: any) => void }) {
  const isEdit = !!tier?.id;
  const [form, setForm] = useState<Partial<BundleTier>>(tier ?? { minQty: 2, discountPct: 5, label: "", active: true, sortOrder: 1 });
  const [saving, setSaving] = useState(false);
  function set(k: keyof BundleTier, v: any) { setForm(f => ({ ...f, [k]: v })); }
  async function handleSave() { setSaving(true); await onSave(form); setSaving(false); }

  const [rawInputs, setRawInputs] = useState<Record<string, string>>({});
  function setNum(k: keyof BundleTier, raw: string) {
    setRawInputs(r => ({ ...r, [k]: raw }));
    const n = parseFloat(raw);
    if (!isNaN(n)) set(k, n);
    else if (raw === "") set(k, 0);
  }
  function numVal(k: keyof BundleTier): string {
    return k in rawInputs ? rawInputs[k] : String((form as any)[k] ?? "");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Package size={18} className="text-purple-500" />
            {isEdit ? "Edit Bundle Tier" : "New Bundle Tier"}
          </h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Min Quantity *</label>
              <input type="text" inputMode="decimal" value={numVal("minQty")} onChange={e => setNum("minQty", e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <p className="text-xs text-gray-400 mt-1">Bottles in cart to trigger</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Discount % *</label>
              <input type="text" inputMode="decimal" value={numVal("discountPct")} onChange={e => setNum("discountPct", e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <p className="text-xs text-gray-400 mt-1">Applied to subtotal</p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Display Label</label>
            <input value={form.label ?? ""} onChange={e => set("label", e.target.value)}
              placeholder={`Buy ${form.minQty}+ bottles — Save ${form.discountPct}%`}
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <p className="text-xs text-gray-400 mt-1">Shown on website. Auto-generated if empty.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Sort Order</label>
            <input type="text" inputMode="decimal" value={numVal("sortOrder")} onChange={e => setNum("sortOrder", e.target.value)}
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => set("active", !form.active)}>
              {form.active ? <ToggleRight size={28} className="text-green-500" /> : <ToggleLeft size={28} className="text-gray-300" />}
            </div>
            <span className="text-sm font-medium">{form.active ? "Active — applied at checkout" : "Inactive — disabled"}</span>
          </label>
        </div>
        <div className="flex gap-3 p-5 border-t">
          <button onClick={onClose} className="flex-1 border rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.minQty || !form.discountPct}
            className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            {isEdit ? "Save Changes" : "Create Tier"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Coupons Tab ──────────────────────────────────────────────────────────────

function CouponsTab() {
  const [showModal, setShowModal] = useState(false);
  const [editCoupon, setEditCoupon] = useState<Coupon | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: coupons = [], isLoading } = useQuery<Coupon[]>({
    queryKey: ["admin-coupons"],
    queryFn: async () => { const r = await fetch(`${API}/admin/coupons`); return r.json(); },
    refetchInterval: 30_000,
  });

  const createM = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch(`${API}/admin/coupons`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? "Failed");
      return json;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-coupons"] }); setShowModal(false); },
    onError: (e: any) => alert(e.message),
  });
  const updateM = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch(`${API}/admin/coupons/${data.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-coupons"] }); setEditCoupon(null); setShowModal(false); },
  });
  const deleteM = useMutation({
    mutationFn: async (id: string) => fetch(`${API}/admin/coupons/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-coupons"] }); setDeleteId(null); },
  });
  const toggleM = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const r = await fetch(`${API}/admin/coupons/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active }) });
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-coupons"] }),
  });

  async function handleSave(data: any) {
    if (data.id) await updateM.mutateAsync(data);
    else await createM.mutateAsync(data);
  }

  const typeColors = { fixed: "bg-green-100 text-green-700", percentage: "bg-blue-100 text-blue-700", free_delivery: "bg-purple-100 text-purple-700" };

  return (
    <>
      {showModal && <CouponModal coupon={editCoupon} onClose={() => { setShowModal(false); setEditCoupon(null); }} onSave={handleSave} />}
      {deleteId && <DeleteConfirm onConfirm={() => deleteM.mutate(deleteId)} onCancel={() => setDeleteId(null)} busy={deleteM.isPending} />}

      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-gray-500">{coupons.length} coupons · {coupons.filter(c => c.active).length} active</p>
        <button onClick={() => { setEditCoupon(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-colors">
          <Plus size={16} /> New Coupon
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total", value: coupons.length, color: "bg-blue-50 text-blue-700" },
          { label: "Active", value: coupons.filter(c => c.active).length, color: "bg-green-50 text-green-700" },
          { label: "Total Uses", value: coupons.reduce((a, c) => a + c.usageCount, 0), color: "bg-brand-50 text-brand-700" },
          { label: "Expired", value: coupons.filter(c => isExpired(c.endDate)).length, color: "bg-red-50 text-red-700" },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-xl border p-4 text-center`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs mt-0.5 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-400"><Loader2 size={28} className="animate-spin mx-auto mb-2" />Loading...</div>
        ) : coupons.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-400"><Tag size={32} className="mx-auto mb-2 opacity-30" /><p>No coupons yet.</p></div>
        ) : coupons.map(c => {
          const expired = isExpired(c.endDate);
          const isActive = c.active && !expired;
          const valueStr = c.type === "free_delivery" ? "Free Delivery" : c.type === "fixed" ? `$${c.value} off` : `${c.value}% off`;
          return (
            <div key={c.id} className={`bg-white rounded-xl border p-4 flex items-center gap-3 ${expired ? "opacity-70" : ""}`}>
              {/* Code badge */}
              <div className="shrink-0 flex flex-col items-center justify-center bg-brand-50 rounded-xl px-3 py-2 min-w-[72px] text-center">
                <span className="font-mono font-black text-brand-700 text-sm leading-tight">{c.code}</span>
                <span className={`text-[11px] font-bold mt-0.5 ${c.type === "fixed" ? "text-green-600" : c.type === "percentage" ? "text-blue-600" : "text-purple-600"}`}>{valueStr}</span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                {c.label && <p className="text-sm font-semibold text-gray-800 truncate">{c.label}</p>}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                  {c.minOrder > 0 && <span className="text-xs text-gray-500">Min ${c.minOrder}</span>}
                  <span className="text-xs text-gray-500">{c.usageCount}{c.maxUsage ? `/${c.maxUsage}` : ""} uses</span>
                  {c.endDate && (
                    <span className={`text-xs ${expired ? "text-red-500 font-medium" : "text-gray-400"}`}>
                      {expired ? "Expired " : "Until "}{fmtDate(c.endDate)}
                    </span>
                  )}
                  {!c.endDate && !c.startDate && <span className="text-xs text-gray-400">No expiry</span>}
                </div>
              </div>

              {/* Right controls */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                <button onClick={() => toggleM.mutate({ id: c.id, active: !c.active })}
                  className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-full border transition-colors ${isActive ? "bg-green-50 text-green-700 border-green-200" : expired ? "bg-red-50 text-red-600 border-red-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                  {isActive ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                  {isActive ? "Active" : expired ? "Expired" : "Off"}
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setEditCoupon(c); setShowModal(true); }}
                    className="text-gray-400 hover:text-brand-600 p-1.5 rounded-lg hover:bg-brand-50"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => setDeleteId(c.id)} className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Flash Deals Tab ──────────────────────────────────────────────────────────

function FlashDealsTab() {
  const [showModal, setShowModal] = useState(false);
  const [editDeal, setEditDeal] = useState<FlashDeal | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: deals = [], isLoading } = useQuery<FlashDeal[]>({
    queryKey: ["admin-flash-deals"],
    queryFn: async () => { const r = await fetch(`${API}/admin/flash-deals`); return r.json(); },
    refetchInterval: 30_000,
  });

  const createM = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch(`${API}/admin/flash-deals`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? "Failed");
      return json;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-flash-deals"] }); setShowModal(false); },
    onError: (e: any) => alert(e.message),
  });
  const updateM = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch(`${API}/admin/flash-deals/${data.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-flash-deals"] }); setEditDeal(null); setShowModal(false); },
  });
  const deleteM = useMutation({
    mutationFn: async (id: string) => fetch(`${API}/admin/flash-deals/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-flash-deals"] }); setDeleteId(null); },
  });
  const toggleM = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const r = await fetch(`${API}/admin/flash-deals/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active }) });
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-flash-deals"] }),
  });

  async function handleSave(data: any) {
    if (data.id) await updateM.mutateAsync(data);
    else await createM.mutateAsync(data);
  }

  const now = new Date();
  const activeDeals = deals.filter(d => d.active && (!d.endsAt || new Date(d.endsAt) > now));

  return (
    <>
      {showModal && <FlashDealModal deal={editDeal} onClose={() => { setShowModal(false); setEditDeal(null); }} onSave={handleSave} />}
      {deleteId && <DeleteConfirm onConfirm={() => deleteM.mutate(deleteId)} onCancel={() => setDeleteId(null)} busy={deleteM.isPending} />}

      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-gray-500">{deals.length} flash deals · {activeDeals.length} live</p>
        <button onClick={() => { setEditDeal(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-colors">
          <Plus size={16} /> New Flash Deal
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Total Deals", value: deals.length, color: "bg-yellow-50 text-yellow-700" },
          { label: "Live Now", value: activeDeals.length, color: "bg-green-50 text-green-700" },
          { label: "Expired", value: deals.filter(d => isExpired(d.endsAt)).length, color: "bg-red-50 text-red-700" },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-xl border p-4 text-center`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs mt-0.5 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-400"><Loader2 size={28} className="animate-spin mx-auto mb-2" />Loading...</div>
        ) : deals.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
            <Zap size={32} className="mx-auto mb-2 opacity-30" />
            <p>No flash deals yet. Create your first!</p>
          </div>
        ) : deals.map(d => {
          const expired = isExpired(d.endsAt);
          const live = d.active && !expired && (!d.startAt || new Date(d.startAt) <= now);
          const pct = discountPct(d.price, d.salePrice);
          const stockPct = d.maxStock > 0 ? Math.round((d.stockQty / d.maxStock) * 100) : 100;
          return (
            <div key={d.id} className={`bg-white rounded-xl border p-4 flex items-center gap-3 ${expired ? "opacity-70" : ""}`}>
              {/* Thumbnail */}
              <div className="w-12 h-12 rounded-lg border bg-gray-50 flex items-center justify-center shrink-0 overflow-hidden">
                {d.imageUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={d.imageUrl} alt="" className="w-full h-full object-contain p-0.5" />
                  : <Zap size={16} className="text-yellow-400" />}
              </div>

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-tight truncate">{d.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{d.brand}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="font-bold text-green-600 text-sm">${d.salePrice.toFixed(2)}</span>
                  <span className="text-xs text-gray-400 line-through">${d.price.toFixed(2)}</span>
                  <span className="bg-red-100 text-red-700 text-[11px] font-bold px-1.5 py-0.5 rounded-full">-{pct}%</span>
                </div>
                {/* Stock bar */}
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="w-20 h-1.5 bg-gray-200 rounded-full">
                    <div className={`h-full rounded-full ${stockPct > 50 ? "bg-green-500" : stockPct > 20 ? "bg-yellow-500" : "bg-red-500"}`}
                      style={{ width: `${stockPct}%` }} />
                  </div>
                  <span className="text-[11px] text-gray-400">{d.stockQty}/{d.maxStock}</span>
                </div>
                {/* Schedule */}
                {d.endsAt && (
                  <p className={`text-[11px] mt-1 ${expired ? "text-red-500 font-medium" : "text-gray-400"}`}>
                    {expired ? "Ended: " : "Ends: "}{fmtDateTime(d.endsAt)}
                  </p>
                )}
              </div>

              {/* Right side controls */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                <button onClick={() => toggleM.mutate({ id: d.id, active: !d.active })}
                  className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-full border transition-colors ${live ? "bg-green-50 text-green-700 border-green-200" : expired ? "bg-red-50 text-red-600 border-red-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                  {live ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                  {live ? "Live" : expired ? "Expired" : "Off"}
                </button>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditDeal(d); setShowModal(true); }} className="text-gray-400 hover:text-yellow-600 p-1.5 rounded-lg hover:bg-yellow-50"><Edit2 size={14} /></button>
                  <button onClick={() => setDeleteId(d.id)} className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Bundle Deals Tab ─────────────────────────────────────────────────────────

function BundleDealsTab() {
  const [showModal, setShowModal] = useState(false);
  const [editTier, setEditTier] = useState<BundleTier | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: tiers = [], isLoading } = useQuery<BundleTier[]>({
    queryKey: ["admin-bundle-tiers"],
    queryFn: async () => { const r = await fetch(`${API}/admin/bundle-tiers`); return r.json(); },
    refetchInterval: 30_000,
  });

  const createM = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch(`${API}/admin/bundle-tiers`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? "Failed");
      return json;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-bundle-tiers"] }); setShowModal(false); },
    onError: (e: any) => alert(e.message),
  });
  const updateM = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch(`${API}/admin/bundle-tiers/${data.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-bundle-tiers"] }); setEditTier(null); setShowModal(false); },
  });
  const deleteM = useMutation({
    mutationFn: async (id: string) => fetch(`${API}/admin/bundle-tiers/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-bundle-tiers"] }); setDeleteId(null); },
  });
  const toggleM = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const r = await fetch(`${API}/admin/bundle-tiers/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active }) });
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-bundle-tiers"] }),
  });

  async function handleSave(data: any) {
    if (data.id) await updateM.mutateAsync(data);
    else await createM.mutateAsync(data);
  }

  return (
    <>
      {showModal && <BundleTierModal tier={editTier} onClose={() => { setShowModal(false); setEditTier(null); }} onSave={handleSave} />}
      {deleteId && <DeleteConfirm onConfirm={() => deleteM.mutate(deleteId)} onCancel={() => setDeleteId(null)} busy={deleteM.isPending} />}

      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-gray-500">{tiers.length} discount tiers · {tiers.filter(t => t.active).length} active</p>
        <button onClick={() => { setEditTier(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-colors">
          <Plus size={16} /> New Tier
        </button>
      </div>

      <div className="mb-5 bg-purple-50 border border-purple-200 rounded-xl p-4 flex gap-3">
        <Package size={18} className="text-purple-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-purple-800">
          <p className="font-semibold mb-0.5">How Bundle Deals work</p>
          <p className="text-purple-700 text-xs">When a customer adds enough bottles to cart, the highest matching tier discount is automatically applied at checkout. Tiers are applied to the order subtotal before tax.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-gray-400"><Loader2 size={28} className="animate-spin mx-auto mb-2" />Loading...</div>
      ) : (
        <div className="space-y-3">
          {tiers.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
              <Package size={32} className="mx-auto mb-2 opacity-30" />
              <p>No bundle tiers. Create your first discount tier!</p>
            </div>
          ) : tiers.map(t => (
            <div key={t.id} className={`bg-white rounded-xl border p-4 flex items-center gap-4 ${!t.active ? "opacity-60" : ""}`}>
              <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-purple-100 flex flex-col items-center justify-center">
                <span className="text-xl font-black text-purple-700">{t.discountPct}%</span>
                <span className="text-[10px] font-semibold text-purple-500 uppercase">off</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900">{t.label || `Buy ${t.minQty}+ bottles — Save ${t.discountPct}%`}</p>
                <p className="text-xs text-gray-500 mt-0.5">Triggers at <span className="font-semibold">{t.minQty}+ bottles</span> · Sort: {t.sortOrder}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button onClick={() => toggleM.mutate({ id: t.id, active: !t.active })}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${t.active ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                  {t.active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                  {t.active ? "Active" : "Off"}
                </button>
                <button onClick={() => { setEditTier(t); setShowModal(true); }} className="text-gray-400 hover:text-purple-600 p-1.5 rounded-lg hover:bg-purple-50"><Edit2 size={15} /></button>
                <button onClick={() => setDeleteId(t.id)} className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ─── Banner Types & Helpers ───────────────────────────────────────────────────

interface HeroBanner {
  id: string; title: string; subtitle: string; imageUrl: string;
  ctaText: string; ctaLink: string; linkType: string; linkValue: string;
  active: boolean; startDate: string | null; endDate: string | null;
  sortOrder: number; bgColor: string; createdAt: string;
}

const LINK_TYPES = [
  { value: "url",          label: "Custom URL" },
  { value: "flash-deals",  label: "Flash Deals page" },
  { value: "bundle-deals", label: "Bundle Deals page" },
  { value: "new",          label: "New Products" },
  { value: "hard-to-find", label: "Hard to Find" },
  { value: "category",     label: "Category (specify below)" },
  { value: "product",      label: "Product slug (specify below)" },
];

const BANNER_EMPTY: Partial<HeroBanner> = {
  title: "", subtitle: "", imageUrl: "", ctaText: "", ctaLink: "",
  linkType: "url", linkValue: "", active: true, startDate: null, endDate: null, bgColor: "#111827",
};

// ─── Banner Modal ─────────────────────────────────────────────────────────────

function BannerModal({ banner, onClose, onSave }: { banner: Partial<HeroBanner> | null; onClose: () => void; onSave: (d: any) => void }) {
  const isEdit = !!banner?.id;
  const [form, setForm] = useState<Partial<HeroBanner>>(banner ?? { ...BANNER_EMPTY });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function set(k: keyof HeroBanner, v: any) { setForm(f => ({ ...f, [k]: v })); }

  async function handleImageUpload(file: File) {
    setUploading(true); setUploadError(null);
    const fd = new FormData(); fd.append("image", file);
    const r = await fetch(`${API}/admin/upload?folder=banners`, { method: "POST", body: fd });
    const json = await r.json();
    setUploading(false);
    if (json.url) set("imageUrl", json.url);
    else setUploadError(json.error ?? "Upload failed");
  }

  async function handleSave() { setSaving(true); await onSave(form); setSaving(false); }

  const needsValue = form.linkType === "category" || form.linkType === "product";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <ImageIcon size={18} className="text-indigo-500" />
            {isEdit ? "Edit Banner" : "New Banner"}
          </h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Image upload */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Banner Image *</label>
            <div
              className="border-2 border-dashed rounded-xl overflow-hidden cursor-pointer hover:border-indigo-400 transition-colors"
              style={{ minHeight: 120 }}
              onClick={() => fileRef.current?.click()}
            >
              {form.imageUrl ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.imageUrl} alt="" className="w-full h-36 object-cover" />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <p className="text-white text-sm font-semibold">Click to change</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                  {uploading
                    ? <><Loader2 size={28} className="animate-spin mb-2" /><p className="text-sm">Uploading…</p></>
                    : <><ImageIcon size={28} className="mb-2" /><p className="text-sm">Click to upload banner image</p><p className="text-xs">JPG, PNG, WEBP — max 10 MB</p></>}
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ""; }} />
            {uploadError && <p className="text-red-500 text-xs mt-1">{uploadError}</p>}
            {/* Or paste URL */}
            <input value={form.imageUrl ?? ""} onChange={e => set("imageUrl", e.target.value)}
              placeholder="Or paste image URL directly"
              className="mt-2 w-full border rounded-xl px-3 py-2 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>

          {/* Title & Subtitle */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Title <span className="text-gray-300 normal-case font-normal text-xs">(optional)</span></label>
            <input value={form.title ?? ""} onChange={e => set("title", e.target.value)} placeholder="Summer Flash Deals"
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Subtitle</label>
            <input value={form.subtitle ?? ""} onChange={e => set("subtitle", e.target.value)} placeholder="Save up to 40% on premium spirits"
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>

          {/* CTA */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">CTA Button Text</label>
              <input value={form.ctaText ?? ""} onChange={e => set("ctaText", e.target.value)} placeholder="Shop Now"
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Link Destination</label>
              <select value={form.linkType ?? "url"} onChange={e => set("linkType", e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                {LINK_TYPES.map(lt => <option key={lt.value} value={lt.value}>{lt.label}</option>)}
              </select>
            </div>
          </div>

          {form.linkType === "url" && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Custom URL</label>
              <input value={form.ctaLink ?? ""} onChange={e => set("ctaLink", e.target.value)} placeholder="/products?category=whiskey"
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          )}
          {needsValue && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
                {form.linkType === "category" ? "Category name (e.g. Whiskey)" : "Product slug (e.g. buffalo-trace-bourbon)"}
              </label>
              <input value={form.linkValue ?? ""} onChange={e => set("linkValue", e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          )}

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Start Date (optional)</label>
              <input type="date" value={form.startDate?.slice(0, 10) ?? ""}
                onChange={e => set("startDate", e.target.value ? e.target.value + "T00:00:00.000" : null)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">End Date (optional)</label>
              <input type="date" value={form.endDate?.slice(0, 10) ?? ""}
                onChange={e => set("endDate", e.target.value ? e.target.value + "T23:59:59.000" : null)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>

          {/* Active toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => set("active", !form.active)}>
              {form.active ? <ToggleRight size={28} className="text-green-500" /> : <ToggleLeft size={28} className="text-gray-300" />}
            </div>
            <span className="text-sm font-medium">{form.active ? "Active — visible on website" : "Inactive — hidden"}</span>
          </label>
        </div>

        <div className="flex gap-3 p-5 border-t">
          <button onClick={onClose} className="flex-1 border rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.imageUrl}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            {isEdit ? "Save Changes" : "Create Banner"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Banners Tab ──────────────────────────────────────────────────────────────

function BannersTab() {
  const [showModal, setShowModal] = useState(false);
  const [editBanner, setEditBanner] = useState<HeroBanner | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: banners = [], isLoading } = useQuery<HeroBanner[]>({
    queryKey: ["admin-banners"],
    queryFn: async () => { const r = await fetch(`${API}/admin/banners`); return r.json(); },
    refetchInterval: 30_000,
  });

  const createM = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch(`${API}/admin/banners`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? "Failed");
      return json;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-banners"] }); setShowModal(false); },
    onError: (e: any) => alert(e.message),
  });

  const updateM = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch(`${API}/admin/banners/${data.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-banners"] }); setEditBanner(null); setShowModal(false); },
  });

  const deleteM = useMutation({
    mutationFn: async (id: string) => fetch(`${API}/admin/banners/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-banners"] }); setDeleteId(null); },
  });

  const toggleM = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const r = await fetch(`${API}/admin/banners/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active }) });
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-banners"] }),
  });

  const reorderM = useMutation({
    mutationFn: async (ids: string[]) => {
      await fetch(`${API}/admin/banners`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reorder", ids }) });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-banners"] }),
  });

  async function handleSave(data: any) {
    if (data.id) await updateM.mutateAsync(data);
    else await createM.mutateAsync(data);
  }

  // Drag-to-reorder
  function onDragStart(id: string) { setDragId(id); }
  function onDragOver(e: React.DragEvent, id: string) { e.preventDefault(); setDragOverId(id); }
  function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return; }
    const ids = banners.map(b => b.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    const reordered = [...ids];
    reordered.splice(from, 1);
    reordered.splice(to, 0, dragId);
    reorderM.mutate(reordered);
    setDragId(null); setDragOverId(null);
  }

  const activeBanners = banners.filter(b => b.active && (!b.endDate || new Date(b.endDate) > new Date()));

  return (
    <>
      {showModal && <BannerModal banner={editBanner} onClose={() => { setShowModal(false); setEditBanner(null); }} onSave={handleSave} />}
      {deleteId && <DeleteConfirm onConfirm={() => deleteM.mutate(deleteId)} onCancel={() => setDeleteId(null)} busy={deleteM.isPending} />}

      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-gray-500">{banners.length} banners · {activeBanners.length} active</p>
        <button onClick={() => { setEditBanner(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-colors">
          <Plus size={16} /> New Banner
        </button>
      </div>

      <div className="mb-4 bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex gap-2 text-xs text-indigo-700">
        <GripVertical size={14} className="mt-0.5 shrink-0" />
        <span>Drag banners to reorder. The first active banner appears first in the carousel.</span>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-400"><Loader2 size={28} className="animate-spin mx-auto mb-2" />Loading...</div>
        ) : banners.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
            <ImageIcon size={32} className="mx-auto mb-2 opacity-30" />
            <p>No banners yet. Create your first hero banner!</p>
          </div>
        ) : banners.map((b, idx) => {
          const expired = b.endDate ? new Date(b.endDate) < new Date() : false;
          const isActive = b.active && !expired;
          const isDragOver = dragOverId === b.id;
          return (
            <div
              key={b.id}
              draggable
              onDragStart={() => onDragStart(b.id)}
              onDragOver={e => onDragOver(e, b.id)}
              onDrop={() => onDrop(b.id)}
              onDragEnd={() => { setDragId(null); setDragOverId(null); }}
              className={`bg-white rounded-xl border p-3 flex items-center gap-3 transition-all ${isDragOver ? "border-indigo-400 bg-indigo-50 scale-[1.01]" : ""} ${dragId === b.id ? "opacity-50" : ""}`}
            >
              {/* Drag handle */}
              <div className="shrink-0 cursor-grab text-gray-300 hover:text-gray-500 touch-none">
                <GripVertical size={18} />
              </div>

              {/* Sort # */}
              <span className="shrink-0 w-5 text-xs text-gray-400 font-mono text-center">{idx + 1}</span>

              {/* Thumbnail */}
              <div className="shrink-0 w-20 h-12 rounded-lg border bg-gray-100 overflow-hidden">
                {b.imageUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={b.imageUrl} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={16} className="text-gray-300" /></div>}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{b.title}</p>
                {b.subtitle && <p className="text-xs text-gray-400 truncate">{b.subtitle}</p>}
                <div className="flex items-center gap-1 mt-0.5">
                  <ExternalLink size={10} className="text-gray-300" />
                  <span className="text-[11px] text-gray-400">{LINK_TYPES.find(lt => lt.value === b.linkType)?.label ?? b.linkType}</span>
                  {b.endDate && <span className={`text-[11px] ${expired ? "text-red-500" : "text-gray-400"}`}>· {expired ? "Expired" : `Until ${fmtDate(b.endDate)}`}</span>}
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <button onClick={() => toggleM.mutate({ id: b.id, active: !b.active })}
                  className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-full border transition-colors ${isActive ? "bg-green-50 text-green-700 border-green-200" : expired ? "bg-red-50 text-red-600 border-red-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                  {isActive ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                  {isActive ? "Live" : expired ? "Expired" : "Off"}
                </button>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditBanner(b); setShowModal(true); }} className="text-gray-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50"><Edit2 size={14} /></button>
                  <button onClick={() => setDeleteId(b.id)} className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { key: "coupons", label: "Coupons", icon: Tag, color: "text-brand-600" },
  { key: "flash", label: "Flash Deals", icon: Zap, color: "text-yellow-600" },
  { key: "bundle", label: "Bundle Deals", icon: Package, color: "text-purple-600" },
  { key: "banners", label: "Banners", icon: ImageIcon, color: "text-indigo-600" },
] as const;

type TabKey = typeof TABS[number]["key"];

export default function MarketingPage() {
  const [tab, setTab] = useState<TabKey>("coupons");
  const active = TABS.find(t => t.key === tab)!;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <active.icon size={22} className={active.color} /> Marketing
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage promotions, flash sales, and bundle discounts</p>
      </div>

      <div className="flex flex-wrap gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t.key ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
            <t.icon size={15} className={tab === t.key ? t.color : ""} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "coupons" && <CouponsTab />}
      {tab === "flash" && <FlashDealsTab />}
      {tab === "bundle" && <BundleDealsTab />}
      {tab === "banners" && <BannersTab />}
    </div>
  );
}
