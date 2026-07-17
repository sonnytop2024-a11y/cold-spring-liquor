import type { HeroDisplayMode } from "@/app/api/_mock/store";

/* Hero day/night resolution. Day window is 6:00 AM–5:59 PM America/Chicago —
   servers run UTC (Vercel) so the hour MUST come from Intl with an explicit
   timeZone, never from Date#getHours. */

export type HeroTheme = "day" | "night";

export function centralHour(now: Date = new Date()): number {
  const h = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      hour12: false,
      hour: "numeric",
    }).format(now),
  );
  // Some engines format midnight as "24"
  return Number.isFinite(h) ? h % 24 : 0;
}

export function resolveHeroTheme(
  mode: HeroDisplayMode | undefined,
  now: Date = new Date(),
): HeroTheme {
  if (mode === "day" || mode === "night") return mode;
  const h = centralHour(now);
  return h >= 6 && h < 18 ? "day" : "night";
}
