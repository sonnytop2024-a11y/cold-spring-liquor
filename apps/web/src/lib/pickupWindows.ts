// Pick Up In Store — time window generation & validation.
// Store hours: Mon–Sat 10 AM – 9 PM Central, Sunday closed.
// Windows are 1 hour each; for today the first window starts ≥ now + 30 min
// (rounded up to :00/:30); for future days windows run 10:00 AM – 9:00 PM.
// Used by both the checkout UI (client) and processOrder (server).

export interface PickupSlot {
  start: string; // ISO
  end: string;   // ISO
  label: string; // "10:30 – 11:30 AM"
  dateLabel: string; // "Today, Jul 3"
}

const TZ = "America/Chicago";
const OPEN_HOUR = 10;
const CLOSE_HOUR = 21;
export const MAX_PICKUP_DAYS_AHEAD = 7;

// Automatic discount for Pick Up In Store orders — single source of truth.
// Displayed labels use PICKUP_DISCOUNT_LABEL so a rate change is a one-line edit.
export const PICKUP_DISCOUNT_RATE = 0.05;
export const PICKUP_DISCOUNT_LABEL = "5%";
export function calcPickupDiscount(subtotal: number): number {
  return Math.round(subtotal * PICKUP_DISCOUNT_RATE * 100) / 100;
}

// Convert a wall-clock Central time (expressed on a Date built from toLocaleString)
// back to a real UTC instant.
function centralToUtc(central: Date): Date {
  const offset = central.getTime() - new Date(central.toLocaleString("en-US", { timeZone: TZ })).getTime();
  return new Date(central.getTime() + offset);
}

function centralNow(now: Date): Date {
  return new Date(now.toLocaleString("en-US", { timeZone: TZ }));
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: TZ });
}

export function pickupDateLabel(daysAhead: number, now: Date = new Date()): string {
  const c = centralNow(now);
  c.setDate(c.getDate() + daysAhead);
  const md = c.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  if (daysAhead === 0) return `Today, ${md.replace(/^\w+, /, "")}`;
  if (daysAhead === 1) return `Tomorrow, ${md.replace(/^\w+, /, "")}`;
  return md;
}

export function isPickupDayOpen(daysAhead: number, now: Date = new Date()): boolean {
  const c = centralNow(now);
  c.setDate(c.getDate() + daysAhead);
  return c.getDay() !== 0; // Sunday closed
}

// Generate valid windows for `daysAhead` days from now (0 = today).
export function getPickupWindows(daysAhead: number, now: Date = new Date()): PickupSlot[] {
  if (daysAhead < 0 || daysAhead > MAX_PICKUP_DAYS_AHEAD) return [];
  if (!isPickupDayOpen(daysAhead, now)) return [];

  const c = centralNow(now);
  const day = new Date(c);
  day.setDate(day.getDate() + daysAhead);

  // First window start (in Central wall-clock minutes)
  let startMins = OPEN_HOUR * 60;
  if (daysAhead === 0) {
    const nowMins = c.getHours() * 60 + c.getMinutes() + 30; // now + 30 min
    const rounded = Math.ceil(nowMins / 30) * 30;            // round up to :00/:30
    startMins = Math.max(startMins, rounded);
  }

  const slots: PickupSlot[] = [];
  const dateLabel = pickupDateLabel(daysAhead, now);
  // Each window is 1 hour; last window must end by closing time
  for (let m = startMins; m + 60 <= CLOSE_HOUR * 60; m += 60) {
    const s = new Date(day); s.setHours(Math.floor(m / 60), m % 60, 0, 0);
    const e = new Date(s.getTime() + 60 * 60 * 1000);
    const startUtc = centralToUtc(s);
    const endUtc = centralToUtc(e);
    slots.push({
      start: startUtc.toISOString(),
      end: endUtc.toISOString(),
      label: `${fmtTime(startUtc)} – ${fmtTime(endUtc)}`,
      dateLabel,
    });
  }
  return slots;
}

// Server-side validation of a client-submitted window.
export function validatePickupWindow(
  win: { start?: string; end?: string } | undefined | null,
  now: Date = new Date(),
): string | null {
  if (!win?.start || !win?.end) return "Please select a pickup time window.";
  const start = new Date(win.start);
  const end = new Date(win.end);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return "Invalid pickup time window.";
  if (end.getTime() <= now.getTime()) return "The selected pickup window has already passed. Please choose another time.";
  if (start.getTime() > now.getTime() + (MAX_PICKUP_DAYS_AHEAD + 1) * 86400000) {
    return `Pickup can be scheduled at most ${MAX_PICKUP_DAYS_AHEAD} days in advance.`;
  }
  const c = new Date(start.toLocaleString("en-US", { timeZone: TZ }));
  if (c.getDay() === 0) return "We are closed on Sunday. Please choose another day.";
  const startMins = c.getHours() * 60 + c.getMinutes();
  if (startMins < OPEN_HOUR * 60 || startMins + 60 > CLOSE_HOUR * 60) {
    return "Pickup windows are available between 10 AM and 9 PM.";
  }
  return null;
}
