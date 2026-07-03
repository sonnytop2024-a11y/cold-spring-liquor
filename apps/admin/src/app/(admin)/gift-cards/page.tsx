"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Gift, Plus, Copy, Check, Search, Loader2, Mail, X,
  BadgeCheck, Clock, Ban, ShoppingCart, Shield,
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
  source?: "customer_purchase" | "admin_issued";
  buyerEmail?: string;
}

const AMOUNTS = [25, 50, 100, 250];

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
                  <div className="grid grid-cols-4 gap-2">
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
