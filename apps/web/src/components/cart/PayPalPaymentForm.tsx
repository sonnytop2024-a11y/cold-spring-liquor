"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { formatCurrency } from "@/lib/utils";

interface Props {
  total: number;
  orderPayload: object;
  onSuccess: (order: { id: string; orderNumber: string; total: number }) => void;
  onCancel: () => void;
}

declare global {
  interface Window {
    paypal?: {
      Buttons: (opts: object) => { render: (el: HTMLElement) => void; close?: () => void };
    };
  }
}

export function PayPalPaymentForm({ total, orderPayload, onSuccess, onCancel }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<{ close?: () => void } | null>(null);

  useEffect(() => {
    let script: HTMLScriptElement | null = null;

    async function loadPayPal() {
      // Get clientId from server (avoids build-time baking issues)
      const res = await fetch("/api/paypal/config");
      const { clientId } = await res.json();
      if (!clientId) { setError("PayPal not configured."); return; }

      // Remove any existing PayPal script
      document.querySelectorAll('script[data-paypal-sdk]').forEach(s => s.remove());

      script = document.createElement("script");
      script.setAttribute("data-paypal-sdk", "true");
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&components=buttons&enable-funding=venmo&disable-funding=credit,card,paylater`;
      script.async = true;

      script.onload = () => setSdkReady(true);
      script.onerror = () => setError("Failed to load PayPal. Please check your connection and try again.");

      document.head.appendChild(script);
    }

    loadPayPal().catch(() => setError("Failed to initialize PayPal."));

    return () => {
      buttonsRef.current?.close?.();
      if (script) script.remove();
    };
  }, []);

  useEffect(() => {
    if (!sdkReady || !containerRef.current || !window.paypal) return;

    // Clear container
    containerRef.current.innerHTML = "";

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
        setCapturing(true);
        try {
          const res = await fetch("/api/paypal/capture-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paypalOrderId: data.orderID, orderPayload }),
          });
          const order = await res.json();
          if (!res.ok) throw new Error(order.error ?? "Capture failed");
          onSuccess({ id: order.id, orderNumber: order.orderNumber, total: order.total });
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : "Payment failed. Please try again.");
          setCapturing(false);
        }
      },
      onError: (err: unknown) => {
        console.error("[PayPal] error:", err);
        setError("PayPal encountered an error. Please try again.");
        setCapturing(false);
      },
      onCancel: () => setError(null),
    });

    buttonsRef.current = buttons;
    buttons.render(containerRef.current);
  }, [sdkReady, total, orderPayload, onSuccess]);

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

      {/* Trust badges */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { icon: "🔒", label: "SSL Encrypted" },
          { icon: "🅿️", label: "PayPal Protected" },
          { icon: "🛡️", label: "Buyer Protection" },
        ].map(({ icon, label }) => (
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
