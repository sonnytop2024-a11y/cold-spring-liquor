// Pre-Order: a product with `availableFrom` set to a FUTURE date sells as a
// pre-order until that date, then automatically becomes a normal product
// (anh Sơn, 08/08). Dates are yyyy-mm-dd strings compared in store time
// (America/Chicago) so the switch happens at midnight Texas time, not UTC.

export function todayCT(): string {
  // en-CA locale formats as yyyy-mm-dd
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
}

export function isPreorderActive(availableFrom?: string | null): boolean {
  return !!availableFrom && availableFrom > todayCT();
}

/** "2026-08-13" → "Thursday, August 13" (no timezone surprises) */
export function preorderDateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** "2026-08-13" → "Aug 13" for compact badges */
export function preorderDateShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Whole days from today (store time) until the given yyyy-mm-dd; 0 if past. */
export function daysUntilCT(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const [ty, tm, td] = todayCT().split("-").map(Number);
  if (!y || !m || !d) return 0;
  const diff = Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td);
  return Math.max(0, Math.round(diff / 86400000));
}
