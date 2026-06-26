"use client";

import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";

// Waits for PayPal SDK to finish loading before rendering buttons
function PayPalButtonsWithGuard({ total, orderPayload, onApproveOrder, onError }: {
  total: number;
  orderPayload: object;
  onApproveOrder: (paypalOrderId: string) => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [{ isPending, isRejected }] = usePayPalScriptReducer();

  if (isRejected) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
        <AlertTriangle size={15} className="shrink-0" />
        Failed to load PayPal. Please check your connection and try again.
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="flex items-center justify-center gap-2 py-6 text-gray-400 text-sm">
        <Loader2 size={18} className="animate-spin" /> Loading PayPal…
      </div>
    );
  }

  return (
    <PayPalButtons
      style={{ layout: "vertical", shape: "rect", label: "pay", height: 48 }}
      createOrder={async () => {
        const res = await fetch("/api/paypal/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: total }),
        });
        const data = await res.json();
        if (!res.ok || !data.id) throw new Error(data.error ?? "Failed");
        return data.id as string;
      }}
      onApprove={async (data) => { await onApproveOrder(data.orderID); }}
      onError={(err) => onError(`PayPal error: ${err instanceof Error ? err.message : JSON.stringify(err)}`)}
      onCancel={() => {}}
    />
  );
}

interface Props {
  total: number;
  orderPayload: object;
  onSuccess: (order: { id: string; orderNumber: string; total: number }) => void;
  onCancel: () => void;
}

export function PayPalPaymentForm({ total, orderPayload, onSuccess, onCancel }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);

  // Load clientId from server at runtime to avoid build-time baking issues
  useEffect(() => {
    fetch("/api/paypal/config")
      .then(r => r.json())
      .then(d => setClientId(d.clientId ?? ""))
      .catch(() => setClientId(""));
  }, []);

  if (clientId === null) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-gray-400">
        <Loader2 size={28} className="animate-spin text-brand-500" />
        <p className="text-sm">Loading PayPal…</p>
      </div>
    );
  }

  if (!clientId) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center text-sm text-amber-800">
        PayPal is not configured yet. Please contact support.
      </div>
    );
  }

  return (
    <PayPalScriptProvider options={{
      clientId,
      currency: "USD",
      components: "buttons",
      enableFunding: "venmo",
      disableFunding: "credit,card,paylater",
    }}>
      <div className="space-y-5">
        <div className="bg-white border rounded-2xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-base sm:text-lg">PayPal / Venmo</h2>
            <span className="font-black text-xl sm:text-2xl text-gray-900">{formatCurrency(total)}</span>
          </div>
          <p className="text-xs text-gray-400 mb-5">
            Complete your payment securely via PayPal or Venmo
          </p>

          {capturing ? (
            <div className="flex flex-col items-center gap-3 py-6 text-gray-500">
              <Loader2 size={28} className="animate-spin text-brand-500" />
              <p className="text-sm font-medium">Confirming your payment…</p>
            </div>
          ) : (
            <PayPalButtonsWithGuard
              total={total}
              orderPayload={orderPayload}
              onApproveOrder={async (paypalOrderId) => {
                setCapturing(true);
                try {
                  const res = await fetch("/api/paypal/capture-order", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ paypalOrderId, orderPayload }),
                  });
                  const order = await res.json();
                  if (!res.ok) throw new Error(order.error ?? "Capture failed");
                  onSuccess({ id: order.id, orderNumber: order.orderNumber, total: order.total });
                } catch (e: unknown) {
                  setError(e instanceof Error ? e.message : "Payment failed. Please try again.");
                  setCapturing(false);
                }
              }}
              onError={(msg) => setError(msg)}
            />
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
    </PayPalScriptProvider>
  );
}
