"use client";

import { useEffect } from "react";
import { resolveHeroTheme } from "@/lib/heroTheme";
import type { HeroDisplayMode } from "@/app/api/_mock/store";

/* Keeps .hero-section's data-hero-theme fresh without a reload:
   - re-resolves Central Time every 60s (a tab left open crosses 6 AM/6 PM
     boundaries on its own)
   - polls /api/hero-mode so an admin change applies to every visitor
   - if the daylight image fails to load, forces night (current hero) so the
     page never shows a broken hero */
export function HeroThemeController({ initialMode }: { initialMode: HeroDisplayMode }) {
  useEffect(() => {
    const section = document.querySelector<HTMLElement>(".hero-section");
    if (!section) return;

    let mode: HeroDisplayMode = initialMode;
    let dayImageBroken = false;

    const apply = () => {
      const theme = dayImageBroken ? "night" : resolveHeroTheme(mode);
      if (section.dataset.heroTheme !== theme) section.dataset.heroTheme = theme;
    };

    const dayImg = section.querySelector<HTMLImageElement>(".hero-bg-day-img");
    const markBroken = () => { dayImageBroken = true; apply(); };
    if (dayImg) {
      if (dayImg.complete && dayImg.naturalWidth === 0) dayImageBroken = true;
      dayImg.addEventListener("error", markBroken);
    }

    const tick = async () => {
      try {
        const r = await fetch("/api/hero-mode", { cache: "no-store" });
        if (r.ok) {
          const j = (await r.json()) as { mode?: string };
          if (j.mode === "auto" || j.mode === "day" || j.mode === "night") mode = j.mode;
        }
      } catch {
        // network hiccup — keep last known mode
      }
      apply();
    };

    apply();
    tick();
    const id = setInterval(tick, 60_000);
    return () => {
      clearInterval(id);
      dayImg?.removeEventListener("error", markBroken);
    };
  }, [initialMode]);

  return null;
}
