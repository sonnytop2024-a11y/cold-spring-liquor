"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export function AgeGateModal() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // localStorage (not sessionStorage) so the confirmation survives new tabs
    // and return visits; also migrate the flag from older sessions.
    const verified = localStorage.getItem("age_verified") || sessionStorage.getItem("age_verified");
    if (!verified) setShow(true);
    else localStorage.setItem("age_verified", "true");
  }, []);

  function confirm() {
    localStorage.setItem("age_verified", "true");
    setShow(false);
  }

  function deny() {
    window.location.href = "https://www.responsibility.org/";
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-dark-900/95 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center shadow-2xl">
        <Image src="/logo-transparent.png" alt="Cold Spring Liquor" width={96} height={96} className="mx-auto mb-4 w-24 h-auto" priority />
        <h2 className="font-heading text-2xl font-bold mb-2">Welcome to Cold Spring Liquor</h2>
        <p className="text-gray-600 mb-6">
          You must be <strong>21 years or older</strong> to enter this website.
          Please confirm your age.
        </p>
        <div className="flex gap-4">
          <button
            onClick={confirm}
            className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            I am 21+
          </button>
          <button
            onClick={deny}
            className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-lg transition-colors"
          >
            Under 21
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          By entering you accept our Terms & Conditions. Must be 21+ to purchase alcohol.
        </p>
      </div>
    </div>
  );
}
