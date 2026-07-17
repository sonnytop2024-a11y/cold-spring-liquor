"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { ArrowUp, ArrowDown, Trash2, Plus, Upload, ImageOff } from "lucide-react";

/* Admin editor for the Hero Product Showcase — full control: master toggle,
   product CRUD (max 5), ordering, per-product image upload (auto-trimmed &
   auto-fit server-side), and placement sliders per breakpoint. Types mirror
   apps/web (the two apps share no packages, same as Settings itself). */

export interface HeroShowcaseProduct {
  id: string;
  kicker: string;
  subtitle: string;
  badge: string;
  price: number;
  regularPrice: number | null;
  imageUrl: string | null;
  url: string;
  active: boolean;
  order: number;
}

export interface HeroShowcaseConfig {
  enabled: boolean;
  showOnMobile: boolean;
  showOnDesktop: boolean;
  products: HeroShowcaseProduct[];
  mobile: { size: number; right: number; bottom: number };
  desktop: { size: number; left: number; bottom: number };
}

export const DEFAULT_HERO_SHOWCASE: HeroShowcaseConfig = {
  enabled: true,
  showOnMobile: true,
  showOnDesktop: false, // desktop hero has no clean dark zone — off by default
  products: [],
  mobile: { size: 150, right: 4, bottom: 4 },
  desktop: { size: 160, left: 46, bottom: 4.5 },
};

const MAX_PRODUCTS = 5;

function MiniToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? "bg-brand-500" : "bg-gray-200"}`}>
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform mt-0.5 ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  );
}

function Slider({ label, min, max, step, value, suffix, onChange }: {
  label: string; min: number; max: number; step?: number; value: number; suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 text-xs text-gray-500">
      <span className="w-28 shrink-0 font-medium">{label}</span>
      <input type="range" min={min} max={max} step={step ?? 1} value={value}
        onChange={e => onChange(parseFloat(e.target.value))} className="flex-1 accent-brand-500" />
      <span className="w-14 text-right font-bold text-gray-800 tabular-nums">{value}{suffix}</span>
    </div>
  );
}

/* Compact live preview: rotates through active draft products on a dark
   hero-like circle. Full effects (pulse/sparks) render on the live site. */
function ShowcasePreview({ config }: { config: HeroShowcaseConfig }) {
  const active = config.products.filter(p => p.active).sort((a, b) => a.order - b.order);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (active.length < 2) return;
    const t = setInterval(() => setIdx(i => (i + 1) % active.length), 4000);
    return () => clearInterval(t);
  }, [active.length]);

  const shouldShow = config.enabled && active.length > 0;
  const p = active[Math.min(idx, active.length - 1)];

  return (
    <div className="relative h-56 rounded-xl overflow-hidden border"
      style={{ background: "radial-gradient(ellipse at 72% 20%, rgba(255,160,50,.16), transparent 55%), linear-gradient(180deg,#07080c 0%,#0a0704 55%,#140b04 100%)" }}>
      <span className="absolute top-2 left-2 z-10 text-[10px] text-gray-300 bg-black/50 rounded-full px-2 py-0.5">
        Live preview — unsaved changes
      </span>
      {!shouldShow ? (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-500 text-center px-8">
          {config.enabled
            ? "Không có sản phẩm active — showcase tự ẩn trên site (không bao giờ hiện vòng tròn trống)."
            : "Showcase đang TẮT — không hiển thị trên site."}
        </div>
      ) : (
        <div className="absolute" style={{ right: "8%", bottom: "8%", width: 170, aspectRatio: "1/1" }}>
          <div className="absolute rounded-full border pointer-events-none"
            style={{ inset: -8, borderColor: "rgba(255,140,40,.25)", boxShadow: "0 0 18px rgba(255,120,30,.18)" }} />
          <div className="absolute inset-0 rounded-full flex items-center justify-center overflow-hidden"
            style={{
              border: "1.5px solid rgba(255,130,30,.9)",
              background: "radial-gradient(circle at 50% 68%, rgba(255,110,10,.20), rgba(4,3,2,.82) 68%)",
              boxShadow: "0 0 10px rgba(255,100,0,.5), 0 0 22px rgba(255,90,0,.22), inset 0 0 16px rgba(255,110,20,.12)",
            }}>
            <div className="absolute flex flex-col items-center justify-center text-center" style={{ inset: "16%" }}>
              <p className="font-extrabold" style={{ fontSize: 9.5, letterSpacing: ".09em", color: "#F7D26B", fontFamily: "Georgia, serif" }}>{p.kicker || "—"}</p>
              <p style={{ fontSize: 7.5, color: "#d8d0c2", marginTop: 2 }}>{p.subtitle}</p>
              <div className="flex items-end justify-center" style={{ height: "44%", marginTop: 4, filter: "drop-shadow(0 6px 6px rgba(0,0,0,.5))" }}>
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt="" style={{ height: "100%", width: "auto", maxWidth: "100%", objectFit: "contain" }} />
                ) : (
                  <div className="rounded" style={{ width: 26, height: "92%", background: "linear-gradient(90deg, rgba(224,162,74,.5), #e0a24a 45%, rgba(255,255,255,.25) 60%, #e0a24a)" }} />
                )}
              </div>
              <p className="font-extrabold" style={{ fontSize: 13, color: "#F7D26B", marginTop: 4 }}>
                ${(p.price || 0).toFixed(2)}
                {p.regularPrice ? <span style={{ fontSize: 8.5, color: "#8a8a8a", textDecoration: "line-through", marginLeft: 4 }}>${p.regularPrice.toFixed(2)}</span> : null}
              </p>
            </div>
            <div className="absolute left-0 right-0 flex justify-center" style={{ bottom: "7%", gap: 4 }}>
              {active.map((_, i) => (
                <span key={i} className="rounded-full"
                  style={i === Math.min(idx, active.length - 1)
                    ? { width: 12, height: 4, borderRadius: 3, background: "linear-gradient(90deg,#F7D26B,#E8590C)" }
                    : { width: 4, height: 4, background: "rgba(255,255,255,.35)" }} />
              ))}
            </div>
          </div>
          {p.badge && (
            <div className="absolute font-extrabold text-center"
              style={{
                top: "-3%", right: "-4%", background: "linear-gradient(135deg,#F7D26B,#B8860B)", color: "#241a04",
                fontSize: 7.5, lineHeight: 1.25, padding: "4px 7px", borderRadius: 8, transform: "rotate(6deg)",
                boxShadow: "0 4px 10px rgba(0,0,0,.45)", whiteSpace: "nowrap", zIndex: 12,
              }}>
              {p.badge.split("\n").map((l, i) => <span key={i}>{i > 0 && <br />}{l}</span>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProductCard({ p, index, total, api, onPatch, onRemove, onMove }: {
  p: HeroShowcaseProduct; index: number; total: number; api: string;
  onPatch: (patch: Partial<HeroShowcaseProduct>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) { setUploadErr("Chỉ nhận JPG, PNG, WEBP."); return; }
    if (file.size > 8 * 1024 * 1024) { setUploadErr("Ảnh tối đa 8 MB."); return; }
    setUploadErr("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch(`${api}/admin/upload?folder=showcase`, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error || "Upload failed");
      onPatch({ imageUrl: json.url });
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : "Upload thất bại.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const inputCls = "w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-400";

  return (
    <div className={`border rounded-xl p-3.5 ${p.active ? "bg-white" : "bg-gray-50 opacity-60"}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-gray-800">#{index + 1} — {p.kicker || "Chưa đặt tên"}</p>
        <div className="flex items-center gap-1.5">
          <button type="button" disabled={index === 0} onClick={() => onMove(-1)}
            className="p-1.5 border rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-30"><ArrowUp size={12} /></button>
          <button type="button" disabled={index === total - 1} onClick={() => onMove(1)}
            className="p-1.5 border rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-30"><ArrowDown size={12} /></button>
          <MiniToggle checked={p.active} onChange={v => onPatch({ active: v })} />
          <button type="button" onClick={onRemove}
            className="p-1.5 border border-red-200 rounded-lg text-red-500 hover:bg-red-50"><Trash2 size={12} /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <label className="text-[10px] font-bold text-gray-400 tracking-wide">TÊN HIỂN THỊ (KICKER)</label>
          <input className={inputCls} value={p.kicker} placeholder="NEW ARRIVAL"
            onChange={e => onPatch({ kicker: e.target.value })} />
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-400 tracking-wide">SUBTITLE</label>
          <input className={inputCls} value={p.subtitle} placeholder="Just In · Limited Stock"
            onChange={e => onPatch({ subtitle: e.target.value })} />
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-400 tracking-wide">GIÁ ($)</label>
          <input className={inputCls} type="number" step="0.01" value={p.price || ""}
            onChange={e => onPatch({ price: parseFloat(e.target.value) || 0 })} />
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-400 tracking-wide">GIÁ GỐC ($, tuỳ chọn — gạch ngang)</label>
          <input className={inputCls} type="number" step="0.01" value={p.regularPrice ?? ""} placeholder="—"
            onChange={e => onPatch({ regularPrice: e.target.value === "" ? null : parseFloat(e.target.value) || null })} />
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-400 tracking-wide">BADGE (2 dòng cách nhau bằng &quot;/&quot;)</label>
          <input className={inputCls} value={p.badge.replace("\n", " / ")} placeholder="LIMITED / EDITION"
            onChange={e => onPatch({ badge: e.target.value.split("/").map(s => s.trim()).join("\n") })} />
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-400 tracking-wide">LINK SẢN PHẨM</label>
          <input className={inputCls} value={p.url} placeholder="/products/ten-san-pham"
            onChange={e => onPatch({ url: e.target.value })} />
        </div>
      </div>

      <div className="flex items-center gap-3 mt-3">
        <div className="w-12 h-14 rounded-lg border border-dashed bg-gray-50 flex items-center justify-center overflow-hidden shrink-0"
          style={{ background: p.imageUrl ? "repeating-conic-gradient(#eee 0% 25%, #fff 0% 50%) 50% / 12px 12px" : undefined }}>
          {p.imageUrl ? <img src={p.imageUrl} alt="" className="max-w-full max-h-full object-contain" />
            : <ImageOff size={16} className="text-gray-300" />}
        </div>
        <div className="flex-1 min-w-0">
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleUpload} />
          <div className="flex gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 border rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50">
              <Upload size={11} /> {uploading ? "Đang tải…" : p.imageUrl ? "Đổi ảnh" : "Tải ảnh chai"}
            </button>
            {p.imageUrl && (
              <button type="button" onClick={() => onPatch({ imageUrl: null })}
                className="text-[11px] px-2.5 py-1.5 border border-red-200 rounded-lg text-red-500 hover:bg-red-50">Xoá ảnh</button>
            )}
          </div>
          <p className="text-[10px] text-gray-400 mt-1">
            Khuyên dùng PNG nền trong suốt. Ảnh tự cắt viền thừa &amp; tự vừa khít vòng tròn — không cần chỉnh size.
          </p>
          {uploadErr && <p className="text-[10px] text-red-500 mt-0.5">{uploadErr}</p>}
        </div>
      </div>
    </div>
  );
}

export function HeroShowcaseEditor({ value, onChange, api }: {
  value: HeroShowcaseConfig | undefined;
  onChange: (v: HeroShowcaseConfig) => void;
  api: string;
}) {
  // merge over defaults so rows saved before new fields existed stay valid
  const cfg: HeroShowcaseConfig = { ...DEFAULT_HERO_SHOWCASE, ...(value ?? {}) };
  const sorted = [...cfg.products].sort((a, b) => a.order - b.order);
  const activeCount = sorted.filter(p => p.active).length;

  const patch = (partial: Partial<HeroShowcaseConfig>) => onChange({ ...cfg, ...partial });
  const patchProduct = (id: string, p: Partial<HeroShowcaseProduct>) =>
    patch({ products: cfg.products.map(x => (x.id === id ? { ...x, ...p } : x)) });
  const removeProduct = (id: string) => patch({ products: cfg.products.filter(x => x.id !== id) });
  const moveProduct = (id: string, dir: -1 | 1) => {
    const arr = [...sorted];
    const i = arr.findIndex(x => x.id === id);
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    const oi = arr[i].order;
    arr[i] = { ...arr[i], order: arr[j].order };
    arr[j] = { ...arr[j], order: oi };
    patch({ products: cfg.products.map(x => arr.find(a => a.id === x.id) ?? x) });
  };
  const addProduct = () => {
    if (cfg.products.length >= MAX_PRODUCTS) return;
    patch({
      products: [...cfg.products, {
        id: `sp${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        kicker: "NEW ARRIVAL", subtitle: "Just In", badge: "NEW\nARRIVAL",
        price: 0, regularPrice: null, imageUrl: null, url: "",
        active: true, order: (Math.max(0, ...cfg.products.map(p => p.order)) + 1),
      }],
    });
  };

  return (
    <div className="py-1">
      <div className="flex items-start justify-between gap-4 py-3 border-b">
        <div>
          <p className="text-sm font-medium text-gray-800">Enable Product Showcase</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Tắt khi không có gì mới để giới thiệu — bật lại khi có sản phẩm mới. Nếu 0 sản phẩm active, showcase tự ẩn trên site kể cả khi đang bật.
          </p>
        </div>
        <button type="button" onClick={() => patch({ enabled: !cfg.enabled })}
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${cfg.enabled ? "bg-brand-500" : "bg-gray-200"}`}>
          <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform mt-0.5 ${cfg.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>

      <div className="flex items-start justify-between gap-4 py-3 border-b">
        <div>
          <p className="text-sm font-medium text-gray-800">Hiện trên Mobile</p>
          <p className="text-xs text-gray-500 mt-0.5">Ảnh hero mobile có góc tối phải-dưới trống — vị trí đẹp nhất cho showcase.</p>
        </div>
        <MiniToggle checked={cfg.showOnMobile} onChange={v => patch({ showOnMobile: v })} />
      </div>
      <div className="flex items-start justify-between gap-4 py-3 border-b">
        <div>
          <p className="text-sm font-medium text-gray-800">Hiện trên Desktop</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Mặc định TẮT — ảnh hero desktop không có vùng tối trống (giỏ chai, xe tải, route chiếm chỗ). Bật lại nếu đổi ảnh hero khác.
          </p>
        </div>
        <MiniToggle checked={cfg.showOnDesktop} onChange={v => patch({ showOnDesktop: v })} />
      </div>

      <div className="py-3 border-b">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-sm font-medium text-gray-800">Sản phẩm</p>
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${activeCount > 0 ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>
            {activeCount} / {MAX_PRODUCTS} active
          </span>
        </div>
        <div className="space-y-3">
          {sorted.map((p, i) => (
            <ProductCard key={p.id} p={p} index={i} total={sorted.length} api={api}
              onPatch={pp => patchProduct(p.id, pp)}
              onRemove={() => removeProduct(p.id)}
              onMove={dir => moveProduct(p.id, dir)} />
          ))}
        </div>
        <button type="button" onClick={addProduct} disabled={cfg.products.length >= MAX_PRODUCTS}
          className="mt-3 w-full flex items-center justify-center gap-1.5 border border-dashed rounded-xl py-2.5 text-xs font-semibold text-gray-500 hover:border-brand-400 hover:text-brand-600 disabled:opacity-40 transition-colors">
          <Plus size={13} /> Thêm sản phẩm {cfg.products.length >= MAX_PRODUCTS ? "(tối đa 5)" : ""}
        </button>
      </div>

      <div className="py-3 border-b space-y-2.5">
        <div className={cfg.showOnMobile ? "space-y-2.5" : "space-y-2.5 opacity-40 pointer-events-none"}>
          <p className="text-sm font-medium text-gray-800">Vị trí &amp; kích thước — Mobile</p>
          <Slider label="Kích thước" min={100} max={260} value={cfg.mobile.size} suffix="px"
            onChange={v => patch({ mobile: { ...cfg.mobile, size: v } })} />
          <Slider label="Cách mép phải" min={0} max={30} step={0.5} value={cfg.mobile.right} suffix="%"
            onChange={v => patch({ mobile: { ...cfg.mobile, right: v } })} />
          <Slider label="Cách đáy" min={0} max={40} step={0.5} value={cfg.mobile.bottom} suffix="%"
            onChange={v => patch({ mobile: { ...cfg.mobile, bottom: v } })} />
        </div>
        <div className={cfg.showOnDesktop ? "space-y-2.5 pt-2" : "space-y-2.5 pt-2 opacity-40 pointer-events-none"}>
          <p className="text-sm font-medium text-gray-800">Vị trí &amp; kích thước — Desktop</p>
          <Slider label="Kích thước" min={100} max={300} value={cfg.desktop.size} suffix="px"
            onChange={v => patch({ desktop: { ...cfg.desktop, size: v } })} />
          <Slider label="Cách mép trái" min={0} max={80} step={0.5} value={cfg.desktop.left} suffix="%"
            onChange={v => patch({ desktop: { ...cfg.desktop, left: v } })} />
          <Slider label="Cách đáy" min={0} max={40} step={0.5} value={cfg.desktop.bottom} suffix="%"
            onChange={v => patch({ desktop: { ...cfg.desktop, bottom: v } })} />
        </div>
        <p className="text-[11px] text-gray-400">
          Mặc định đã canh theo vùng tối của ảnh hero (không đè xe tải / giỏ chai). Chỉnh xong bấm Save Settings để áp dụng lên site.
        </p>
      </div>

      <div className="py-4">
        <p className="text-sm font-medium text-gray-800 mb-2">Live Preview</p>
        <ShowcasePreview config={cfg} />
        <p className="text-xs text-gray-500 mt-2">
          Preview rút gọn (nội dung + badge + xoay vòng). Hiệu ứng đầy đủ — tia sáng chạy từ store, spark field, particle — chạy trên site thật sau khi Save.
        </p>
      </div>
    </div>
  );
}
