"use client";

import { useState } from "react";
import { Gift, Mail, User, MessageSquare, CreditCard, Check, Loader2, ArrowLeft } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
const AMOUNTS = [25, 50, 100, 250];

interface GiftCardFormData {
  amount: number;
  recipientEmail: string;
  senderName: string;
  senderEmail: string;
  message: string;
}

// ── Step 2: Stripe payment form ──────────────────────────────────────────────

function PaymentStep({
  data,
  clientSecret,
  onBack,
  onSuccess,
}: {
  data: GiftCardFormData;
  clientSecret: string;
  onBack: () => void;
  onSuccess: (code: string, paymentIntentId: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  async function handlePay() {
    if (!stripe || !elements) return;
    setError("");
    setPaying(true);

    const submitResult = await elements.submit();
    if (submitResult.error) {
      setError(submitResult.error.message ?? "Payment failed");
      setPaying(false);
      return;
    }

    const result = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });

    if (result.error) {
      setError(result.error.message ?? "Payment failed");
      setPaying(false);
      return;
    }

    const pi = result.paymentIntent;
    if (pi?.status === "succeeded") {
      try {
        const res = await fetch("/api/gift-cards/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentIntentId: pi.id,
            amount: data.amount,
            recipientEmail: data.recipientEmail,
            senderName: data.senderName,
            message: data.message,
            buyerEmail: data.senderEmail,
          }),
        });
        const json = await res.json();
        if (res.ok) {
          onSuccess(json.code, pi.id);
        } else {
          setError(json.error ?? "Failed to issue gift card");
        }
      } catch {
        setError("Network error. Please contact support with your payment ID.");
      }
    }

    setPaying(false);
  }

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
        <ArrowLeft size={14} /> Back
      </button>

      {/* Order summary */}
      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 mb-6">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-widest mb-3">Order Summary</p>
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-700">${data.amount} Gift Card</span>
          <span className="font-bold text-gray-900">${data.amount}.00</span>
        </div>
        <div className="flex justify-between items-center text-xs text-gray-400">
          <span>To: {data.recipientEmail}</span>
          <span className="text-green-600 font-semibold">Email delivery — FREE</span>
        </div>
      </div>

      <h3 className="font-semibold text-sm text-gray-700 mb-3">Payment Details</h3>
      <div className="border border-gray-200 rounded-xl p-4 mb-4">
        <PaymentElement options={{ layout: "tabs" }} />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">{error}</p>
      )}

      <button
        onClick={handlePay}
        disabled={paying || !stripe}
        className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3.5 rounded-xl transition-colors"
      >
        {paying ? (
          <><Loader2 size={18} className="animate-spin" /> Processing…</>
        ) : (
          <><CreditCard size={18} /> Pay ${data.amount}.00 & Send Gift Card</>
        )}
      </button>

      <p className="text-xs text-center text-gray-400 mt-3">
        Secured by Stripe · Gift card delivered instantly after payment
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function GiftCardStore() {
  const [step, setStep] = useState<"form" | "payment" | "success">("form");
  const [data, setData] = useState<GiftCardFormData>({
    amount: 50,
    recipientEmail: "",
    senderName: "",
    senderEmail: "",
    message: "",
  });
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [successCode, setSuccessCode] = useState("");

  async function handleContinue() {
    if (!data.recipientEmail || !data.senderName) return;
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: data.amount }),
      });
      const json = await res.json();
      if (res.ok && json.clientSecret) {
        setClientSecret(json.clientSecret);
        setStep("payment");
      } else {
        alert("Could not initialize payment. Please try again.");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "success") {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <Check size={40} className="text-green-600" />
        </div>
        <h2 className="font-heading text-3xl font-bold mb-2">Gift Card Sent! 🎁</h2>
        <p className="text-gray-600 mb-6">
          A <strong>${data.amount}</strong> gift card has been sent to <strong>{data.recipientEmail}</strong>.
        </p>
        <div className="bg-gray-900 rounded-2xl px-6 py-4 inline-block mb-6">
          <p className="text-xs text-gray-400 mb-1 tracking-widest uppercase">Gift Card Code</p>
          <p className="text-2xl font-black text-white tracking-widest font-mono">{successCode}</p>
        </div>
        <br />
        <button
          onClick={() => { setStep("form"); setSuccessCode(""); setData({ amount: 50, recipientEmail: "", senderName: "", senderEmail: "", message: "" }); }}
          className="text-sm text-brand-600 hover:underline"
        >
          Send another gift card
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Gift size={32} className="text-brand-600" />
        </div>
        <h1 className="font-heading text-4xl font-bold mb-2">Digital Gift Cards</h1>
        <p className="text-gray-500 text-lg">Give the gift of great drinks. Delivered instantly via email.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Amount + Card Preview */}
        <div>
          <h2 className="font-semibold mb-4">Select Amount</h2>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {AMOUNTS.map((amt) => (
              <button
                key={amt}
                onClick={() => setData(d => ({ ...d, amount: amt }))}
                disabled={step === "payment"}
                className={`py-5 rounded-2xl font-bold text-2xl border-2 transition-all disabled:cursor-not-allowed ${
                  data.amount === amt
                    ? "bg-brand-500 text-white border-brand-500 scale-105 shadow-lg shadow-brand-500/30"
                    : "border-gray-200 hover:border-brand-300 text-gray-700"
                }`}
              >
                ${amt}
              </button>
            ))}
          </div>

          {/* Card mockup */}
          <div className="bg-gradient-to-br from-dark-900 to-brand-900 rounded-2xl p-6 text-white aspect-video flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between">
              <span className="font-heading text-sm font-bold">Cold Spring Liquor</span>
              <Gift size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Gift Card Value</p>
              <p className="font-heading text-5xl font-black">${data.amount}</p>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs text-gray-400">Valid for any purchase</p>
                <p className="text-xs text-brand-400">Never expires</p>
              </div>
              <p className="text-xs font-mono text-gray-500">GIFT-XXXX-XXXX</p>
            </div>
          </div>
        </div>

        {/* Right: Form or Payment */}
        <div className="space-y-4">
          {step === "form" ? (
            <>
              <h2 className="font-semibold mb-4">Delivery Details</h2>

              <div>
                <label className="block text-sm font-medium mb-1">Recipient&apos;s Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={data.recipientEmail}
                    onChange={(e) => setData(d => ({ ...d, recipientEmail: e.target.value }))}
                    placeholder="friend@example.com"
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Your Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={data.senderName}
                    onChange={(e) => setData(d => ({ ...d, senderName: e.target.value }))}
                    placeholder="From: Your Name"
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Your Email <span className="text-gray-400">(for your receipt)</span></label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={data.senderEmail}
                    onChange={(e) => setData(d => ({ ...d, senderEmail: e.target.value }))}
                    placeholder="you@example.com"
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Personal Message <span className="text-gray-400">(optional)</span></label>
                <div className="relative">
                  <MessageSquare size={16} className="absolute left-3 top-3 text-gray-400" />
                  <textarea
                    value={data.message}
                    onChange={(e) => setData(d => ({ ...d, message: e.target.value }))}
                    rows={3}
                    placeholder="Enjoy your drinks! 🥂"
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 resize-none"
                  />
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Gift card amount</span>
                  <span className="font-bold">${data.amount}.00</span>
                </div>
                <div className="flex justify-between text-green-600 font-semibold">
                  <span>🚚 Delivery (email)</span>
                  <span>FREE & Instant</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>${data.amount}.00</span>
                </div>
              </div>

              <button
                onClick={handleContinue}
                disabled={!data.recipientEmail || !data.senderName || loading}
                className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3.5 rounded-xl transition-colors"
              >
                {loading ? <><Loader2 size={18} className="animate-spin" /> Preparing…</> : <>Continue to Payment →</>}
              </button>

              <p className="text-xs text-center text-gray-400">
                Gift cards are delivered instantly via email · Never expire · Redeemable at checkout
              </p>
            </>
          ) : clientSecret ? (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: "stripe",
                  variables: { colorPrimary: "#f97316", borderRadius: "12px", fontFamily: "inherit" },
                },
              }}
            >
              <PaymentStep
                data={data}
                clientSecret={clientSecret}
                onBack={() => setStep("form")}
                onSuccess={(code) => { setSuccessCode(code); setStep("success"); }}
              />
            </Elements>
          ) : null}
        </div>
      </div>
    </div>
  );
}
