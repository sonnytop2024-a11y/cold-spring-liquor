import { NextResponse } from "next/server";
import { dbGetSettings } from "@/lib/db";
import { DEFAULT_HERO_SHOWCASE, type HeroShowcaseSettings, type HeroShowcaseProduct } from "../_mock/store";

export const dynamic = "force-dynamic";

const clamp = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

// Public hero showcase config. Sanitized here so a malformed settings row can
// never break the hero; only active products are exposed, capped at 5.
export async function GET() {
  const s = await dbGetSettings();
  const raw = s.heroShowcase;
  const d = DEFAULT_HERO_SHOWCASE;

  const products: HeroShowcaseProduct[] = (Array.isArray(raw?.products) ? raw.products : [])
    .filter(p => p && p.active !== false && typeof p.kicker === "string")
    .slice(0, 5)
    .map((p, i) => ({
      id: String(p.id ?? `sp${i}`),
      kicker: String(p.kicker ?? "").slice(0, 40),
      subtitle: String(p.subtitle ?? "").slice(0, 60),
      badge: String(p.badge ?? "").slice(0, 40),
      price: clamp(p.price, 0, 100000, 0),
      regularPrice: p.regularPrice == null ? null : clamp(p.regularPrice, 0, 100000, 0) || null,
      imageUrl: typeof p.imageUrl === "string" && p.imageUrl ? p.imageUrl : null,
      url: typeof p.url === "string" ? p.url.slice(0, 300) : "",
      active: true,
      order: Number.isFinite(Number(p.order)) ? Number(p.order) : i,
    }))
    .sort((a, b) => a.order - b.order);

  const config: HeroShowcaseSettings = {
    enabled: (typeof raw?.enabled === "boolean" ? raw.enabled : d.enabled) && products.length > 0,
    showOnMobile: typeof raw?.showOnMobile === "boolean" ? raw.showOnMobile : d.showOnMobile,
    showOnDesktop: typeof raw?.showOnDesktop === "boolean" ? raw.showOnDesktop : d.showOnDesktop,
    products,
    mobile: {
      size: clamp(raw?.mobile?.size, 100, 260, d.mobile.size),
      right: clamp(raw?.mobile?.right, 0, 30, d.mobile.right),
      bottom: clamp(raw?.mobile?.bottom, 0, 40, d.mobile.bottom),
    },
    desktop: {
      size: clamp(raw?.desktop?.size, 100, 300, d.desktop.size),
      left: clamp(raw?.desktop?.left, 0, 80, d.desktop.left),
      bottom: clamp(raw?.desktop?.bottom, 0, 40, d.desktop.bottom),
    },
  };

  return NextResponse.json(config, { headers: { "Cache-Control": "no-store" } });
}
