"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Check, X, ChevronUp, ChevronDown, Eye, EyeOff } from "lucide-react";
import { API } from "@/lib/api";

interface Category {
  id: string;
  value: string;
  label: string;
  emoji: string;
  sortOrder: number;
  active: boolean;
}

const EMOJI_OPTIONS = ["🥃","🍸","🌵","🍹","🌿","🍷","🍾","🍺","🥂","🧃","🥤","🌸","💎","📦","⭐","🔥","✨","🎯","🏆","🍊"];

function EmojiPicker({ value, onChange }: { value: string; onChange: (e: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-9 h-9 flex items-center justify-center text-xl border border-gray-300 rounded-lg hover:bg-gray-50 shrink-0">
        {value || "📦"}
      </button>
      {open && (
        <div className="absolute top-10 left-0 z-50 bg-white border border-gray-200 rounded-xl shadow-lg p-2 grid grid-cols-5 gap-1 w-40">
          {EMOJI_OPTIONS.map(e => (
            <button key={e} type="button" onClick={() => { onChange(e); setOpen(false); }}
              className={`text-lg p-1.5 rounded-lg hover:bg-orange-50 ${value === e ? "bg-orange-100" : ""}`}>
              {e}
            </button>
          ))}
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
  const [error, setError] = useState("");
  const [autoValue, setAutoValue] = useState(true);

  const add = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API}/admin/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, value, emoji }),
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
        <EmojiPicker value={emoji} onChange={setEmoji} />
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
        <EmojiPicker value={emoji} onChange={setEmoji} />
        <input value={label} onChange={e => setLabel(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" autoFocus />
        <span className="text-[10px] text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded hidden sm:block">{cat.value}</span>
        <button onClick={() => patch.mutate({ label, emoji })} disabled={!label}
          className="text-green-600 hover:bg-green-50 p-1.5 rounded-lg"><Check size={14} /></button>
        <button onClick={() => { setEditing(false); setLabel(cat.label); setEmoji(cat.emoji); }}
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
      <span className="text-xl w-7 text-center shrink-0">{cat.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 text-sm truncate">{cat.label}</p>
        <p className="text-[10px] text-gray-400 font-mono">{cat.value}</p>
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
                ↑↓ reorder · 👁 show/hide on website
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
