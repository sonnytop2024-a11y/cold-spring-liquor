"use client";

import { AlertTriangle, Loader2, MapPin, Mail, Phone, CreditCard, ChevronLeft } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { formatCurrency } from "@/lib/utils";
import { StoreHoursList, ItemThumb } from "@/components/shared/orderDisplay";

interface ReviewData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: { street: string; city: string; state: string; zip: string };
  billingAddress: { street: string; city: string; state: string; zip: string };
  sameBilling: boolean;
  items: { product: { id: string; name: string; price: number; salePrice?: number | null; imageUrl?: string | null; category?: string | null }; quantity: number }[];
  subtotal: number;
  flashSavings: number;
  bundleDiscount: number;
  bundlePct: number;
  promoCode: string | null;
  promoDiscount: number;
  rewardsDiscount: number;
  rewardsPointsToRedeem: number;
  giftCardAmount: number;
  tax: number;
  // Pick Up In Store
  pickup?: { dateLabel: string; label: string } | null;
  pickupDiscount?: number;
}

interface Props {
  total: number;
  orderPayload: object;
  reviewData: ReviewData;
  onSuccess: (order: { id: string; orderNumber: string; total: number; pickupWindow?: { start: string; end: string; label: string; dateLabel: string } | null }) => void;
  onCancel: () => void;
}

declare global {
  interface Window {
    paypal?: {
      Buttons: (opts: object) => { render: (el: HTMLElement) => void; close?: () => void };
    };
  }
}

export function PayPalPaymentForm({ total, orderPayload, reviewData, onSuccess, onCancel }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  // After PayPal approves, store orderId and show review
  const [approvedPaypalId, setApprovedPaypalId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<{ close?: () => void } | null>(null);

  const rd = reviewData;
  const totalSavings = rd.flashSavings + rd.bundleDiscount + rd.promoDiscount + rd.rewardsDiscount + rd.giftCardAmount + (rd.pickupDiscount ?? 0);
  const isPickup = !!rd.pickup;
  const addrStr = (a: ReviewData["deliveryAddress"]) => [a.street, a.city, a.state, a.zip].filter(Boolean).join(", ");

  useEffect(() => {
    let script: HTMLScriptElement | null = null;

    async function loadPayPal() {
      const res = await fetch("/api/paypal/config");
      const { clientId } = await res.json();
      if (!clientId) { setError("PayPal not configured."); return; }

      document.querySelectorAll('script[data-paypal-sdk]').forEach(s => s.remove());

      script = document.createElement("script");
      script.setAttribute("data-paypal-sdk", "true");
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&enable-funding=venmo&disable-funding=credit,paylater`;
      script.async = true;
      script.onload = () => setSdkReady(true);
      script.onerror = () => setError("Failed to load PayPal. Please check your connection and try again.");
      document.head.appendChild(script);
    }

    loadPayPal().catch(() => setError("Failed to initialize PayPal."));
    return () => { buttonsRef.current?.close?.(); if (script) script.remove(); };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const obs = new MutationObserver(() => {
      const hidden = document.body.classList.contains("cart-open");
      container.style.visibility = hidden ? "hidden" : "visible";
    });
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!sdkReady || !containerRef.current || !window.paypal) return;
    containerRef.current.innerHTML = "";

    try {
      const buttons = window.paypal.Buttons({
        style: { layout: "vertical", shape: "rect", label: "pay", height: 48 },
        createOrder: async () => {
          setError(null);
          const res = await fetch("/api/paypal/create-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: total }),
          });
          const data = await res.json();
          if (!res.ok || !data.id) throw new Error(data.error ?? "Failed to create order");
          return data.id;
        },
        onApprove: async (data: { orderID: string }) => {
          // Don't capture yet — show review screen first
          setApprovedPaypalId(data.orderID);
        },
        onError: (err: unknown) => {
          console.error("[PayPal] error:", err);
          setError("PayPal encountered an error. Please try again.");
        },
        onCancel: () => setError(null),
      });

      buttonsRef.current = buttons;
      if (containerRef.current) buttons.render(containerRef.current);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to initialize PayPal buttons.");
    }
  }, [sdkReady, total]);

  async function handleConfirmCapture() {
    if (!approvedPaypalId) return;
    setCapturing(true);
    setError(null);
    try {
      const res = await fetch("/api/paypal/capture-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paypalOrderId: approvedPaypalId, orderPayload }),
      });
      const order = await res.json();
      if (!res.ok) throw new Error(order.error ?? "Capture failed");
      onSuccess({ id: order.id, orderNumber: order.orderNumber, total: order.total, pickupWindow: order.pickupWindow ?? null });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Payment failed. Please try again.");
      setCapturing(false);
    }
  }

  // ── Review screen (after PayPal approval, before capture) ─────────────────
  if (approvedPaypalId) {
    return (
      <div className="space-y-4">
        <div className="text-center py-3">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-2">
            <span className="text-2xl">🅿️</span>
          </div>
          <h2 className="font-bold text-lg text-gray-900">Review Your Order</h2>
          <p className="text-sm text-gray-500">Payment authorized via PayPal — confirm to complete</p>
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-sm text-gray-700 uppercase tracking-wide mb-3">🛒 Items</h3>
          <div className="space-y-2">
            {rd.items.map(({ product: p, quantity }) => (
              <div key={p.id} className="flex items-center gap-3 text-sm">
                <ItemThumb imageUrl={p.imageUrl} category={p.category} name={p.name} size={40} />
                <span className="text-gray-700 flex-1 pr-2 leading-snug">{p.name} <span className="text-gray-400">×{quantity}</span></span>
                <span className="font-medium text-gray-900 whitespace-nowrap shrink-0">{formatCurrency((p.salePrice ?? p.price) * quantity)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-sm text-gray-700 uppercase tracking-wide mb-3">👤 Contact</h3>
          <div className="space-y-1.5 text-sm text-gray-700">
            <p className="font-semibold">{rd.customerName}</p>
            <p className="flex items-center gap-2 text-gray-500"><Mail size={13} />{rd.customerEmail}</p>
            <p className="flex items-center gap-2 text-gray-500"><Phone size={13} />{rd.customerPhone}</p>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-sm text-gray-700 uppercase tracking-wide mb-3">{isPickup ? "🏬 Pick Up In Store" : "📍 Delivery"}</h3>
          {isPickup ? (
            <div>
              <p className="text-sm text-gray-700 flex items-start gap-2"><MapPin size={13} className="mt-0.5 shrink-0 text-gray-400" /><span><strong>{rd.pickup!.dateLabel} · {rd.pickup!.label}</strong><br />15609 Ronald Reagan Blvd Suite B-100, Leander, TX 78641</span></p>
              <div className="pl-6"><StoreHoursList /></div>
            </div>
          ) : (
            <p className="text-sm text-gray-700 flex items-start gap-2"><MapPin size={13} className="mt-0.5 shrink-0 text-gray-400" />{addrStr(rd.deliveryAddress)}</p>
          )}
        </div>

        {/* Payment method */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-sm text-gray-700 uppercase tracking-wide mb-3">💳 Payment</h3>
          <p className="text-sm text-gray-700 flex items-center gap-2"><CreditCard size={13} className="text-gray-400" /> PayPal (authorized)</p>
        </div>

        {/* Order total */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-sm text-gray-700 uppercase tracking-wide mb-3">💰 Order Total</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-500"><span>Subtotal ({rd.items.reduce((a,i)=>a+i.quantity,0)} items)</span><span>{formatCurrency(rd.subtotal)}</span></div>
            {rd.flashSavings > 0 && <div className="flex justify-between text-red-600 font-medium"><span>⚡ Flash Sale</span><span>-{formatCurrency(rd.flashSavings)}</span></div>}
            {rd.bundleDiscount > 0 && <div className="flex justify-between text-purple-600 font-medium"><span>📦 Bundle ({Math.round(rd.bundlePct*100)}%)</span><span>-{formatCurrency(rd.bundleDiscount)}</span></div>}
            {rd.promoDiscount > 0 && <div className="flex justify-between text-green-600 font-medium"><span>🏷️ {rd.promoCode}</span><span>-{formatCurrency(rd.promoDiscount)}</span></div>}
            {rd.rewardsDiscount > 0 && <div className="flex justify-between text-purple-600 font-medium"><span>🏆 Rewards ({rd.rewardsPointsToRedeem} pts)</span><span>-{formatCurrency(rd.rewardsDiscount)}</span></div>}
            {rd.giftCardAmount > 0 && <div className="flex justify-between text-green-600 font-medium"><span>🎁 Gift Card</span><span>-{formatCurrency(rd.giftCardAmount)}</span></div>}
            {isPickup ? (<div className="flex justify-between text-green-600 font-bold"><span>💚 Pick Up Discount (−5%)</span><span>-{formatCurrency(rd.pickupDiscount ?? 0)}</span></div>) : (<div className="flex justify-between text-green-600 font-medium"><span>🚚 Delivery</span><span>FREE</span></div>)}
            <div className="flex justify-between text-gray-500"><span>Tax (8.25%)</span><span>{formatCurrency(rd.tax)}</span></div>
          </div>
          <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between items-baseline">
            <span className="font-bold text-gray-900">Total</span>
            <span className="font-black text-2xl text-gray-900">{formatCurrency(total)}</span>
          </div>
          {totalSavings > 0 && (
            <div className="mt-3 bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-center">
              <p className="text-xs text-green-700 font-semibold">You save {formatCurrency(totalSavings)} on this order!</p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0" /> {error}
          </div>
        )}

        <button
          onClick={handleConfirmCapture}
          disabled={capturing}
          className="w-full flex items-center justify-center gap-2 bg-[#0070ba] hover:bg-[#005ea6] disabled:opacity-60 text-white font-bold py-4 rounded-xl transition-colors text-base"
        >
          {capturing ? <><Loader2 size={18} className="animate-spin" /> Processing…</> : <>🅿️ Confirm & Pay {formatCurrency(total)}</>}
        </button>

        <button
          type="button"
          onClick={() => { setApprovedPaypalId(null); setError(null); }}
          disabled={capturing}
          className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm disabled:opacity-40"
        >
          <ChevronLeft size={15} /> Back — choose different payment
        </button>
      </div>
    );
  }

  // ── PayPal buttons screen ──────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div className="bg-white border rounded-2xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold text-base sm:text-lg">PayPal / Venmo</h2>
          <span className="font-black text-xl sm:text-2xl text-gray-900">{formatCurrency(total)}</span>
        </div>
        <p className="text-xs text-gray-400 mb-5">Complete your payment securely via PayPal or Venmo</p>

        {capturing ? (
          <div className="flex flex-col items-center gap-3 py-6 text-gray-500">
            <Loader2 size={28} className="animate-spin text-brand-500" />
            <p className="text-sm font-medium">Confirming your payment…</p>
          </div>
        ) : (
          <>
            {!sdkReady && !error && (
              <div className="flex items-center justify-center gap-2 py-6 text-gray-400 text-sm">
                <Loader2 size={18} className="animate-spin" /> Loading PayPal…
              </div>
            )}
            <div ref={containerRef} className={sdkReady ? "block" : "hidden"} />
          </>
        )}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0" /> {error}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[{ icon: "🔒", label: "SSL Encrypted" }, { icon: "🅿️", label: "PayPal Protected" }, { icon: "🛡️", label: "Buyer Protection" }].map(({ icon, label }) => (
          <div key={label} className="bg-gray-50 border rounded-xl py-2.5 px-2">
            <p className="text-lg">{icon}</p>
            <p className="text-[10px] font-semibold text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <button type="button" onClick={onCancel}
        className="w-full border-2 border-gray-200 text-gray-600 font-semibold py-3.5 rounded-xl hover:bg-gray-50 transition-colors text-sm">
        ← Back to payment options
      </button>

      <p className="text-center text-xs text-gray-400">
        🔒 Your payment is encrypted and secure. Must be 21+, valid ID checked at delivery.
      </p>
    </div>
  );
}
