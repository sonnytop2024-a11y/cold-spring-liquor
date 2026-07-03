"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Check, X, GripVertical, ChevronUp, ChevronDown, Eye, EyeOff } from "lucide-react";
import { API } from "@/lib/api";

interface Category {
  id: string;
  value: string;
  label: string;
  emoji: string;
  sortOrder: number;
  active: boolean;
}

const EMOJI_SUGGESTIONS = ["🥃","🍸","🌵","🍹","🌿","🍷","🍾","🍺","🥂","🧃","🥤","🌸","💎","📦","⭐","🔥","✨","🎯","🏆","🍊"];

function EmojiPicker({ value, onChange }: { value: string; onChange: (e: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-10 h-10 flex items-center justify-center text-xl border border-gray-300 rounded-lg hover:bg-gray-50">
        {value || "📦"}
      </button>
      {open && (
        <div className="absolute top-11 left-0 z-50 bg-white border border-gray-200 rounded-xl shadow-lg p-2 grid grid-cols-5 gap-1 w-44">
          {EMOJI_SUGGESTIONS.map(e => (
            <button key={e} type="button" onClick={() => { onChange(e); setOpen(false); }}
              className={`text-xl p-1.5 rounded-lg hover:bg-orange-50 ${value === e ? "bg-orange-100" : ""}`}>
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AddForm({ onClose }: { onClose: () => void }) {
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

  function handleLabelChange(v: string) {
    setLabel(v);
    if (autoValue) setValue(v.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, ""));
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-4">
      <h3 className="font-bold text-gray-800 mb-4">Add New Category</h3>
      <div className="flex gap-3 flex-wrap items-end">
        <EmojiPicker value={emoji} onChange={setEmoji} />
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Display Name *</label>
          <input value={label} onChange={e => handleLabelChange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="e.g. Mezcal" />
        </div>
        <div className="flex-1 min-w-[130px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Value (URL key) *</label>
          <input value={value} onChange={e => { setValue(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")); setAutoValue(false); }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="e.g. mezcal" />
        </div>
        <div className="flex gap-2">
          <button onClick={() => add.mutate()}
            disabled={!label || !value || add.isPending}
            className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50 transition-colors">
            <Plus size={15} /> Add
          </button>
          <button onClick={onClose} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 border border-gray-300 px-3 py-2 rounded-lg text-sm">
            <X size={14} /> Cancel
          </button>
        </div>
      </div>
      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
    </div>
  );
}

function CategoryRow({ cat, onMoveUp, onMoveDown, isFirst, isLast }: {
  cat: Category; onMoveUp: () => void; onMoveDown: () => void; isFirst: boolean; isLast: boolean;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(cat.label);
  const [emoji, setEmoji] = useState(cat.emoji);
  const [error, setError] = useState("");

  const patch = useMutation({
    mutationFn: async (fields: Partial<Category>) => {
      const res = await fetch(`${API}/admin/categories/${cat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error || "Failed"); }
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories"] }); setEditing(false); },
    onError: (e: Error) => setError(e.message),
  });

  const del = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API}/admin/categories/${cat.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });

  if (editing) {
    return (
      <div className="flex items-center gap-3 py-3 px-4 bg-orange-50 border border-orange-200 rounded-xl mb-2">
        <EmojiPicker value={emoji} onChange={setEmoji} />
        <input value={label} onChange={e => setLabel(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          placeholder="Display Name" />
        <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-1 rounded">{cat.value}</span>
        <button onClick={() => patch.mutate({ label, emoji })} disabled={!label || patch.isPending}
          className="text-green-600 hover:text-green-700 p-1.5 rounded-lg hover:bg-green-50">
          <Check size={16} />
        </button>
        <button onClick={() => { setEditing(false); setLabel(cat.label); setEmoji(cat.emoji); }}
          className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100">
          <X size={16} />
        </button>
        {error && <p className="text-red-500 text-xs">{error}</p>}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 py-3 px-4 rounded-xl mb-2 transition-colors ${cat.active ? "bg-white border border-gray-200 hover:border-orange-300" : "bg-gray-50 border border-gray-200 opacity-60"}`}>
      {/* Reorder */}
      <div className="flex flex-col gap-0.5 shrink-0">
        <button onClick={onMoveUp} disabled={isFirst} className="text-gray-300 hover:text-gray-500 disabled:invisible">
          <ChevronUp size={14} />
        </button>
        <GripVertical size={14} className="text-gray-300" />
        <button onClick={onMoveDown} disabled={isLast} className="text-gray-300 hover:text-gray-500 disabled:invisible">
          <ChevronDown size={14} />
        </button>
      </div>

      <span className="text-2xl w-8 text-center shrink-0">{cat.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 text-sm">{cat.label}</p>
        <p className="text-xs text-gray-400 font-mono">{cat.value}</p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {/* Toggle active */}
        <button onClick={() => patch.mutate({ active: !cat.active })}
          title={cat.active ? "Hide" : "Show"}
          className={`p-1.5 rounded-lg transition-colors ${cat.active ? "text-green-500 hover:bg-green-50" : "text-gray-400 hover:bg-gray-100"}`}>
          {cat.active ? <Eye size={15} /> : <EyeOff size={15} />}
        </button>
        {/* Edit */}
        <button onClick={() => setEditing(true)}
          className="text-blue-500 hover:bg-blue-50 p-1.5 rounded-lg transition-colors">
          <Pencil size={15} />
        </button>
        {/* Delete */}
        <button onClick={() => { if (confirm(`Delete "${cat.label}"? Products with this category won't be filtered anymore.`)) del.mutate(); }}
          disabled={del.isPending}
          className="text-red-400 hover:bg-red-50 p-1.5 rounded-lg transition-colors disabled:opacity-50">
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  const { data: cats = [], isLoading } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch(`${API}/admin/categories`);
      return res.json();
    },
  });

  const sorted = [...cats].sort((a, b) => a.sortOrder - b.sortOrder);

  async function move(id: string, dir: "up" | "down") {
    const idx = sorted.findIndex(c => c.id === id);
    if (dir === "up" && idx === 0) return;
    if (dir === "down" && idx === sorted.length - 1) return;
    const newOrder = [...sorted];
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    const orderedIds = newOrder.map(c => c.id);
    // Optimistic update
    qc.setQueryData(["categories"], (prev: Category[] = []) =>
      prev.map(c => {
        const newIdx = orderedIds.indexOf(c.id);
        return newIdx !== -1 ? { ...c, sortOrder: newIdx } : c;
      })
    );
    await fetch(`${API}/admin/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reorder", orderedIds }),
    });
    qc.invalidateQueries({ queryKey: ["categories"] });
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage product categories shown on the website</p>
        </div>
        <button onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm">
          <Plus size={16} /> Add Category
        </button>
      </div>

      {showAdd && <AddForm onClose={() => setShowAdd(false)} />}

      {/* Stats */}
      <div className="flex gap-3 mb-4">
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-center">
          <p className="text-lg font-bold text-gray-800">{cats.length}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-center">
          <p className="text-lg font-bold text-green-600">{cats.filter(c => c.active).length}</p>
          <p className="text-xs text-gray-500">Active</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-center">
          <p className="text-lg font-bold text-gray-400">{cats.filter(c => !c.active).length}</p>
          <p className="text-xs text-gray-500">Hidden</p>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">📂</p>
          <p className="font-medium">No categories yet</p>
        </div>
      ) : (
        <div>
          {sorted.map((cat, idx) => (
            <CategoryRow
              key={cat.id}
              cat={cat}
              isFirst={idx === 0}
              isLast={idx === sorted.length - 1}
              onMoveUp={() => move(cat.id, "up")}
              onMoveDown={() => move(cat.id, "down")}
            />
          ))}
          <p className="text-xs text-gray-400 text-center mt-4">
            Use ↑↓ to reorder · Toggle 👁 to show/hide on website without deleting
          </p>
        </div>
      )}
    </div>
  );
}
