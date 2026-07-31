"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Check, X, ChevronUp, ChevronDown, Eye, EyeOff, Camera, Loader2 } from "lucide-react";
import { API } from "@/lib/api";

interface Category {
  id: string;
  value: string;
  label: string;
  emoji: string;
  sortOrder: number;
  active: boolean;
  imageUrl?: string;
  iconUrl?: string;
}

const EMOJI_OPTIONS = ["🥃","🍸","🌵","🍹","🌿","🍷","🍾","🍺","🥂","🧃","🥤","🌸","💎","📦","⭐","🔥","✨","🎯","🏆","🍊"];

// Storage base is public (exposed in every image URL on the live site), so a
// hardcoded fallback is safe when the env var isn't present in the admin build.
const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fmgbfzhosuqefsthyuoq.supabase.co";
// Default artwork the website falls back to when no custom photo is set.
const defaultCatImg = (value: string) => `${SUPA}/storage/v1/object/public/csl-images/categories/${value}.webp`;

function EmojiPicker({ value, onChange, iconUrl, onIconChange }: {
  value: string; onChange: (e: string) => void;
  /** Custom uploaded icon — overrides the emoji everywhere it's rendered on the site */
  iconUrl?: string; onIconChange?: (url: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Flip upward when there isn't enough room below — this panel slides in from
  // the right and can be tall, so a row near the bottom would otherwise open
  // the dropdown under the panel's edge or the page's fixed bottom nav.
  function toggleOpen() {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const DROPDOWN_HEIGHT = 230;
      setOpenUp(window.innerHeight - rect.bottom < DROPDOWN_HEIGHT);
    }
    setOpen(v => !v);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch(`${API}/admin/upload?folder=icons`, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error || "Upload failed");
      onIconChange?.(json.url);
      setOpen(false);
    } catch {
      // picker has no error slot of its own
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="relative">
      {onIconChange && (
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleUpload} />
      )}
      <button ref={triggerRef} type="button" onClick={toggleOpen}
        className="w-9 h-9 flex items-center justify-center text-xl border border-gray-300 rounded-lg hover:bg-gray-50 overflow-hidden shrink-0">
        {iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={iconUrl} alt="" className="w-full h-full object-contain p-1" />
        ) : (
          value || "📦"
        )}
      </button>
      {open && (
        <div className={`absolute ${openUp ? "bottom-10" : "top-10"} left-0 z-[60] bg-white border border-gray-200 rounded-xl shadow-lg p-2 w-40`}>
          <div className="grid grid-cols-5 gap-1 mb-1">
            {EMOJI_OPTIONS.map(e => (
              <button key={e} type="button" onClick={() => { onChange(e); onIconChange?.(""); setOpen(false); }}
                className={`text-lg p-1.5 rounded-lg hover:bg-orange-50 ${value === e && !iconUrl ? "bg-orange-100" : ""}`}>
                {e}
              </button>
            ))}
          </div>
          {onIconChange && (
            <div className="border-t border-gray-100 pt-2 mt-1 flex items-center justify-between gap-2">
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="flex items-center gap-1 text-[11px] font-semibold text-orange-600 hover:text-orange-700 disabled:opacity-50">
                {uploading ? <Loader2 size={11} className="animate-spin" /> : <Camera size={11} />}
                {iconUrl ? "Change icon" : "Upload your own icon"}
              </button>
              {iconUrl && (
                <button type="button" onClick={() => onIconChange("")}
                  className="text-[11px] text-gray-400 hover:text-red-500 underline shrink-0">
                  Remove
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddRow({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [emoji, setEmoji] = useState("📦");
  const [iconUrl, setIconUrl] = useState("");
  const [error, setError] = useState("");
  const [autoValue, setAutoValue] = useState(true);

  const add = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API}/admin/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, value, emoji, iconUrl }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error || "Failed"); }
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories"] }); onClose(); },
    onError: (e: Error) => setError(e.message),
  });

  function handleLabel(v: string) {
    setLabel(v);
    if (autoValue) setValue(v.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, ""));
  }

  return (
    <div className="border border-orange-200 bg-orange-50 rounded-xl p-3 mb-3">
      <div className="flex gap-2 flex-wrap items-end">
        <EmojiPicker value={emoji} onChange={setEmoji} iconUrl={iconUrl} onIconChange={setIconUrl} />
        <div className="flex-1 min-w-[120px]">
          <label className="text-[10px] font-semibold text-gray-500 mb-0.5 block">NAME *</label>
          <input value={label} onChange={e => handleLabel(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="e.g. Mezcal" autoFocus />
        </div>
        <div className="w-28">
          <label className="text-[10px] font-semibold text-gray-500 mb-0.5 block">KEY *</label>
          <input value={value} onChange={e => { setValue(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")); setAutoValue(false); }}
            className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="mezcal" />
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => add.mutate()} disabled={!label || !value || add.isPending}
            className="flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-50">
            <Check size={13} /> Save
          </button>
          <button onClick={onClose} className="flex items-center gap-1 border border-gray-300 text-gray-500 hover:text-gray-700 text-xs px-2.5 py-2 rounded-lg">
            <X size={13} />
          </button>
        </div>
      </div>
      {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
    </div>
  );
}

function CatRow({ cat, isFirst, isLast, onMove }: {
  cat: Category; isFirst: boolean; isLast: boolean;
  onMove: (dir: "up" | "down") => void;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(cat.label);
  const [emoji, setEmoji] = useState(cat.emoji);
  const [iconUrl, setIconUrl] = useState(cat.iconUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const thumbSrc = cat.imageUrl || defaultCatImg(cat.value);

  async function saveImage(imageUrl: string) {
    await fetch(`${API}/admin/categories/${cat.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl }),
    });
    qc.invalidateQueries({ queryKey: ["categories"] });
  }

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch(`${API}/admin/upload?folder=categories`, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error || "Upload failed");
      await saveImage(json.url);
      setThumbFailed(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const patch = useMutation({
    mutationFn: async (fields: Partial<Category>) => {
      const res = await fetch(`${API}/admin/categories/${cat.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories"] }); setEditing(false); },
  });

  const del = useMutation({
    mutationFn: async () => {
      await fetch(`${API}/admin/categories/${cat.id}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-2 px-3 bg-blue-50 border border-blue-200 rounded-xl mb-1.5">
        <EmojiPicker value={emoji} onChange={setEmoji} iconUrl={iconUrl} onIconChange={setIconUrl} />
        <input value={label} onChange={e => setLabel(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" autoFocus />
        <span className="text-[10px] text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded hidden sm:block">{cat.value}</span>
        <button onClick={() => patch.mutate({ label, emoji, iconUrl })} disabled={!label}
          className="text-green-600 hover:bg-green-50 p-1.5 rounded-lg"><Check size={14} /></button>
        <button onClick={() => { setEditing(false); setLabel(cat.label); setEmoji(cat.emoji); setIconUrl(cat.iconUrl ?? ""); }}
          className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-lg"><X size={14} /></button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 py-2 px-3 rounded-xl mb-1.5 border transition-colors ${cat.active ? "bg-white border-gray-200 hover:border-orange-300" : "bg-gray-50 border-gray-200 opacity-55"}`}>
      <div className="flex flex-col shrink-0">
        <button onClick={() => onMove("up")} disabled={isFirst} className="text-gray-300 hover:text-gray-500 disabled:invisible leading-none"><ChevronUp size={12} /></button>
        <button onClick={() => onMove("down")} disabled={isLast} className="text-gray-300 hover:text-gray-500 disabled:invisible leading-none"><ChevronDown size={12} /></button>
      </div>
      {/* Category photo — tap to upload/replace (always-visible camera badge) */}
      <div className="shrink-0">
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImagePick} />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          title={cat.imageUrl ? "Change photo" : "Upload photo"}
          className="relative w-14 h-10 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center active:scale-95 transition-transform">
          {uploading ? (
            <Loader2 size={15} className="animate-spin text-orange-500" />
          ) : !thumbFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbSrc} alt={cat.label} className="w-full h-full object-cover" onError={() => setThumbFailed(true)} />
          ) : (
            <span className="text-lg">{cat.emoji}</span>
          )}
          {!uploading && (
            <span className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-orange-500 border border-white flex items-center justify-center shadow-sm">
              <Camera size={9} className="text-white" />
            </span>
          )}
        </button>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 text-sm truncate">{cat.label}</p>
        <p className="text-[10px] text-gray-400 font-mono">{cat.value}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            className="inline-flex items-center gap-1 text-[10px] font-semibold text-orange-600 hover:text-orange-700 disabled:opacity-50">
            <Camera size={10} /> {cat.imageUrl ? "Change photo" : "Add photo"}
          </button>
          {cat.imageUrl && (
            <button type="button" onClick={() => saveImage("")}
              className="text-[10px] text-gray-400 hover:text-red-500 underline">Remove</button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <button onClick={() => patch.mutate({ active: !cat.active })} title={cat.active ? "Hide" : "Show"}
          className={`p-1.5 rounded-lg transition-colors ${cat.active ? "text-green-500 hover:bg-green-50" : "text-gray-400 hover:bg-gray-100"}`}>
          {cat.active ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
        <button onClick={() => setEditing(true)} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded-lg">
          <Pencil size={14} />
        </button>
        <button
          onClick={() => { if (confirm(`Delete "${cat.label}"?`)) del.mutate(); }}
          disabled={del.isPending}
          className="text-red-400 hover:bg-red-50 p-1.5 rounded-lg disabled:opacity-40">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export function CategoriesModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  const { data: cats = [], isLoading } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const data = await (await fetch(`${API}/admin/categories`)).json();
      return Array.isArray(data) ? data : [];
    },
  });

  const sorted = [...cats].sort((a, b) => a.sortOrder - b.sortOrder);

  async function move(id: string, dir: "up" | "down") {
    const idx = sorted.findIndex(c => c.id === id);
    if (dir === "up" && idx === 0) return;
    if (dir === "down" && idx === sorted.length - 1) return;
    const next = [...sorted];
    const si = dir === "up" ? idx - 1 : idx + 1;
    [next[idx], next[si]] = [next[si], next[idx]];
    const orderedIds = next.map(c => c.id);
    qc.setQueryData(["categories"], (prev: Category[] = []) =>
      prev.map(c => { const i = orderedIds.indexOf(c.id); return i !== -1 ? { ...c, sortOrder: i } : c; })
    );
    await fetch(`${API}/admin/categories/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reorder", orderedIds }),
    });
    qc.invalidateQueries({ queryKey: ["categories"] });
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-white">
          <div>
            <h2 className="font-bold text-gray-900">Manage Categories</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {cats.filter(c => c.active).length} active · {cats.length} total
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAdd(v => !v)}
              className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors">
              <Plus size={14} /> Add
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {showAdd && <AddRow onClose={() => setShowAdd(false)} />}

          {isLoading ? (
            <div className="space-y-2">
              {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : sorted.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p className="text-3xl mb-2">📂</p>
              <p className="text-sm font-medium">No categories yet</p>
            </div>
          ) : (
            <>
              {sorted.map((cat, idx) => (
                <CatRow key={cat.id} cat={cat}
                  isFirst={idx === 0} isLast={idx === sorted.length - 1}
                  onMove={dir => move(cat.id, dir)} />
              ))}
              <p className="text-[11px] text-gray-400 text-center mt-3">
                Tap a photo to upload/change · ↑↓ reorder · 👁 show/hide
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
