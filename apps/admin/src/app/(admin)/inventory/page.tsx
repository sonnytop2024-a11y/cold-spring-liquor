"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Edit, Trash2, Search, Package, X, Check, ImageIcon,
  Star, ChevronDown, Upload, Download, CheckCircle2,
} from "lucide-react";
import { ImportModal } from "./ImportModal";
import { API } from "@/lib/api";

// ── Export helper (CSV generated in browser) ──────────────────────────────────
async function exportProductsCSV() {
  const res = await fetch(`${API}/admin/products`);
  const products = await res.json() as Record<string, unknown>[];

  const headers = ["SKU","Product Name","Brand","Category","Price","Sale Price",
    "Stock Qty","Volume","ABV","Country","Description","Image URL","Active","Featured"];

  const rows = products.map((p) => [
    p.id, p.name, p.brand, p.category, p.price, p.salePrice ?? "",
    p.stockQty, p.volume, p.abv, p.country,
    `"${String(p.description ?? "").replace(/"/g, '""')}"`,
    p.imageUrl ?? "", p.active ? "yes" : "no", p.featured ? "yes" : "no",
  ]);

  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `csl-products-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const CATEGORIES = [
  "whiskey", "tequila", "vodka", "rum", "gin", "wine", "beer",
  "champagne", "cognac", "rtd", "liqueur", "other",
];

interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  salePrice: number | null;
  volume: string;
  abv: number;
  country: string;
  stockQty: number;
  inStock: boolean;
  featured: boolean;
  active: boolean;
  description: string;
  imageUrl: string | null;
}

const EMPTY: Omit<Product, "id" | "slug"> = {
  name: "", brand: "", category: "whiskey", price: 0, salePrice: null,
  volume: "750ml", abv: 40, country: "USA", stockQty: 0,
  inStock: false, featured: false, active: false, description: "", imageUrl: null,
};

async function fetchProducts(search: string, category: string, stock: string) {
  // Use /api/admin/products — returns ALL products (no limit, no activeOnly filter)
  const params = new URLSearchParams();
  if (search)   params.set("q", search);
  if (category) params.set("category", category);
  if (stock)    params.set("stock", stock); // "in" | "out" | "" = all
  const res = await fetch(`${API}/admin/products?${params}`);
  const data = await res.json();
  return (data.products ?? data.data ?? data) as Product[];
}

async function createProduct(body: Partial<Product>) {
  const res = await fetch(`${API}/admin/products`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as Record<string, string>).error ?? `Create failed (${res.status})`);
  }
  return res.json();
}

async function updateProduct({ id, ...body }: Partial<Product> & { id: string }) {
  const res = await fetch(`${API}/admin/products/${id}`, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as Record<string, string>).error ?? `Save failed (${res.status})`);
  }
  return res.json();
}

async function deleteProduct(id: string) {
  const res = await fetch(`${API}/admin/products/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as Record<string, string>).error ?? `Delete failed (${res.status})`);
  }
}

function StatusBadge({ qty }: { qty: number }) {
  if (qty > 0) return <span className="text-xs px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">Active</span>;
  return <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">Inactive</span>;
}

interface ProductModalProps {
  product: Partial<Product> | null;
  onClose: () => void;
  onSave: (data: Partial<Product>) => void;
  saving: boolean;
}

function ProductModal({ product, onClose, onSave, saving }: ProductModalProps) {
  const isNew = !product?.id;
  const [form, setForm] = useState<Omit<Product, "id" | "slug">>({
    name: product?.name ?? EMPTY.name,
    brand: product?.brand ?? EMPTY.brand,
    category: product?.category ?? EMPTY.category,
    price: product?.price ?? EMPTY.price,
    salePrice: product?.salePrice ?? EMPTY.salePrice,
    volume: product?.volume ?? EMPTY.volume,
    abv: product?.abv ?? EMPTY.abv,
    country: product?.country ?? EMPTY.country,
    stockQty: product?.stockQty ?? EMPTY.stockQty,
    inStock: product?.inStock ?? EMPTY.inStock,
    featured: product?.featured ?? EMPTY.featured,
    active: product?.active ?? EMPTY.active,
    description: product?.description ?? EMPTY.description,
    imageUrl: product?.imageUrl ?? EMPTY.imageUrl,
  });

  // ── Image upload state ─────────────────────────────────────────────────────
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(product?.imageUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => { if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current); };
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setUploadError("Only JPG, PNG, or WEBP files are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File too large. Maximum size is 5 MB.");
      return;
    }
    setUploadError("");
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    const url = URL.createObjectURL(file);
    blobUrlRef.current = url;
    setPendingFile(file);
    setPreviewUrl(url);
  }

  function handleRemoveImage() {
    if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
    setPendingFile(null);
    setPreviewUrl(null);
    set("imageUrl", null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploadError("");
  }

  // String states for price inputs to allow free typing (e.g., "12." while typing "12.99")
  const [priceText, setPriceText] = useState(
    product?.price != null && product.price > 0 ? String(product.price) : ""
  );
  const [salePriceText, setSalePriceText] = useState(
    product?.salePrice != null ? String(product.salePrice) : ""
  );
  const [priceError, setPriceError] = useState("");
  const [salePriceError, setSalePriceError] = useState("");

  function set(k: keyof typeof form, v: unknown) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function parsePriceText(text: string): number | null {
    const clean = text.trim();
    if (!clean) return null;
    const n = parseFloat(clean);
    if (isNaN(n) || n < 0) return null;
    // Max 2 decimal places
    if (!/^\d+(\.\d{0,2})?$/.test(clean)) return null;
    return n;
  }

  function handlePriceBlur() {
    const n = parsePriceText(priceText);
    if (priceText.trim() === "") {
      setPriceError("Price is required");
      return;
    }
    if (n === null) {
      setPriceError("Enter a valid price, e.g. 12.99");
      return;
    }
    if (n <= 0) {
      setPriceError("Price must be greater than $0.00");
      return;
    }
    setPriceError("");
    set("price", n);
    setPriceText(String(n));
  }

  function handleSalePriceBlur() {
    if (!salePriceText.trim()) {
      setSalePriceError("");
      set("salePrice", null);
      return;
    }
    const n = parsePriceText(salePriceText);
    if (n === null) {
      setSalePriceError("Enter a valid price, e.g. 9.99");
      return;
    }
    if (n <= 0) {
      setSalePriceError("Sale price must be greater than $0.00");
      return;
    }
    setSalePriceError("");
    set("salePrice", n);
    setSalePriceText(String(n));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedPrice = parsePriceText(priceText);
    if (!parsedPrice || parsedPrice <= 0) {
      setPriceError("Price is required and must be a valid amount greater than $0.00");
      return;
    }
    const parsedSalePrice = salePriceText.trim() ? parsePriceText(salePriceText) : null;
    if (salePriceText.trim() && parsedSalePrice === null) {
      setSalePriceError("Enter a valid sale price, e.g. 9.99");
      return;
    }

    // If a new file is pending, upload it first
    let imageUrl: string | null = pendingFile ? null : previewUrl;
    if (pendingFile) {
      setUploading(true);
      setUploadError("");
      try {
        const fd = new FormData();
        fd.append("image", pendingFile);
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) {
          setUploadError(data.error ?? "Upload failed. Please try again.");
          setUploading(false);
          return;
        }
        imageUrl = data.url;
      } catch {
        setUploadError("Network error during upload. Please try again.");
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const finalForm = { ...form, price: parsedPrice, salePrice: parsedSalePrice, imageUrl };
    onSave(product?.id ? { id: product.id, ...finalForm } : finalForm);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-lg">{isNew ? "Add New Product" : "Edit Product"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">Product Image</label>
            <div className="flex gap-4 items-start">
              {/* Preview box */}
              <div className="w-24 h-24 shrink-0 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-contain p-1" />
                ) : (
                  <ImageIcon size={28} className="text-gray-300" />
                )}
              </div>

              {/* Controls */}
              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 w-full border rounded-lg py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Upload size={14} />
                  {previewUrl ? "Change Image" : "Upload Image"}
                </button>
                {previewUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="flex items-center justify-center gap-2 w-full border border-red-200 rounded-lg py-2 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <X size={13} /> Remove Image
                  </button>
                )}
                <p className="text-xs text-gray-400">JPG, PNG, WEBP · Max 5 MB</p>
                {pendingFile && !uploadError && (
                  <p className="text-xs text-blue-600 font-medium truncate">
                    📎 {pendingFile.name} ({(pendingFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
                {uploadError && (
                  <p className="text-xs text-red-600 font-medium">{uploadError}</p>
                )}
              </div>
            </div>
          </div>

          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Product Name *</label>
              <input
                required
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Jack Daniel's Old No. 7"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Category *</label>
              <div className="relative">
                <select
                  value={form.category}
                  onChange={(e) => set("category", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 appearance-none capitalize"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Price ($) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium pointer-events-none">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={priceText}
                  onChange={(e) => { setPriceText(e.target.value); setPriceError(""); }}
                  onBlur={handlePriceBlur}
                  placeholder="0.00"
                  className={`w-full border rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 ${priceError ? "border-red-400 focus:ring-red-300" : "focus:ring-brand-500"}`}
                />
              </div>
              {priceError && <p className="text-xs text-red-500 mt-1">{priceError}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Sale Price ($)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium pointer-events-none">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={salePriceText}
                  onChange={(e) => { setSalePriceText(e.target.value); setSalePriceError(""); }}
                  onBlur={handleSalePriceBlur}
                  placeholder="Optional"
                  className={`w-full border rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 ${salePriceError ? "border-red-400 focus:ring-red-300" : "focus:ring-brand-500"}`}
                />
              </div>
              {salePriceError && <p className="text-xs text-red-500 mt-1">{salePriceError}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Stock Qty *</label>
              <input
                required
                type="number"
                min="0"
                value={form.stockQty}
                onChange={(e) => set("stockQty", parseInt(e.target.value) || 0)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Volume</label>
              <input
                value={form.volume}
                onChange={(e) => set("volume", e.target.value)}
                placeholder="750ml"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ABV (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.abv}
                onChange={(e) => set("abv", parseFloat(e.target.value) || 0)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Country</label>
              <input
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
                placeholder="USA"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              placeholder="Product description..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          {/* Status info + featured */}
          <div className="flex items-center justify-between rounded-xl border px-4 py-3 bg-gray-50">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Status</p>
              <div className="flex items-center gap-1.5">
                <StatusBadge qty={form.stockQty} />
                <span className="text-xs text-gray-400">
                  {form.stockQty > 0 ? "— visible on website" : "— hidden from website (stock = 0)"}
                </span>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <button
                type="button"
                onClick={() => set("featured", !form.featured)}
                className={`transition-colors ${form.featured ? "text-yellow-400" : "text-gray-300"}`}
              >
                <Star size={22} className={form.featured ? "fill-yellow-400" : ""} />
              </button>
              <span className="text-sm font-medium text-gray-600">Featured</span>
            </label>
          </div>

          <div className="flex gap-3 pt-2 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="flex-1 flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
            >
              {uploading ? (
                <><span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4" /> Uploading…</>
              ) : saving ? (
                <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4" />
              ) : (
                <><Check size={16} /> {isNew ? "Add Product" : "Save Changes"}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [modalProduct, setModalProduct] = useState<Partial<Product> | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const qc = useQueryClient();

  function showToast(msg: string, ok = true) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, ok });
    toastTimer.current = setTimeout(() => setToast(null), ok ? 2500 : 5000);
  }

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-products", search, catFilter, stockFilter],
    queryFn: () => fetchProducts(search, catFilter, stockFilter),
    refetchInterval: 30_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-products"] });

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: (newProduct: Product) => {
      // Optimistically prepend the new product to all cached queries
      qc.setQueriesData(
        { queryKey: ["admin-products"] },
        (old: unknown) => Array.isArray(old) ? [newProduct, ...old] : [newProduct],
      );
      invalidate();
      setShowModal(false);
      showToast("Product created successfully.");
    },
    onError: (e: Error) => showToast(e.message, false),
  });
  const updateMutation = useMutation({
    mutationFn: updateProduct,
    onSuccess: () => { invalidate(); setShowModal(false); showToast("Changes saved successfully."); },
    onError: (e: Error) => showToast(e.message, false),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onMutate: async (id: string) => {
      // Cancel in-flight fetches so they don't overwrite our optimistic update
      await qc.cancelQueries({ queryKey: ["admin-products"] });
      // Immediately remove the product from all cached queries
      qc.setQueriesData(
        { queryKey: ["admin-products"] },
        (old: unknown) => Array.isArray(old) ? old.filter((p: Product) => p.id !== id) : old,
      );
    },
    onSuccess: () => { invalidate(); showToast("Product deleted."); },
    onError: (e: Error) => { invalidate(); showToast(e.message, false); },
  });

  function openAdd() { setModalProduct(null); setShowModal(true); }
  function openEdit(p: Product) { setModalProduct(p); setShowModal(true); }

  function handleSave(data: Partial<Product>) {
    if (data.id) {
      updateMutation.mutate(data as Partial<Product> & { id: string });
    } else {
      createMutation.mutate(data);
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  const activeCount  = products.filter((p: Product) => p.stockQty > 0).length;
  const lowStock     = products.filter((p: Product) => p.stockQty > 0 && p.stockQty < 5).length;
  const inactiveCount = products.filter((p: Product) => p.stockQty <= 0).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Product Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {products.length} products · {activeCount} active
            {inactiveCount > 0 && <span className="text-red-500 ml-2">· {inactiveCount} inactive</span>}
            {lowStock > 0 && <span className="text-amber-600 ml-2">· {lowStock} low stock</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export */}
          <button
            onClick={async () => {
              setExporting(true);
              await exportProductsCSV();
              setExporting(false);
            }}
            disabled={exporting}
            className="flex items-center gap-2 border border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 disabled:opacity-60 text-gray-700 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors"
          >
            <Download size={15} />
            {exporting ? "Exporting…" : "Export CSV"}
          </button>

          {/* Import */}
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 border border-brand-400 hover:border-brand-500 bg-brand-50 hover:bg-brand-100 text-brand-700 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors"
          >
            <Upload size={15} />
            Import Products
          </button>

          {/* Add manually (existing — unchanged) */}
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm"
          >
            <Plus size={16} />
            Add Product
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border mb-4 p-4 flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or brand..."
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="relative">
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 appearance-none pr-8 capitalize"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 appearance-none pr-8"
          >
            <option value="">All Stock</option>
            <option value="in">In Stock</option>
            <option value="out">Out of Stock</option>
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="animate-spin border-2 border-brand-500 border-t-transparent rounded-full w-8 h-8 mx-auto mb-2" />
            Loading products...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-gray-600">
                  <th className="text-left px-4 py-3 font-medium">Product</th>
                  <th className="text-left px-4 py-3 font-medium">Category</th>
                  <th className="text-left px-4 py-3 font-medium">Pricing</th>
                  <th className="text-left px-4 py-3 font-medium">Stock</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                      <Package size={36} className="mx-auto mb-2 opacity-30" />
                      <p>No products found</p>
                    </td>
                  </tr>
                ) : (
                  (products as Product[]).map((p) => (
                    <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${p.stockQty <= 0 ? "opacity-60" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-lg object-contain border bg-gray-50 p-0.5" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                              <Package size={16} className="text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium leading-tight">{p.name}</p>
                            <p className="text-xs text-gray-400">{p.volume}</p>
                          </div>
                          {p.featured && <Star size={12} className="text-yellow-500 fill-yellow-400 shrink-0" />}
                        </div>
                      </td>
                      <td className="px-4 py-3 capitalize text-gray-600">{p.category}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold">${Number(p.price).toFixed(2)}</p>
                        {p.salePrice && (
                          <p className="text-xs text-red-500 font-medium">${Number(p.salePrice).toFixed(2)} sale</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 font-medium">{p.stockQty}</td>
                      <td className="px-4 py-3">
                        <StatusBadge qty={p.stockQty} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openEdit(p)}
                            title="Edit product"
                            className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete "${p.name}"? This cannot be undone.`)) {
                                deleteMutation.mutate(p.id);
                              }
                            }}
                            title="Delete product"
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual add/edit modal (existing — unchanged) */}
      {showModal && (
        <ProductModal
          product={modalProduct}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
          saving={saving}
        />
      )}

      {/* Bulk import modal (new) */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onDone={() => {
            setShowImport(false);
            invalidate();
          }}
        />
      )}

      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg max-w-xs ${toast.ok ? "bg-gray-900" : "bg-red-600"}`}>
          <CheckCircle2 size={16} className={`shrink-0 ${toast.ok ? "text-green-400" : "text-white"}`} />
          {toast.msg}
        </div>
      )}
    </div>
  );
}
