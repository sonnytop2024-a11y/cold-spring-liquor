"use client";

import { useState } from "react";
import { Gift, Mail, CreditCard, Check } from "lucide-react";

const AMOUNTS = [25, 50, 100, 250];

export function GiftCardStore() {
  const [selected, setSelected] = useState<number>(50);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [senderName, setSenderName] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handlePurchase() {
    setLoading(true);
    try {
      const res = await fetch("/api/gift-cards/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: selected, recipientEmail, senderName, message }),
      });
      if (res.ok) setSubmitted(true);
      else alert("Purchase failed. Please try again.");
    } catch {
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check size={40} className="text-green-600" />
        </div>
        <h2 className="font-heading text-3xl font-bold mb-2">Gift Card Sent! 🎁</h2>
        <p className="text-gray-600">
          A ${selected} gift card has been sent to <strong>{recipientEmail}</strong> instantly.
        </p>
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
        <p className="text-gray-500 text-lg">
          Give the gift of great drinks. Delivered instantly via email.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Card preview */}
        <div>
          <h2 className="font-semibold mb-4">Select Amount</h2>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {AMOUNTS.map((amt) => (
              <button
                key={amt}
                onClick={() => setSelected(amt)}
                className={`py-5 rounded-2xl font-bold text-2xl border-2 transition-all ${
                  selected === amt
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
              <p className="font-heading text-5xl font-black">${selected}</p>
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

        {/* Form */}
        <div className="space-y-4">
          <h2 className="font-semibold mb-4">Delivery Details</h2>

          <div>
            <label className="block text-sm font-medium mb-1">Recipient's Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="friend@example.com"
                className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Your Name</label>
            <input
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="From: Your Name"
              className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Personal Message (optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Enjoy your drinks! 🥂"
              className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Gift card amount</span>
              <span className="font-bold">${selected}.00</span>
            </div>
            <div className="flex justify-between text-green-600 font-semibold">
              <span>🚚 Delivery (email)</span>
              <span>FREE & Instant</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>${selected}.00</span>
            </div>
          </div>

          <button
            onClick={handlePurchase}
            disabled={!recipientEmail || !senderName || loading}
            className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3.5 rounded-xl transition-colors"
          >
            <CreditCard size={18} />
            {loading ? "Processing..." : `Purchase $${selected} Gift Card`}
          </button>

          <p className="text-xs text-center text-gray-400">
            Gift cards are delivered instantly via email · Never expire · Redeemable at checkout
          </p>
        </div>
      </div>
    </div>
  );
}
