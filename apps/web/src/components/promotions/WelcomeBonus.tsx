"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Copy, Check, Sparkles } from "lucide-react";

export function WelcomeBonus() {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("welcome") === "new") {
      // Clean the URL immediately so refresh / share doesn't re-trigger
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(() => setVisible(true), 400);
    }
  }, []);

  function dismiss() {
    setVisible(false);
  }

  function shopNow() {
    setVisible(false);
    router.push("/products");
  }

  function copyCode() {
    navigator.clipboard.writeText("WELCOME10");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-brand-500 to-brand-700 px-6 py-5 text-white text-center">
          <Sparkles size={32} className="mx-auto mb-2" />
          <h2 className="font-heading text-2xl font-bold">Welcome Offer!</h2>
          <p className="text-brand-100 text-sm mt-1">$10 Off Your First Order</p>
        </div>

        <div className="p-6">
          <p className="text-gray-600 text-sm text-center mb-5">
            New to Cold Spring Liquor? Use code below for{" "}
            <strong>$10 off your first order of $50+</strong>. FREE delivery always included!
          </p>

          <div className="flex gap-2 mb-5">
            <div className="flex-1 bg-brand-50 border-2 border-brand-200 rounded-xl text-center py-3">
              <p className="font-mono font-black text-2xl text-brand-700 tracking-widest">
                WELCOME10
              </p>
            </div>
            <button
              onClick={copyCode}
              className="px-4 bg-brand-500 hover:bg-brand-600 text-white rounded-xl transition-colors"
            >
              {copied ? <Check size={20} /> : <Copy size={20} />}
            </button>
          </div>

          <div className="space-y-1 text-sm text-gray-500 mb-5">
            <p>✓ $10 off first order of $50+</p>
            <p>✓ FREE delivery on every order</p>
            <p>✓ NO tip required — ever</p>
            <p>✓ Earn CS Rewards points</p>
          </div>

          <button
            onClick={shopNow}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 rounded-xl transition-colors"
          >
            Shop Now & Save $10
          </button>

          <button
            onClick={dismiss}
            className="w-full text-gray-400 hover:text-gray-600 text-sm py-2 mt-1"
          >
            Maybe later
          </button>
        </div>

        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-white/70 hover:text-white"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
