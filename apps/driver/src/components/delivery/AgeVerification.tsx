"use client";

import { useState } from "react";
import { ShieldCheck, X, AlertTriangle } from "lucide-react";

interface AgeVerificationProps {
  customerName: string;
  onVerified: () => void;
  onFailed: (reason: string) => void;
  onCancel: () => void;
}

function calcAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function AgeVerification({ customerName, onVerified, onFailed, onCancel }: AgeVerificationProps) {
  const [dob, setDob] = useState("");
  const [idChecked, setIdChecked] = useState(false);
  const [error, setError] = useState("");

  function handleVerify() {
    if (!idChecked) { setError("Please confirm you physically checked the ID."); return; }
    if (!dob) { setError("Please enter the date of birth from the ID."); return; }

    const age = calcAge(dob);
    if (age < 21) {
      onFailed(`Customer is ${age} years old — under 21. Delivery refused.`);
    } else {
      onVerified();
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-brand-500" />
            <h3 className="font-bold">ID Verification — 21+</h3>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-sm font-semibold text-amber-800">
              ⚠️ Texas Law requires ID verification for all alcohol deliveries.
            </p>
            <p className="text-xs text-amber-700 mt-1">
              You MUST verify a government-issued photo ID before completing this delivery.
            </p>
          </div>

          <div>
            <p className="text-sm font-medium mb-1">Customer: <strong>{customerName}</strong></p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Date of Birth on ID *</label>
            <input
              type="date"
              value={dob}
              onChange={(e) => { setDob(e.target.value); setError(""); }}
              className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {dob && (
              <p className={`text-xs mt-1 font-medium ${calcAge(dob) < 21 ? "text-red-500" : "text-green-600"}`}>
                {calcAge(dob) < 21
                  ? `❌ Age: ${calcAge(dob)} — UNDER 21, refuse delivery`
                  : `✓ Age: ${calcAge(dob)} — OK to deliver`}
              </p>
            )}
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={idChecked}
              onChange={(e) => { setIdChecked(e.target.checked); setError(""); }}
              className="mt-0.5 accent-brand-500 scale-125"
            />
            <span className="text-sm">
              I have <strong>physically inspected</strong> a valid government-issued photo ID (Driver&apos;s License, Passport, State ID) and confirmed this person&apos;s identity.
            </span>
          </label>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertTriangle size={15} />
              {error}
            </div>
          )}
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={() => onFailed("Customer refused to show ID or was not present.")}
            className="flex-1 border border-red-300 text-red-600 hover:bg-red-50 rounded-xl py-2.5 text-sm font-semibold transition-colors"
          >
            Refuse Delivery
          </button>
          <button
            onClick={handleVerify}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
          >
            Verify & Deliver
          </button>
        </div>
      </div>
    </div>
  );
}
