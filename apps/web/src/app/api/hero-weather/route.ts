import { NextResponse } from "next/server";
import { dbGetSettings } from "@/lib/db";
import { DEFAULT_HERO_WEATHER, type HeroWeatherSettings } from "../_mock/store";

export const dynamic = "force-dynamic";

const INTENSITIES = ["light", "medium", "heavy"] as const;
const FREQUENCIES = ["low", "medium", "high"] as const;

// Public hero weather config — the Hero Section reads this on page load so
// admin changes go live without a deploy. Values are sanitized here so a
// malformed settings row can never break the public site.
export async function GET() {
  const s = await dbGetSettings();
  const raw = s.heroWeather;
  const d = DEFAULT_HERO_WEATHER;

  const config: HeroWeatherSettings = {
    enabled: typeof raw?.enabled === "boolean" ? raw.enabled : d.enabled,
    rain: {
      enabled: typeof raw?.rain?.enabled === "boolean" ? raw.rain.enabled : d.rain.enabled,
      intensity: INTENSITIES.includes(raw?.rain?.intensity as any) ? raw!.rain.intensity : d.rain.intensity,
    },
    lightning: {
      enabled: typeof raw?.lightning?.enabled === "boolean" ? raw.lightning.enabled : d.lightning.enabled,
      frequency: FREQUENCIES.includes(raw?.lightning?.frequency as any) ? raw!.lightning.frequency : d.lightning.frequency,
    },
    opacity: Math.min(100, Math.max(10, Number(raw?.opacity) || d.opacity)),
  };

  return NextResponse.json(config, { headers: { "Cache-Control": "no-store" } });
}
