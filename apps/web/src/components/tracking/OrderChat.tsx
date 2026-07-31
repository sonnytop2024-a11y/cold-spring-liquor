"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Send, Loader2, Lock } from "lucide-react";

interface ChatMessage {
  id: string;
  from: "customer" | "driver";
  text: string;
  at: string;
}

// In-app chat with the assigned driver, shown on the tracking page once a
// driver accepts the order. New driver messages appear via the page's
// existing 5s order polling — no extra realtime plumbing. After the order
// is delivered the thread stays visible but read-only (anh Sơn, 31/07).
const FINAL_STATUSES = ["delivered", "failed_delivery", "cancelled", "refunded", "picked_up"];

export function OrderChat({ order }: { order: any }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const lastSeenIdRef = useRef<string | null>(null);

  const messages: ChatMessage[] = order.chat?.messages ?? [];
  const readOnly = FINAL_STATUSES.includes(order.status);
  const customerReadAt = order.chat?.customerReadAt;
  const unread = messages.filter(
    (m) => m.from === "driver" && (!customerReadAt || m.at > customerReadAt),
  ).length;

  const send = useMutation({
    mutationFn: async (body: string) => {
      const r = await fetch(`/api/orders/${order.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: "customer", text: body }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? "Could not send message");
      return json.chat;
    },
    onSuccess: (chat) => {
      qc.setQueryData(["order", order.id], (prev: any) => (prev ? { ...prev, chat } : prev));
    },
  });

  function handleSend() {
    const t = text.trim();
    if (!t || send.isPending) return;
    setText("");
    send.mutate(t);
  }

  // Mark read whenever the thread is open and new driver messages exist
  useEffect(() => {
    if (!open || unread === 0) return;
    fetch(`/api/orders/${order.id}/chat`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "customer" }),
    }).catch(() => {});
    qc.setQueryData(["order", order.id], (prev: any) =>
      prev ? { ...prev, chat: { ...prev.chat, customerReadAt: new Date().toISOString() } } : prev,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, unread, order.id]);

  // Auto-scroll to the newest message
  useEffect(() => {
    const last = messages[messages.length - 1]?.id ?? null;
    if (open && last && last !== lastSeenIdRef.current) {
      lastSeenIdRef.current = last;
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      });
    }
  }, [open, messages]);

  return (
    <div className="border border-brand-200 rounded-2xl overflow-hidden">
      {/* Header — tap to expand/collapse */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-brand-50 hover:bg-brand-100 transition-colors"
      >
        <MessageCircle size={18} className="text-brand-600 shrink-0" />
        <span className="flex-1 text-left text-sm font-bold text-brand-800">
          Chat with your driver
        </span>
        {unread > 0 && !open && (
          <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-black flex items-center justify-center">
            {unread}
          </span>
        )}
        <span className="text-brand-400 text-xs font-semibold">{open ? "Hide ▲" : "Open ▼"}</span>
      </button>

      {open && (
        <div className="bg-white">
          {/* Messages */}
          <div ref={listRef} className="max-h-64 overflow-y-auto px-4 py-3 space-y-2">
            {messages.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">
                No messages yet — say hi or share gate codes, apartment number, or drop-off directions.
              </p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`flex ${m.from === "customer" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${
                    m.from === "customer"
                      ? "bg-brand-500 text-white rounded-br-md"
                      : "bg-gray-100 text-gray-800 rounded-bl-md"
                  }`}>
                    <p className="text-sm whitespace-pre-wrap break-words">{m.text}</p>
                    <p className={`text-[10px] mt-0.5 ${m.from === "customer" ? "text-white/70" : "text-gray-400"}`}>
                      {m.from === "driver" ? "Driver · " : ""}
                      {new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Composer / read-only notice */}
          {readOnly ? (
            <div className="flex items-center gap-2 px-4 py-3 border-t bg-gray-50 text-xs text-gray-500">
              <Lock size={13} className="shrink-0" />
              Order complete — this chat is now read-only.
            </div>
          ) : (
            <div className="flex items-end gap-2 px-3 py-2.5 border-t">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                rows={1}
                maxLength={500}
                placeholder="Message your driver…"
                className="flex-1 resize-none border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 max-h-24"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!text.trim() || send.isPending}
                className="shrink-0 w-9 h-9 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white flex items-center justify-center transition-colors"
                aria-label="Send message"
              >
                {send.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </div>
          )}
          {send.isError && (
            <p className="px-4 pb-2 text-xs text-red-500">{(send.error as Error)?.message}</p>
          )}
        </div>
      )}
    </div>
  );
}
