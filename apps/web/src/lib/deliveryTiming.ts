// Mon–Sat 10 AM – 9 PM, Sunday closed. Delivery cutoff: 8:30 PM.
// This file is used by both API routes (server) and React components (client).

export type DeliveryType = "same-day" | "next-morning";

export interface DeliveryTiming {
  type: DeliveryType;
  estimatedDelivery: Date;
  label: string;
  message: string;
  isStoreClosed: boolean;
}

const OPEN_HOUR   = 10;  // 10:00 AM
const CLOSE_HOUR  = 21;  // 9:00 PM
const CUTOFF_HOUR = 20;  // 8:00 PM
const CUTOFF_MIN  = 30;  // :30 → 8:30 PM cutoff

// 0=Sun, 1=Mon … 6=Sat
function isOpenDay(day: number): boolean {
  return day >= 1 && day <= 6; // Mon–Sat
}

function minutesFromMidnight(h: number, m: number) {
  return h * 60 + m;
}

// Returns the Date for the next open-day 10 AM (Central Time) at or after `from`
function nextOpenMorning(from: Date): Date {
  // Work in Central Time
  const central = new Date(from.toLocaleString("en-US", { timeZone: "America/Chicago" }));
  central.setDate(central.getDate() + 1);
  central.setHours(OPEN_HOUR, 30, 0, 0); // 10:00 open + 30 min → ETA 10:30 AM
  while (!isOpenDay(central.getDay())) {
    central.setDate(central.getDate() + 1);
  }
  // Convert back to UTC for storage/display
  const offset = central.getTime() - new Date(central.toLocaleString("en-US", { timeZone: "America/Chicago" })).getTime();
  return new Date(central.getTime() + offset);
}

export function getDeliveryTiming(now: Date = new Date()): DeliveryTiming {
  // Always compute in Central Time — Vercel servers run UTC
  const central = new Date(now.toLocaleString("en-US", { timeZone: "America/Chicago" }));
  const day  = central.getDay();
  const mins = minutesFromMidnight(central.getHours(), central.getMinutes());
  const openMins   = minutesFromMidnight(OPEN_HOUR, 0);
  const closeMins  = minutesFromMidnight(CLOSE_HOUR, 0);
  const cutoffMins = minutesFromMidnight(CUTOFF_HOUR, CUTOFF_MIN);

  const storeOpen  = isOpenDay(day) && mins >= openMins && mins < closeMins;
  const pastCutoff = isOpenDay(day) && mins >= cutoffMins;
  const isSunday   = day === 0;

  // Sunday — always next-morning (Monday)
  if (isSunday) {
    const eta = nextOpenMorning(now); // will land on Monday
    const dayName = eta.toLocaleDateString("en-US", { weekday: "long" });
    return {
      type: "next-morning",
      estimatedDelivery: eta,
      label: `${dayName} morning`,
      message: "We are closed on Sunday. Your order will be prepared for Monday morning delivery.",
      isStoreClosed: true,
    };
  }

  // Store not yet open (before 10 AM on a weekday)
  if (isOpenDay(day) && mins < openMins) {
    // Build 10:30 AM Central Time correctly (same approach as nextOpenMorning)
    const c = new Date(now.toLocaleString("en-US", { timeZone: "America/Chicago" }));
    c.setHours(OPEN_HOUR, 30, 0, 0);
    const offset = c.getTime() - new Date(c.toLocaleString("en-US", { timeZone: "America/Chicago" })).getTime();
    const eta = new Date(c.getTime() + offset);
    // Orders placed after midnight count as TODAY (same-day), delivered when we open.
    // "Next morning" is reserved for orders placed after the 8:30 PM cutoff.
    return {
      type: "same-day",
      estimatedDelivery: eta,
      label: "Today by 10:30 AM",
      message: "Our store is not open yet. Your order will be prepared and delivered today by 10:30 AM.",
      isStoreClosed: true,
    };
  }

  // Past cutoff (8:30 PM) — next business morning
  if (pastCutoff || !storeOpen) {
    const eta = nextOpenMorning(now);
    const dayName = eta.toLocaleDateString("en-US", { weekday: "long" });
    const isSaturdayNight = day === 6; // Saturday after cutoff → Monday
    const msg = isSaturdayNight
      ? `Our store is near closing time. Your order will be prepared for Monday morning delivery.`
      : `Our store is near closing time. Your order will be prepared for ${dayName} morning delivery.`;
    return {
      type: "next-morning",
      estimatedDelivery: eta,
      label: `${dayName} morning`,
      message: msg,
      isStoreClosed: false,
    };
  }

  // Normal same-day delivery — 10–30 minutes
  const etaMin = new Date(now.getTime() + 10 * 60 * 1000);
  const etaMax = new Date(now.getTime() + 30 * 60 * 1000);
  return {
    type: "same-day",
    estimatedDelivery: etaMax,
    label: "10–30 minutes",
    message: `Estimated delivery: 10–30 minutes.`,
    isStoreClosed: false,
  };
}

export function deliveryTimingLabel(timing: Pick<DeliveryTiming, "type" | "label">) {
  return timing.type === "same-day" ? "Same-day delivery" : "Next business morning";
}
