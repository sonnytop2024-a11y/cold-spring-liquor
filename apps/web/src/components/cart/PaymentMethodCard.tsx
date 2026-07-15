"use client";

import type { ReactNode, KeyboardEvent } from "react";

// ── Brand mark placeholders ──────────────────────────────────────────────────
// Simplified inline wordmarks/icons, not the official brand assets. Swap these
// for real logo files from each brand's kit before this ships to production.
function VisaMark() {
  return (
    <span className="h-[26px] px-2 rounded-md border border-[#E7E5E0] bg-white flex items-center justify-center">
      <svg width="30" height="10" viewBox="0 0 40 13" aria-label="Visa">
        <text x="0" y="11" fontFamily="Georgia, serif" fontStyle="italic" fontWeight="700" fontSize="13" fill="#1A1F71">VISA</text>
      </svg>
    </span>
  );
}

function MastercardMark() {
  return (
    <span className="h-[26px] px-2 rounded-md border border-[#E7E5E0] bg-white flex items-center justify-center">
      <svg width="22" height="14" viewBox="0 0 24 16" aria-label="Mastercard">
        <circle cx="8" cy="8" r="7" fill="#EB001B" />
        <circle cx="16" cy="8" r="7" fill="#F79E1B" />
        <path d="M12 2.5a7 7 0 0 1 0 11 7 7 0 0 1 0-11z" fill="#FF5F00" />
      </svg>
    </span>
  );
}

function ApplePayMark() {
  return (
    <span className="h-[26px] px-2 rounded-md border border-[#E7E5E0] bg-white flex items-center justify-center">
      <svg width="18" height="14" viewBox="0 0 24 24" aria-label="Apple Pay">
        <path fill="#111" d="M16.5 1.5c-1 .1-2.2.7-2.9 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.2-.6 2.9-1.4.6-.8 1.1-1.9 1-3zM19.9 8.4c-1.6-.2-3 .9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1.9-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.7 2.5 3 2.4 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.2 2.9-2.4.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.5-1-2.5-3.7 0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8z" />
      </svg>
    </span>
  );
}

function GooglePayMark() {
  return (
    <span className="h-[26px] px-2 rounded-md border border-[#E7E5E0] bg-white flex items-center justify-center">
      <svg width="34" height="14" viewBox="0 0 34 16" aria-label="Google Pay">
        <text x="0" y="12" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="12" fill="#4285F4">G</text>
        <text x="7" y="12" fontFamily="Arial, sans-serif" fontWeight="500" fontSize="10" fill="#5F6368">Pay</text>
      </svg>
    </span>
  );
}

function PayPalMark() {
  return (
    <span className="h-[26px] px-2 rounded-md border border-[#E7E5E0] bg-white flex items-center justify-center">
      <svg width="52" height="12" viewBox="0 0 70 16" aria-label="PayPal">
        <text x="0" y="13" fontFamily="Arial, sans-serif" fontWeight="800" fontStyle="italic" fontSize="14" fill="#003087">Pay</text>
        <text x="24" y="13" fontFamily="Arial, sans-serif" fontWeight="800" fontStyle="italic" fontSize="14" fill="#009CDE">Pal</text>
      </svg>
    </span>
  );
}

function VenmoMark() {
  return (
    <span className="h-[26px] px-2 rounded-md border border-[#E7E5E0] bg-white flex items-center justify-center">
      <svg width="46" height="12" viewBox="0 0 60 16" aria-label="Venmo">
        <text x="0" y="13" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="14" fill="#3D95CE">venmo</text>
      </svg>
    </span>
  );
}

function CardOutlineIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="5" width="20" height="14" rx="3" stroke="#B8860B" strokeWidth="1.6" />
      <rect x="2" y="9" width="20" height="3" fill="#B8860B" />
      <rect x="5" y="15" width="6" height="1.6" rx="0.8" fill="#B8860B" />
    </svg>
  );
}

function PayPalPIcon() {
  return (
    <span className="text-white font-black text-lg italic">P</span>
  );
}

export const CARD_BRAND_LOGOS = (
  <>
    <VisaMark />
    <MastercardMark />
    <ApplePayMark />
    <GooglePayMark />
  </>
);

export const PAYPAL_BRAND_LOGOS = (
  <>
    <PayPalMark />
    <VenmoMark />
  </>
);

export { CardOutlineIcon, PayPalPIcon };

interface PaymentMethodCardProps {
  variant: "gold" | "blue";
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  title: string;
  subtitle: string;
  icon: ReactNode;
  logos: ReactNode;
}

const VARIANT_STYLES = {
  gold: {
    borderDefault: "border-[#E4C77A]",
    borderSelected: "border-[#B8860B]",
    bgSelected: "bg-[#FBF3E1]",
    glowSelected: "shadow-[0_0_0_5px_rgba(184,134,11,0.12),0_16px_32px_rgba(20,20,20,0.10)]",
    iconBg: "bg-[#FBF3E1]",
    focusRing: "focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(184,134,11,0.35)]",
  },
  blue: {
    borderDefault: "border-[#B9CFF5]",
    borderSelected: "border-[#003087]",
    bgSelected: "bg-[#EAF1FF]",
    glowSelected: "shadow-[0_0_0_5px_rgba(0,48,135,0.10),0_16px_32px_rgba(20,20,20,0.10)]",
    iconBg: "bg-[#003087]",
    focusRing: "focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(0,48,135,0.30)]",
  },
} as const;

export function PaymentMethodCard({ variant, selected, onSelect, disabled, title, subtitle, icon, logos }: PaymentMethodCardProps) {
  const v = VARIANT_STYLES[variant];

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!disabled) onSelect();
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const group = e.currentTarget.closest('[role="radiogroup"]');
      const radios = group ? Array.from(group.querySelectorAll<HTMLElement>('[role="radio"]')) : [];
      const idx = radios.indexOf(e.currentTarget);
      if (idx === -1) return;
      const next = e.key === "ArrowDown" ? (idx + 1) % radios.length : (idx - 1 + radios.length) % radios.length;
      radios[next]?.focus();
      radios[next]?.click();
    }
  }

  return (
    <div
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled}
      tabIndex={0}
      onClick={() => !disabled && onSelect()}
      onKeyDown={handleKeyDown}
      className={`relative flex items-center gap-[18px] min-h-[112px] px-5 py-[18px] rounded-[24px] bg-white cursor-pointer
        border-[1.5px] ${selected ? `border-2 ${v.borderSelected} ${v.bgSelected} ${v.glowSelected}` : `${v.borderDefault} shadow-[0_12px_24px_rgba(20,20,20,0.08)] hover:border-gray-400 hover:shadow-[0_16px_32px_rgba(20,20,20,0.12)]`}
        ${disabled ? "opacity-60 cursor-not-allowed" : "active:scale-[0.98]"}
        transition-all duration-200 ${v.focusRing}`}
    >
      {/* Check badge — only visible when selected */}
      <span
        className={`absolute -top-[9px] -right-[9px] w-[26px] h-[26px] rounded-full bg-[#3FA34D] text-white flex items-center justify-center text-sm font-bold shadow-[0_2px_6px_rgba(0,0,0,0.2)] transition-all duration-200 ${
          selected ? "opacity-100 scale-100" : "opacity-0 scale-[0.6]"
        }`}
      >
        ✓
      </span>

      <div className={`shrink-0 w-[60px] h-[60px] rounded-[18px] flex items-center justify-center ${v.iconBg}`}>
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[22px] font-bold text-gray-900 leading-[1.2] mb-2">{title}</p>
        <p className="text-base font-medium text-gray-500 leading-[1.35]">{subtitle}</p>
      </div>

      <div className="hidden sm:flex items-center gap-3.5 shrink-0">
        <div className="flex items-center gap-2">{logos}</div>
        <span className="text-[#3A3A3A] text-xl font-bold leading-none">›</span>
      </div>
    </div>
  );
}
