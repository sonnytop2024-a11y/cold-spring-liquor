"use client";

import { useState } from "react";
import { Copy, Check, Users, Gift } from "lucide-react";

const DEMO_CODE = "REFER-USER123";

export function ReferralProgram() {
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(DEMO_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function sendInvite() {
    if (!email) return;
    setSent(true);
    setEmail("");
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users size={32} className="text-green-600" />
        </div>
        <h1 className="font-heading text-4xl font-bold mb-2">Refer a Friend</h1>
        <p className="text-gray-500 text-lg">
          Share the love — both of you get rewarded!
        </p>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {[
          { step: "1", icon: "🔗", label: "Share Your Code", desc: "Send your unique referral code or link to a friend" },
          { step: "2", icon: "🛒", label: "Friend Orders", desc: "Your friend places their first order over $25" },
          { step: "3", icon: "🎁", label: "Both Get Rewarded", desc: "You get $10 credit · They get $10 off" },
        ].map(({ step, icon, label, desc }) => (
          <div key={step} className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
            <div className="text-3xl mb-2">{icon}</div>
            <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold mx-auto mb-2">
              {step}
            </div>
            <p className="font-semibold mb-1">{label}</p>
            <p className="text-xs text-gray-500">{desc}</p>
          </div>
        ))}
      </div>

      {/* Reward summary */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-brand-50 border-2 border-brand-200 rounded-2xl p-6 text-center">
          <Gift size={28} className="text-brand-600 mx-auto mb-2" />
          <p className="text-3xl font-black text-brand-600">$10</p>
          <p className="font-semibold">You Get</p>
          <p className="text-xs text-gray-500 mt-1">Store credit added to your account</p>
        </div>
        <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 text-center">
          <Users size={28} className="text-green-600 mx-auto mb-2" />
          <p className="text-3xl font-black text-green-600">$10</p>
          <p className="font-semibold">Friend Gets</p>
          <p className="text-xs text-gray-500 mt-1">Off their first order over $25</p>
        </div>
      </div>

      {/* Referral code */}
      <div className="bg-white border-2 border-brand-200 rounded-2xl p-6 mb-6">
        <p className="font-semibold mb-3">Your Unique Referral Code</p>
        <div className="flex gap-3">
          <div className="flex-1 bg-gray-50 border rounded-xl px-4 py-3 font-mono text-xl font-bold tracking-wider text-center">
            {DEMO_CODE}
          </div>
          <button
            onClick={copyCode}
            className="px-4 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl transition-colors flex items-center gap-2 font-semibold"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Share this code or your referral link with friends
        </p>
      </div>

      {/* Email invite */}
      <div className="bg-white border rounded-2xl p-6">
        <p className="font-semibold mb-3">Invite by Email</p>
        <div className="flex gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="friend@example.com"
            className="flex-1 border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            onClick={sendInvite}
            disabled={!email}
            className="bg-brand-500 hover:bg-brand-600 disabled:bg-gray-200 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
          >
            Send Invite
          </button>
        </div>
        {sent && (
          <p className="text-green-600 text-sm font-medium mt-2">
            ✓ Invitation sent! You'll get $10 when they place their first order.
          </p>
        )}
      </div>
    </div>
  );
}
