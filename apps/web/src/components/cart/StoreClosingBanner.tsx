"use client";

import { useEffect, useState } from "react";
import { getDeliveryTiming, type DeliveryTiming } from "@/lib/deliveryTiming";

// Store Closing Banner — checkout only, rendered directly above the
// "Continue to Payment" button for DELIVERY orders (pickup already has an
// explicit time-window picker, so no banner there).
// Visible after the 8:30 PM Central cutoff (and all day Sunday); re-checks
// every 60s so it appears/disappears without a reload. The next-slot text
// comes from getDeliveryTiming() — the same logic processOrder uses server-side.

const bannerCSS = `
  .closing-banner{
    position:relative;border-radius:18px;border:2px solid #E8590C;
    background:
      radial-gradient(120% 140% at 15% 10%, rgba(255,170,60,.18), transparent 55%),
      linear-gradient(180deg, #FFFBF3, #FFF3DC);
    box-shadow:0 10px 26px rgba(232,89,12,.18);
    padding:20px 18px;display:flex;align-items:flex-start;gap:14px;
    animation:closingBannerGlow 2.6s ease-in-out infinite;
  }
  @keyframes closingBannerGlow{
    0%,100%{ box-shadow:0 10px 26px rgba(232,89,12,.18), 0 0 0 rgba(232,89,12,0); }
    50%{ box-shadow:0 10px 30px rgba(232,89,12,.28), 0 0 22px rgba(232,89,12,.22); }
  }
  @media (prefers-reduced-motion: reduce){
    .closing-banner{ animation:none; box-shadow:0 10px 26px rgba(232,89,12,.2); }
  }
  .closing-banner .warn-icon{flex:none;width:40px;height:40px;margin-top:2px;filter:drop-shadow(0 0 6px rgba(232,89,12,.55));}
  .closing-banner .clock-icon{flex:none;width:50px;height:50px;margin-top:2px;filter:drop-shadow(0 0 6px rgba(232,89,12,.4));}
  @media (max-width:480px){
    .closing-banner{ padding:16px 14px; gap:11px; }
    .closing-banner .warn-icon{ width:34px;height:34px; }
    .closing-banner .clock-icon{ width:42px;height:42px; }
  }
`;

// 12 tick marks + hands fixed at the 8:30 PM cutoff — decorative only.
// Hour hand: (8 + 30/60) * 30 = 255deg; minute hand: 30 min = 180deg.
const TICKS = Array.from({ length: 12 }, (_, i) => {
  const a = (i * 30 * Math.PI) / 180;
  const r1 = 21, r2 = i % 3 === 0 ? 17 : 19;
  return {
    x1: (32 + Math.sin(a) * r1).toFixed(1), y1: (32 - Math.cos(a) * r1).toFixed(1),
    x2: (32 + Math.sin(a) * r2).toFixed(1), y2: (32 - Math.cos(a) * r2).toFixed(1),
    major: i % 3 === 0,
  };
});
const HOUR_HAND = {
  x2: (32 + Math.sin((255 * Math.PI) / 180) * 11).toFixed(1),
  y2: (32 - Math.cos((255 * Math.PI) / 180) * 11).toFixed(1),
};
const MINUTE_HAND = {
  x2: (32 + Math.sin(Math.PI) * 20).toFixed(1),
  y2: (32 - Math.cos(Math.PI) * 20).toFixed(1),
};

export function StoreClosingBanner() {
  const [timing, setTiming] = useState<DeliveryTiming | null>(null);

  useEffect(() => {
    // Computed client-side only (Central Time) to avoid SSR hydration mismatch
    const update = () => setTiming(getDeliveryTiming(new Date()));
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  // Only after the 8:30 PM cutoff or on Sunday — hidden during business hours
  if (!timing || timing.type !== "next-morning") return null;

  const headline =
    timing.closedReason === "sunday" ? "We are closed on Sunday"
    : timing.closedReason === "after-close" ? "We're closed for the night"
    : "Our store is near closing time!";
  const body = <>Your order will be prepared for <b className="text-[#E8590C] font-extrabold">{timing.label} delivery</b>.</>;

  return (
    <div className="closing-banner" role="status" aria-live="polite">
      <style dangerouslySetInnerHTML={{ __html: bannerCSS }} />

      <svg className="warn-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M24 4 L45 41 H3 Z" fill="#FDBA2A" stroke="#E8590C" strokeWidth="2.5" strokeLinejoin="round" />
        <rect x="22" y="17" width="4" height="13" rx="2" fill="#C23B12" />
        <circle cx="24" cy="35" r="2.4" fill="#C23B12" />
      </svg>

      <div className="flex-1 min-w-0">
        <div className="text-[20px] max-[480px]:text-[17px] font-extrabold text-[#C23B12] leading-snug mb-1">{headline}</div>
        <div className="text-[15px] max-[480px]:text-[14px] text-[#54463a] leading-normal">{body}</div>
      </div>

      <svg className="clock-icon" viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <circle cx="32" cy="32" r="27" fill="#fff" stroke="#E8590C" strokeWidth="3" />
        {TICKS.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="#111" strokeWidth={t.major ? 2 : 1.3} strokeLinecap="round" />
        ))}
        <line x1="32" y1="32" x2={HOUR_HAND.x2} y2={HOUR_HAND.y2} stroke="#111" strokeWidth="3" strokeLinecap="round" />
        <line x1="32" y1="32" x2={MINUTE_HAND.x2} y2={MINUTE_HAND.y2} stroke="#E8590C" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="32" cy="32" r="2.4" fill="#E8590C" />
      </svg>
    </div>
  );
}
