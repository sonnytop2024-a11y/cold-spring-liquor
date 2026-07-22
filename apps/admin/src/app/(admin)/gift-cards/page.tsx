"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Gift, Plus, Copy, Check, Search, Loader2, Mail, X,
  BadgeCheck, Clock, Ban, ShoppingCart, Shield,
  Sparkles, ChevronDown, ChevronUp, Edit2, Trash2, ToggleLeft, ToggleRight, AlertTriangle,
} from "lucide-react";
import { API } from "@/lib/api";

interface GiftCard {
  code: string;
  originalAmount: number;
  remainingBalance: number;
  recipientEmail: string;
  senderName: string;
  message: string;
  status: "active" | "partial" | "redeemed";
  issuedAt: string;
  source?: "customer_purchase" | "admin_issued" | "bonus_promo";
  buyerEmail?: string;
  expiresAt?: string;
  linkedCode?: string;
}

const AMOUNTS = [5, 10, 25, 50, 100, 250];

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function statusBadge(status: GiftCard["status"]) {
  if (status === "active")   return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700"><BadgeCheck size={11} /> Active</span>;
  if (status === "partial")  return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700"><Clock size={11} /> Partial</span>;
  return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500"><Ban size={11} /> Redeemed</span>;
}

function sourceBadge(source?: GiftCard["source"]) {
  if (source === "customer_purchase")
    return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700"><ShoppingCart size={9} /> Purchased</span>;
  if (source === "bonus_promo")
    return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700"><Sparkles size={9} /> Bonus</span>;
  return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500"><Shield size={9} /> Admin</span>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
      title="Copy code"
    >
      {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
    </button>
  );
}

// ─── Bonus Tiers ("buy $X, get a $Y bonus card" — automatic, no promo code) ───

interface BonusTier {
  id: string;
  minAmount: number;
  bonusAmount: number;
  expiryDays: number;
  active: boolean;
}

function BonusTierModal({ tier, onClose, onSave }: { tier: Partial<BonusTier> | null; onClose: () => void; onSave: (d: any) => Promise<void> }) {
  const isEdit = !!tier?.id;
  const [form, setForm] = useState<Partial<BonusTier>>(tier ?? { minAmount: 50, bonusAmount: 10, expiryDays: 45, active: true });
  const [saving, setSaving] = useState(false);
  function set(k: keyof BonusTier, v: any) { setForm((f) => ({ ...f, [k]: v })); }

  const [rawInputs, setRawInputs] = useState<Record<string, string>>({});
  function setNum(k: keyof BonusTier, raw: string) {
    setRawInputs((r) => ({ ...r, [k]: raw }));
    const n = parseFloat(raw);
    if (!isNaN(n)) set(k, n);
    else if (raw === "") set(k, 0);
  }
  function numVal(k: keyof BonusTier): string {
    return k in rawInputs ? rawInputs[k] : String((form as any)[k] ?? "");
  }

  async function handleSave() { setSaving(true); await onSave(form); setSaving(false); }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Sparkles size={18} className="text-amber-500" />
            {isEdit ? "Edit Bonus Tier" : "New Bonus Tier"}
          </h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Purchase ≥ ($) *</label>
              <input type="text" inputMode="decimal" value={numVal("minAmount")} onChange={(e) => setNum("minAmount", e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <p className="text-xs text-gray-400 mt-1">Amount that triggers this bonus</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Bonus Value ($) *</label>
              <input type="text" inputMode="decimal" value={numVal("bonusAmount")} onChange={(e) => setNum("bonusAmount", e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <p className="text-xs text-gray-400 mt-1">Value of the free bonus card</p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Bonus Card Expires After (days)</label>
            <input type="text" inputMode="decimal" value={numVal("expiryDays")} onChange={(e) => setNum("expiryDays", e.target.value)}
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <p className="text-xs text-gray-400 mt-1">0 = never expires. This only applies to the bonus card — the customer's paid gift card never expires.</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2.5">
            <AlertTriangle size={15} className="text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800">Confirm the expiration policy with your accountant/legal counsel for your state before relying on it — gift card expiration rules vary, and this is a bonus/promotional card, not the customer's paid balance.</p>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => set("active", !form.active)}>
              {form.active ? <ToggleRight size={28} className="text-green-500" /> : <ToggleLeft size={28} className="text-gray-300" />}
            </div>
            <span className="text-sm font-medium">{form.active ? "Active — applied automatically at checkout" : "Inactive — disabled"}</span>
          </label>
        </div>
        <div className="flex gap-3 p-5 border-t">
          <button onClick={onClose} className="flex-1 border rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.minAmount || !form.bonusAmount}
            className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            {isEdit ? "Save Changes" : "Create Tier"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BonusTiersPanel() {
  const [expanded, setExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editTier, setEditTier] = useState<BonusTier | null>(null);
  const qc = useQueryClient();

  const { data: tiers = [], isLoading } = useQuery<BonusTier[]>({
    queryKey: ["admin-bonus-tiers"],
    queryFn: () => fetch(`${API}/admin/bonus-tiers`).then((r) => r.json()),
    refetchInterval: 30_000,
    enabled: expanded,
  });

  const createM = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch(`${API}/admin/bonus-tiers`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? "Failed");
      return json;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-bonus-tiers"] }); setShowModal(false); },
    onError: (e: any) => alert(e.message),
  });
  const updateM = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch(`${API}/admin/bonus-tiers/${data.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-bonus-tiers"] }); setEditTier(null); setShowModal(false); },
  });
  const deleteM = useMutation({
    mutationFn: async (id: string) => fetch(`${API}/admin/bonus-tiers/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-bonus-tiers"] }),
  });
  const toggleM = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const r = await fetch(`${API}/admin/bonus-tiers/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active }) });
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-bonus-tiers"] }),
  });

  async function handleSave(data: any) {
    if (data.id) await updateM.mutateAsync(data);
    else await createM.mutateAsync(data);
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
      {showModal && <BonusTierModal tier={editTier} onClose={() => { setShowModal(false); setEditTier(null); }} onSave={handleSave} />}

      <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
            <Sparkles size={15} className="text-amber-600" />
          </div>
          <div className="text-left">
            <p className="font-bold text-gray-900 text-sm">Bonus Tiers</p>
            <p className="text-xs text-gray-500">Automatic &quot;buy $X, get a $Y bonus card&quot; — no promo code needed</p>
          </div>
        </div>
        {expanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-gray-500">{tiers.length} tier{tiers.length === 1 ? "" : "s"} · {tiers.filter((t) => t.active).length} active</p>
            <button onClick={() => { setEditTier(null); setShowModal(true); }}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors">
              <Plus size={13} /> New Tier
            </button>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-gray-400"><Loader2 size={20} className="animate-spin mx-auto" /></div>
          ) : tiers.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">No bonus tiers configured.</div>
          ) : (
            <div className="space-y-2">
              {tiers.map((t) => (
                <div key={t.id} className={`flex items-center gap-3 border rounded-xl p-3 ${!t.active ? "opacity-60" : ""}`}>
                  <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-amber-100 flex flex-col items-center justify-center">
                    <span className="text-base font-black text-amber-700">${t.bonusAmount}</span>
                    <span className="text-[9px] font-semibold text-amber-500 uppercase">bonus</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">Spend ${t.minAmount}+ → get ${t.bonusAmount} bonus card</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t.expiryDays > 0 ? `Bonus card expires in ${t.expiryDays} days` : "Bonus card never expires"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => toggleM.mutate({ id: t.id, active: !t.active })}
                      className={`flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors ${t.active ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                      {t.active ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                      {t.active ? "Active" : "Off"}
                    </button>
                    <button onClick={() => { setEditTier(t); setShowModal(true); }} className="text-gray-400 hover:text-amber-600 p-1.5 rounded-lg hover:bg-amber-50"><Edit2 size={14} /></button>
                    <button
                      onClick={() => { if (confirm(`Delete the $${t.minAmount}+ → $${t.bonusAmount} bonus tier?`)) deleteM.mutate(t.id); }}
                      className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50"
                    ><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function GiftCardsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "partial" | "redeemed">("all");
  const [showCreate, setShowCreate] = useState(false);

  // Form state
  const [amount, setAmount] = useState(50);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [senderName, setSenderName] = useState("Cold Spring Liquor");
  const [message, setMessage] = useState("");
  const [sendEmail, setSendEmail] = useState(true);

  const { data: cards = [], isLoading } = useQuery<GiftCard[]>({
    queryKey: ["admin-gift-cards"],
    queryFn: () => fetch(`${API}/admin/gift-cards`).then(r => r.json()),
    refetchInterval: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (body: object) =>
      fetch(`${API}/admin/gift-cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-gift-cards"] });
      setShowCreate(false);
      setRecipientEmail("");
      setMessage("");
      setAmount(50);
      setSenderName("Cold Spring Liquor");
      setSendEmail(true);
    },
  });

  const filtered = cards.filter(c => {
    const matchQ = !q || c.code.includes(q.toUpperCase()) || c.recipientEmail.toLowerCase().includes(q.toLowerCase());
    const matchF = filter === "all" || c.status === filter;
    return matchQ && matchF;
  });

  const totalActive   = cards.filter(c => c.status === "active").length;
  const totalPartial  = cards.filter(c => c.status === "partial").length;
  const totalValue    = cards.filter(c => c.status !== "redeemed").reduce((a, c) => a + c.remainingBalance, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Gift size={20} className="text-brand-500" /> Gift Cards
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage issued gift cards</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          <Plus size={15} /> Issue Gift Card
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Active</p>
          <p className="text-2xl font-black text-green-600">{totalActive}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Partial</p>
          <p className="text-2xl font-black text-amber-500">{totalPartial}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Outstanding</p>
          <p className="text-2xl font-black text-gray-900">{fmt(totalValue)}</p>
        </div>
      </div>

      <BonusTiersPanel />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search code or email…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-brand-500"
          />
        </div>
        {(["all", "active", "partial", "redeemed"] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg capitalize transition-colors ${filter === s ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 size={20} className="animate-spin mr-2" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Gift size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No gift cards found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Code</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Source</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Buyer → Recipient</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Original</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Balance</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Issued</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(card => (
                  <tr key={card.code} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">{card.code}</span>
                        <CopyButton text={card.code} />
                      </div>
                    </td>
                    <td className="px-4 py-3">{sourceBadge(card.source)}</td>
                    <td className="px-4 py-3">
                      {card.buyerEmail ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <span className="font-medium">{card.senderName}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Mail size={10} /> {card.buyerEmail}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-brand-600 font-medium">
                            → {card.recipientEmail}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Mail size={12} className="text-gray-400 shrink-0" />
                          <span className="text-gray-700 text-xs truncate max-w-[160px]">{card.recipientEmail}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-700">{fmt(card.originalAmount)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${card.remainingBalance <= 0 ? "text-gray-400" : "text-green-600"}`}>
                        {fmt(card.remainingBalance)}
                      </span>
                    </td>
                    <td className="px-4 py-3">{statusBadge(card.status)}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(card.issuedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      {card.expiresAt && (
                        <div className={new Date(card.expiresAt) < new Date() ? "text-red-500 font-semibold mt-0.5" : "text-amber-500 mt-0.5"}>
                          exp {new Date(card.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900 flex items-center gap-2"><Gift size={16} className="text-brand-500" /> Issue Gift Card</h2>
                <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
              </div>

              <div className="p-6 space-y-4">
                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                  <div className="grid grid-cols-3 gap-2">
                    {AMOUNTS.map(a => (
                      <button key={a} onClick={() => setAmount(a)}
                        className={`py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${amount === a ? "bg-brand-500 text-white border-brand-500" : "border-gray-200 text-gray-700 hover:border-brand-300"}`}>
                        ${a}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recipient email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Email *</label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={e => setRecipientEmail(e.target.value)}
                    placeholder="customer@example.com"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-500"
                  />
                </div>

                {/* Sender name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                  <input
                    value={senderName}
                    onChange={e => setSenderName(e.target.value)}
                    placeholder="Cold Spring Liquor"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-500"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message <span className="text-gray-400">(optional)</span></label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={2}
                    placeholder="Thank you for being a valued customer!"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-500 resize-none"
                  />
                </div>

                {/* Send email toggle */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => setSendEmail(v => !v)}
                    className={`w-10 h-5.5 rounded-full relative transition-colors ${sendEmail ? "bg-brand-500" : "bg-gray-200"}`}
                    style={{ height: "22px" }}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${sendEmail ? "translate-x-5" : "translate-x-0.5"}`} />
                  </div>
                  <span className="text-sm text-gray-700">Send gift card email to recipient</span>
                </label>
              </div>

              <div className="px-6 pb-6 flex gap-3">
                <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={() => createMutation.mutate({ amount, recipientEmail, senderName, message, sendEmail })}
                  disabled={!recipientEmail || createMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-bold transition-colors"
                >
                  {createMutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Creating…</> : <>Issue ${amount} Card</>}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
