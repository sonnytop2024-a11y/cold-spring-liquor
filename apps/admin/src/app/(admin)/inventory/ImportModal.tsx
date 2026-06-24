"use client";

import { useState, useRef, useCallback } from "react";
import {
  X, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2,
  RefreshCw, ChevronRight, Download, Loader2,
} from "lucide-react";
import { API } from "@/lib/api";

// ── Types ────────────────────────────────────────────────────────────────────

interface PreviewProduct {
  id: string; name: string; brand: string; category: string;
  price: number; salePrice: number | null; volume: string;
  stockQty: number; imageUrl: string | null; description: string;
}
interface PreviewUpdated {
  product: PreviewProduct;
  original: PreviewProduct;
  changes: string[];
}
interface ImportError { row: number; message: string; name?: string }
interface PreviewResult {
  preview: true;
  newCount: number; updateCount: number; errorCount: number;
  newProducts: PreviewProduct[];
  updatedProducts: PreviewUpdated[];
  errors: ImportError[];
}
interface ConfirmResult {
  success: true; added: number; updated: number; skipped: number;
  errors: ImportError[];
}

type Step = "upload" | "parsing" | "preview" | "confirming" | "done";

// ── CSV parser (native, no deps) ──────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === "," && !inQ) { result.push(cur); cur = ""; }
    else cur += c;
  }
  result.push(cur);
  return result;
}

function parseCSV(text: string): Record<string, unknown>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const vals = parseCSVLine(line);
    const row: Record<string, unknown> = {};
    headers.forEach((h, i) => { row[h] = vals[i]?.trim() ?? ""; });
    return row;
  }).filter((r) => Object.values(r).some((v) => v !== ""));
}

// ── XLSX via CDN (SheetJS) ───────────────────────────────────────────────────

declare global {
  interface Window {
    XLSX?: {
      read: (data: ArrayBuffer, opts: { type: string }) => {
        SheetNames: string[];
        Sheets: Record<string, unknown>;
      };
      utils: { sheet_to_json: (sheet: unknown, opts?: unknown) => Record<string, unknown>[] };
    };
  }
}

async function loadXLSXLib(): Promise<void> {
  if (window.XLSX) return;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://unpkg.com/xlsx/dist/xlsx.full.min.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load XLSX parser"));
    document.head.appendChild(s);
  });
}

async function parseXLSX(buffer: ArrayBuffer): Promise<Record<string, unknown>[]> {
  await loadXLSXLib();
  const wb = window.XLSX!.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return window.XLSX!.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, unknown>[];
}

// ── Sample CSV download ───────────────────────────────────────────────────────

const SAMPLE_CSV = `Product Name,Brand,Category,Price,Sale Price,Stock Qty,Volume,ABV,Country,Description,Image URL,SKU
Jack Daniel's Old No. 7,Jack Daniel's,whiskey,24.99,,50,750ml,40,USA,Smooth Tennessee whiskey,,p-jd7
Casamigos Blanco,Casamigos,tequila,44.99,39.99,30,750ml,40,Mexico,Ultra-premium tequila,,p-casb
Tito's Handmade Vodka,Tito's,vodka,21.99,,80,750ml,40,USA,America's original craft vodka,,p-tito`;

function downloadSampleCSV() {
  const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "csl-import-template.csv"; a.click();
  URL.revokeObjectURL(url);
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  onDone: () => void;
}

export function ImportModal({ onClose, onDone }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<ConfirmResult | null>(null);
  const [activeTab, setActiveTab] = useState<"new" | "updated" | "errors">("new");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError("");
    setFileName(file.name);
    setStep("parsing");

    try {
      let rows: Record<string, unknown>[];
      if (file.name.endsWith(".csv")) {
        const text = await file.text();
        rows = parseCSV(text);
      } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const buffer = await file.arrayBuffer();
        rows = await parseXLSX(buffer);
      } else {
        throw new Error("Unsupported file type. Use .csv or .xlsx");
      }

      if (rows.length === 0) throw new Error("No data rows found in file");

      const res = await fetch(`${API}/admin/products/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, confirm: false }),
      });
      if (!res.ok) throw new Error("Server error during preview");
      const data = (await res.json()) as PreviewResult;
      setPreview(data);
      setActiveTab(data.newCount > 0 ? "new" : data.updateCount > 0 ? "updated" : "errors");
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Parse error");
      setStep("upload");
    }
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function handleConfirm() {
    if (!preview) return;
    setStep("confirming");
    try {
      const res = await fetch(`${API}/admin/products/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: [
            ...preview.newProducts,
            ...preview.updatedProducts.map((u) => u.product),
          ],
          confirm: true,
        }),
      });
      if (!res.ok) throw new Error("Confirm failed");
      const data = (await res.json()) as ConfirmResult;
      setResult(data);
      setStep("done");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirm error");
      setStep("preview");
    }
  }

  // ── Upload screen ────────────────────────────────────────────────────────────
  if (step === "upload" || step === "parsing") {
    return (
      <ModalShell onClose={onClose} title="Import Products">
        <div className="p-6 space-y-5">
          {/* Sample download */}
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-blue-800">Download Template</p>
              <p className="text-xs text-blue-600 mt-0.5">See the required column format before uploading</p>
            </div>
            <button
              onClick={downloadSampleCSV}
              className="flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 border border-blue-300 hover:border-blue-500 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Download size={13} /> Download CSV Template
            </button>
          </div>

          {/* Dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
              isDragOver
                ? "border-brand-400 bg-brand-50"
                : "border-gray-300 hover:border-brand-400 hover:bg-gray-50"
            } ${step === "parsing" ? "pointer-events-none opacity-70" : ""}`}
          >
            {step === "parsing" ? (
              <>
                <Loader2 size={40} className="mx-auto mb-3 text-brand-500 animate-spin" />
                <p className="font-semibold text-gray-700">Parsing {fileName}…</p>
                <p className="text-sm text-gray-400 mt-1">Detecting columns and validating rows</p>
              </>
            ) : (
              <>
                <FileSpreadsheet size={40} className="mx-auto mb-3 text-gray-400" />
                <p className="font-semibold text-gray-700">Drop your file here or click to browse</p>
                <p className="text-sm text-gray-400 mt-1">Supports .csv and .xlsx (Excel)</p>
                <p className="text-xs text-gray-400 mt-3">
                  Required columns: <span className="font-mono">Product Name, Brand, Category, Price, Stock Qty</span>
                </p>
              </>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Supported columns reference */}
          <details className="text-sm">
            <summary className="cursor-pointer font-medium text-gray-600 hover:text-gray-900">
              Supported Column Names ↓
            </summary>
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-500 bg-gray-50 rounded-xl p-4">
              {[
                ["Product Name", "name, productname, title"],
                ["Brand", "brand, manufacturer, distillery"],
                ["Category", "category, type, spirit"],
                ["Price", "price, retail price, msrp"],
                ["Sale Price", "sale price, promo price"],
                ["Stock Qty", "stock, qty, quantity, inventory"],
                ["Volume", "volume, size, ml"],
                ["ABV", "abv, alcohol"],
                ["Country", "country, origin"],
                ["Description", "description, desc, notes"],
                ["Image URL", "image url, photo, imageurl"],
                ["SKU", "sku, id, product_id"],
              ].map(([field, accepted]) => (
                <div key={field}>
                  <span className="font-semibold text-gray-700">{field}:</span>{" "}
                  <span className="font-mono">{accepted}</span>
                </div>
              ))}
            </div>
          </details>
        </div>
      </ModalShell>
    );
  }

  // ── Preview screen ────────────────────────────────────────────────────────────
  if ((step === "preview" || step === "confirming") && preview) {
    const tabs = [
      { key: "new" as const, label: "New Products", count: preview.newCount, color: "green" },
      { key: "updated" as const, label: "Updates", count: preview.updateCount, color: "blue" },
      { key: "errors" as const, label: "Errors / Skipped", count: preview.errorCount, color: "red" },
    ];

    return (
      <ModalShell onClose={onClose} title={`Preview Import — ${fileName}`} wide>
        {/* Summary bar */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="text-sm"><strong>{preview.newCount}</strong> new products</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-sm"><strong>{preview.updateCount}</strong> updates</span>
            </div>
            {preview.errorCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-sm text-red-600"><strong>{preview.errorCount}</strong> errors (will be skipped)</span>
              </div>
            )}
            <div className="ml-auto text-xs text-gray-400">Review carefully before confirming</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-6 gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.key
                  ? "border-brand-500 text-brand-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span
                  className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-bold ${
                    t.key === "new" ? "bg-green-100 text-green-700" :
                    t.key === "updated" ? "bg-blue-100 text-blue-700" :
                    "bg-red-100 text-red-700"
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="overflow-y-auto" style={{ maxHeight: "380px" }}>
          {activeTab === "new" && (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Product</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Category</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Price</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {preview.newProducts.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No new products</td></tr>
                ) : preview.newProducts.map((p, i) => (
                  <tr key={i} className="hover:bg-green-50/50">
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.brand} · {p.volume}</p>
                    </td>
                    <td className="px-4 py-2.5 capitalize text-gray-500 text-xs">{p.category}</td>
                    <td className="px-4 py-2.5 font-semibold">${p.price.toFixed(2)}
                      {p.salePrice && <span className="ml-1 text-xs text-red-500 font-medium">(${p.salePrice.toFixed(2)} sale)</span>}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{p.stockQty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === "updated" && (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Product</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Changes</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {preview.updatedProducts.length === 0 ? (
                  <tr><td colSpan={2} className="px-4 py-8 text-center text-gray-400">No updates</td></tr>
                ) : preview.updatedProducts.map((u, i) => (
                  <tr key={i} className="hover:bg-blue-50/50">
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{u.product.name}</p>
                      <p className="text-xs text-gray-400">{u.product.brand}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {u.changes.length === 0
                          ? <span className="text-xs text-gray-400">No field changes (will skip)</span>
                          : u.changes.map((c, j) => (
                            <span key={j} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{c}</span>
                          ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === "errors" && (
            <div className="divide-y">
              {preview.errors.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-400">No errors — all rows are valid!</div>
              ) : preview.errors.map((e, i) => (
                <div key={i} className="px-4 py-3 flex items-start gap-3">
                  <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Row {e.row}{e.name ? ` — ${e.name}` : ""}</p>
                    <p className="text-xs text-red-600">{e.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error notice */}
        {error && (
          <div className="mx-6 mb-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Action bar */}
        <div className="px-6 py-4 border-t flex items-center justify-between gap-3 bg-gray-50">
          <button
            onClick={() => { setStep("upload"); setPreview(null); setFileName(""); if (fileRef.current) fileRef.current.value = ""; }}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium"
          >
            ← Upload Different File
          </button>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 border rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={step === "confirming" || (preview.newCount + preview.updateCount === 0)}
              className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl text-sm font-bold transition-colors"
            >
              {step === "confirming" ? (
                <><Loader2 size={15} className="animate-spin" /> Importing…</>
              ) : (
                <><ChevronRight size={15} /> Confirm Import ({preview.newCount + preview.updateCount} products)</>
              )}
            </button>
          </div>
        </div>
      </ModalShell>
    );
  }

  // ── Done screen ───────────────────────────────────────────────────────────────
  if (step === "done" && result) {
    return (
      <ModalShell onClose={onClose} title="Import Complete">
        <div className="p-8 text-center space-y-6">
          <CheckCircle2 size={56} className="mx-auto text-green-500" />
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">Import Successful</h3>
            <p className="text-gray-500 text-sm">{fileName} has been processed</p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-3xl font-black text-green-600">{result.added}</p>
              <p className="text-xs font-semibold text-green-700 mt-1">Products Added</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-3xl font-black text-blue-600">{result.updated}</p>
              <p className="text-xs font-semibold text-blue-700 mt-1">Products Updated</p>
            </div>
            <div className="bg-gray-100 rounded-xl p-4">
              <p className="text-3xl font-black text-gray-500">{result.skipped}</p>
              <p className="text-xs font-semibold text-gray-500 mt-1">Skipped (errors)</p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="text-left bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-amber-800 mb-2">Skipped rows:</p>
              {result.errors.slice(0, 5).map((e, i) => (
                <p key={i} className="text-xs text-amber-700">Row {e.row}: {e.message}</p>
              ))}
              {result.errors.length > 5 && <p className="text-xs text-amber-600 mt-1">…and {result.errors.length - 5} more</p>}
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 rounded-xl transition-colors"
          >
            Done — View Products
          </button>
        </div>
      </ModalShell>
    );
  }

  return null;
}

// ── Shared modal shell ────────────────────────────────────────────────────────

function ModalShell({
  children, onClose, title, wide,
}: {
  children: React.ReactNode; onClose: () => void; title: string; wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? "max-w-4xl" : "max-w-xl"} my-4 overflow-hidden`}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet size={18} className="text-brand-500" />
            <h2 className="font-bold text-lg">{title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
