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

// Returns the Date for the next open-day 10 AM at or after `from`
function nextOpenMorning(from: Date): Date {
  const d = new Date(from);
  // Move to tomorrow if we're past cutoff or it's already next-morning logic
  d.setDate(d.getDate() + 1);
  d.setHours(OPEN_HOUR, 0, 0, 0);

  // Skip Sunday (0) — advance to Monday
  while (!isOpenDay(d.getDay())) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

export function getDeliveryTiming(now: Date = new Date()): DeliveryTiming {
  const day  = now.getDay(); // 0–6
  const mins = minutesFromMidnight(now.getHours(), now.getMinutes());
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
    const eta = new Date(now);
    eta.setHours(OPEN_HOUR, 0, 0, 0);
    return {
      type: "next-morning",
      estimatedDelivery: eta,
      label: "Today when we open at 10 AM",
      message: "Our store is not open yet. Your order will be prepared when we open at 10:00 AM.",
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
