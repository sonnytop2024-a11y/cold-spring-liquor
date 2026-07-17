import { NextResponse } from "next/server";
import { dbGetSettings } from "@/lib/db";
import {
  DEFAULT_HERO_DISPLAY_MODE,
  HERO_DISPLAY_MODES,
  type HeroDisplayMode,
} from "../_mock/store";

export const dynamic = "force-dynamic";

// Public hero display mode — the Hero Section polls this so admin changes go
// live without a deploy. Any settings failure falls back to Automatic so the
// public site can never break because of a bad settings row.
export async function GET() {
  let mode: HeroDisplayMode = DEFAULT_HERO_DISPLAY_MODE;
  try {
    const s = await dbGetSettings();
    if (HERO_DISPLAY_MODES.includes(s.heroDisplayMode as HeroDisplayMode)) {
      mode = s.heroDisplayMode as HeroDisplayMode;
    }
  } catch {
    // fall back to Automatic
  }
  return NextResponse.json({ mode }, { headers: { "Cache-Control": "no-store" } });
}
