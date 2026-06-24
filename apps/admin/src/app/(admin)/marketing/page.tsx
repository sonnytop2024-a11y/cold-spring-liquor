"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Tag, Edit2, Trash2, Loader2, X, Check, ToggleLeft, ToggleRight, AlertTriangle } from "lucide-react";

const API = "/api";

interface Coupon {
  id: string; code: string; type: "fixed" | "percentage" | "free_delivery";
  value: number; label: string; minOrder: number;
  maxUsage: number | null; usagePerCustomer: number | null; usageCount: number;
  active: boolean; startDate: string | null; endDate: string | null;
  categoryRestriction: string | null; createdAt: string;
}

const EMPTY: Partial<Coupon> = { code: "", type: "fixed", value: 0, label: "", minOrder: 0, maxUsage: null, usagePerCustomer: null, startDate: null, endDate: null, categoryRestriction: null, active: true };

const TYPE_LABELS = { fixed: "Fixed ($)", percentage: "Percentage (%)", free_delivery: "Free Delivery" };

function CouponModal({ coupon, onClose, onSave }: { coupon: Partial<Coupon> | null; onClose: () => void; onSave: (data: any) => void }) {
  const isEdit = !!coupon?.id;
  const [form, setForm] = useState<Partial<Coupon>>(coupon ?? { ...EMPTY });
  const [saving, setSaving] = useState(false);

  function set(k: keyof Coupon, v: any) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSave() {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-lg">{isEdit ? "Edit Coupon" : "Create New Coupon"}</h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Coupon Code *</label>
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
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
                Value ({form.type === "fixed" ? "$" : "%"}) *
              </label>
              <input type="number" min="0" value={form.value ?? 0} onChange={e => set("value", Number(e.target.value))}
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
              <input type="number" min="0" value={form.minOrder ?? 0} onChange={e => set("minOrder", Number(e.target.value))}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Max Uses</label>
              <input type="number" min="0" value={form.maxUsage ?? ""} placeholder="Unlimited"
                onChange={e => set("maxUsage", e.target.value ? Number(e.target.value) : null)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Per Customer</label>
              <input type="number" min="0" value={form.usagePerCustomer ?? ""} placeholder="Unlimited"
                onChange={e => set("usagePerCustomer", e.target.value ? Number(e.target.value) : null)}
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
            <div onClick={() => set("active", !form.active)} className="relative">
              {form.active ? <ToggleRight size={28} className="text-green-500" /> : <ToggleLeft size={28} className="text-gray-300" />}
            </div>
            <span className="text-sm font-medium">{form.active ? "Active" : "Inactive"}</span>
          </label>
        </div>
        <div className="flex gap-3 p-5 border-t">
          <button onClick={onClose} className="flex-1 border rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.code}
            className="flex-1 flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl transition-colors text-sm">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            {isEdit ? "Save Changes" : "Create Coupon"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MarketingPage() {
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-coupons"] }); setEditCoupon(null); },
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

  function openAdd() { setEditCoupon(null); setShowModal(true); }
  function openEdit(c: Coupon) { setEditCoupon(c); setShowModal(true); }

  async function handleSave(data: any) {
    if (data.id) await updateM.mutateAsync(data);
    else await createM.mutateAsync(data);
  }

  const typeColors = { fixed: "bg-green-100 text-green-700", percentage: "bg-blue-100 text-blue-700", free_delivery: "bg-purple-100 text-purple-700" };

  return (
    <div>
      {/* Modal */}
      {showModal && (
        <CouponModal coupon={editCoupon} onClose={() => { setShowModal(false); setEditCoupon(null); }} onSave={handleSave} />
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
            <AlertTriangle size={32} className="text-red-500 mx-auto mb-3" />
            <h3 className="font-bold text-lg mb-1">Delete Coupon?</h3>
            <p className="text-gray-500 text-sm mb-5">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 border rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={() => deleteM.mutate(deleteId)} disabled={deleteM.isPending}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-60">
                {deleteM.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Tag size={22} /> Coupon Manager</h1>
          <p className="text-gray-500 text-sm">{coupons.length} coupons · {coupons.filter(c => c.active).length} active</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-colors">
          <Plus size={16} /> New Coupon
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Coupons", value: coupons.length, color: "bg-blue-50 text-blue-700" },
          { label: "Active", value: coupons.filter(c => c.active).length, color: "bg-green-50 text-green-700" },
          { label: "Total Uses", value: coupons.reduce((a, c) => a + c.usageCount, 0), color: "bg-brand-50 text-brand-700" },
          { label: "Expired", value: coupons.filter(c => c.endDate && new Date(c.endDate) < new Date()).length, color: "bg-red-50 text-red-700" },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-xl border p-4 text-center`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs mt-0.5 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Coupon table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-5 py-3 border-b bg-gray-50 text-sm font-semibold">All Coupons</div>

        {isLoading ? (
          <div className="p-12 text-center text-gray-400">
            <Loader2 size={28} className="animate-spin mx-auto mb-2" /> Loading...
          </div>
        ) : coupons.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Tag size={32} className="mx-auto mb-2 opacity-30" />
            <p>No coupons yet. Create your first coupon!</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3 font-semibold">Code</th>
                <th className="text-left px-5 py-3 font-semibold">Type</th>
                <th className="text-left px-5 py-3 font-semibold">Value</th>
                <th className="text-left px-5 py-3 font-semibold">Min Order</th>
                <th className="text-left px-5 py-3 font-semibold">Usage</th>
                <th className="text-left px-5 py-3 font-semibold">Validity</th>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {coupons.map(c => {
                const expired = c.endDate && new Date(c.endDate) < new Date();
                return (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <span className="font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">{c.code}</span>
                      {c.label && <p className="text-xs text-gray-400 mt-0.5">{c.label}</p>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${typeColors[c.type]}`}>
                        {TYPE_LABELS[c.type]}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-semibold">
                      {c.type === "free_delivery" ? "Free" : c.type === "fixed" ? `$${c.value}` : `${c.value}%`}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{c.minOrder > 0 ? `$${c.minOrder}` : "None"}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {c.usageCount}{c.maxUsage ? ` / ${c.maxUsage}` : ""} uses
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {c.startDate || c.endDate ? (
                        <div>
                          {c.startDate && <p>From: {new Date(c.startDate).toLocaleDateString()}</p>}
                          {c.endDate && <p className={expired ? "text-red-500 font-medium" : ""}>
                            {expired ? "Expired: " : "Until: "}{new Date(c.endDate).toLocaleDateString()}
                          </p>}
                        </div>
                      ) : <span className="text-gray-400">No expiry</span>}
                    </td>
                    <td className="px-5 py-3">
                      <button onClick={() => toggleM.mutate({ id: c.id, active: !c.active })}
                        className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full border transition-colors ${c.active && !expired ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                        {c.active && !expired ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        {c.active && !expired ? "Active" : expired ? "Expired" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(c)} className="text-gray-400 hover:text-brand-600 p-1.5 rounded-lg hover:bg-brand-50"><Edit2 size={14} /></button>
                        <button onClick={() => setDeleteId(c.id)} className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
