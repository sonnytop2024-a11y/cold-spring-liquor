/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Persistent DB layer — tries Supabase, falls back to mock store.
 * Minimal table schema required: csl_products (id TEXT PK, data JSONB)
 * updated_at is optional — code does not depend on it.
 */

import { supabaseServer } from "./supabase.server";
import { store, type MockProduct, type StoreSettings } from "../app/api/_mock/store";

function tbl(table: string) {
  const sb = supabaseServer();
  if (!sb) return null;
  return (sb as any).from(table);
}

// ── Products ──────────────────────────────────────────────────────────────────

export async function dbGetProductsPage(opts: {
  limit: number;
  offset: number;
  q?: string;
  category?: string;
  stock?: string;
  bundleEligible?: boolean;
  featured?: boolean;
}): Promise<{ products: MockProduct[]; total: number }> {
  const { limit, offset, q, category, stock, bundleEligible, featured } = opts;
  const t = tbl("csl_products");
  if (t) {
    try {
      let countQ = t.select("id", { count: "exact", head: true });
      let dataQ  = t.select("data")
        .order("data->>sortKey", { ascending: true, nullsFirst: false })
        .order("data->>name", { ascending: true })
        .range(offset, offset + limit - 1);
      if (category) {
        countQ = countQ.filter("data->>category", "eq", category);
        dataQ  = dataQ.filter("data->>category", "eq", category);
      }
      if (q) {
        const orStr = `data->>name.ilike.%${q}%,data->>brand.ilike.%${q}%`;
        countQ = countQ.or(orStr);
        dataQ  = dataQ.or(orStr);
      }
      if (stock === "in")  {
        countQ = countQ.filter("data->>inStock", "eq", "true");
        dataQ  = dataQ.filter("data->>inStock", "eq", "true");
      }
      if (stock === "out") {
        countQ = countQ.filter("data->>inStock", "eq", "false");
        dataQ  = dataQ.filter("data->>inStock", "eq", "false");
      }
      if (bundleEligible === true) {
        countQ = countQ.filter("data->>bundleEligible", "eq", "true");
        dataQ  = dataQ.filter("data->>bundleEligible", "eq", "true");
      }
      if (featured === true) {
        countQ = countQ.filter("data->>featured", "eq", "true");
        dataQ  = dataQ.filter("data->>featured", "eq", "true");
      }
      const [{ count, error: cErr }, { data, error: dErr }] = await Promise.all([countQ, dataQ]);
      if (cErr) throw cErr;
      if (dErr) throw dErr;
      return {
        products: (data ?? []).map((r: any) => r.data as MockProduct),
        total: count ?? 0,
      };
    } catch (e) {
      console.error("[db] getProductsPage error:", e);
    }
  }
  // Fallback: in-memory slice
  let all = store.getAllProducts();
  const qLow = q?.toLowerCase();
  if (qLow) all = all.filter(p => p.name.toLowerCase().includes(qLow) || (p.brand ?? "").toLowerCase().includes(qLow));
  if (category) all = all.filter(p => p.category === category);
  if (stock === "in")  all = all.filter(p => p.inStock !== false && p.stockQty > 0);
  if (stock === "out") all = all.filter(p => p.inStock === false || p.stockQty <= 0);
  if (bundleEligible === true) all = all.filter(p => p.bundleEligible);
  if (featured === true) all = all.filter(p => p.featured);
  all = [...all].sort((a, b) => computeProductSortKey(a).localeCompare(computeProductSortKey(b)));
  return { products: all.slice(offset, offset + limit), total: all.length };
}

export async function dbGetAllProducts(): Promise<MockProduct[]> {
  const t = tbl("csl_products");
  if (t) {
    try {
      // Paginate in 1000-row chunks — Supabase caps at 1000 rows per request
      const PAGE = 1000;
      const all: MockProduct[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await t.select("data").range(from, from + PAGE - 1);
        if (error) { console.error("[db] getAllProducts error:", error.message); break; }
        if (!data || data.length === 0) break;
        all.push(...data.map((r: any) => r.data as MockProduct));
        if (data.length < PAGE) break; // last page
        from += PAGE;
      }
      if (all.length > 0) {
        return all.sort((a, b) => computeProductSortKey(a).localeCompare(computeProductSortKey(b)));
      }
    } catch (e) {
      console.error("[db] getAllProducts exception:", e);
    }
  }
  return store.getAllProducts();
}

export async function dbGetProduct(idOrSlug: string): Promise<MockProduct | undefined> {
  // Try direct lookup by id first (fast, single row) — avoids loading all products
  const t = tbl("csl_products");
  if (t) {
    try {
      const { data, error } = await t.select("data").eq("id", idOrSlug).maybeSingle();
      if (!error && data?.data) return data.data as MockProduct;
      // Not found by id — try by slug (slug is stored inside the data JSONB, so must scan)
    } catch {}
  }
  // Slug-based fallback: scan all products
  const all = await dbGetAllProducts();
  return all.find((p) => p.id === idOrSlug || p.slug === idOrSlug);
}

export async function dbGetProductsByIds(ids: string[]): Promise<Map<string, MockProduct>> {
  const map = new Map<string, MockProduct>();
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) return map;
  const t = tbl("csl_products");
  if (t) {
    try {
      const { data, error } = await t.select("data").in("id", unique);
      if (!error && data) {
        for (const r of data as any[]) {
          const p = r.data as MockProduct;
          if (p?.id) map.set(p.id, p);
        }
        return map;
      }
    } catch {}
  }
  for (const p of store.getAllProducts()) if (unique.includes(p.id)) map.set(p.id, p);
  return map;
}

// Orders snapshot item data at creation; overlay each item with the product's
// CURRENT image/category so order views always show up-to-date artwork.
export async function dbOverlayCurrentProductImages<T extends { items?: any[] }>(orders: T[]): Promise<T[]> {
  try {
    const ids = orders.flatMap(o => (o.items ?? []).map((i: any) => i.productId).filter(Boolean));
    if (ids.length === 0) return orders;
    const products = await dbGetProductsByIds(ids);
    if (products.size === 0) return orders;
    return orders.map(o => ({
      ...o,
      items: (o.items ?? []).map((i: any) => {
        const p = products.get(i.productId);
        if (!p) return i;
        return {
          ...i,
          imageUrl: p.imageUrl ?? i.imageUrl ?? null,
          category: p.category ?? i.category ?? null,
        };
      }),
    }));
  } catch {
    return orders;
  }
}

// Catalog display order: products WITH an image first, then grouped by brand
// (falls back to name — imported items carry the brand in the name prefix,
// e.g. "Deep Eddy Peach Vodka"), then alphabetical A→Z.
// Stored on each row so Supabase can ORDER BY it and pagination stays correct.
export function computeProductSortKey(p: MockProduct): string {
  // Legacy imports stored the literal strings "null"/"undefined" in imageUrl
  const raw = String(p.imageUrl ?? "").trim().toLowerCase();
  const hasImage = raw !== "" && raw !== "null" && raw !== "undefined";
  const group = ((p.brand ?? "").trim() || p.name || "").toLowerCase();
  return `${hasImage ? "0" : "1"}|${group}|${(p.name ?? "").toLowerCase()}`;
}

export async function dbSaveProduct(product: MockProduct): Promise<void> {
  product = { ...product, sortKey: computeProductSortKey(product) };
  const t = tbl("csl_products");
  if (t) {
    // Upsert with only id + data — no updated_at dependency
    const { error } = await t.upsert({ id: product.id, data: product }, { onConflict: "id" });
    if (!error) {
      return;
    }
    console.error("[db] upsert error:", error.message);
    throw new Error(`DB save failed: ${error.message}`);
  }
  store.saveProduct(product);
}

// Patch specific fields on an existing product (UPDATE, not upsert).
// Returns the merged product, or null if not found.
export async function dbUpdateProduct(id: string, patch: Partial<MockProduct>): Promise<MockProduct | null> {
  const t = tbl("csl_products");
  if (t) {
    const { data: row, error: getErr } = await t.select("data").eq("id", id).maybeSingle();
    if (!getErr && row?.data) {
      const merged: MockProduct = { ...(row.data as MockProduct), ...patch };
      merged.sortKey = computeProductSortKey(merged);
      const { error: updateErr } = await t.update({ data: merged }).eq("id", id);
      if (!updateErr) {
        return merged;
      }
      throw new Error(`Patch failed: ${updateErr.message}`);
    }
  }
  // Fallback: mock store
  const all = store.getAllProducts();
  const existing = all.find((p) => p.id === id);
  if (!existing) return null;
  const merged: MockProduct = { ...existing, ...patch };
  store.saveProduct(merged);
  return merged;
}

export async function dbDeleteProduct(id: string): Promise<boolean> {
  const t = tbl("csl_products");
  if (t) {
    // Use .select("id") so Supabase returns the deleted rows — lets us verify count
    const { data, error } = await t.delete().eq("id", id).select("id");
    if (!error) {
      const count = Array.isArray(data) ? data.length : 0;
      // Also purge from in-memory store in case this instance cached it
      store.deleteProduct(id);
      return true;
    }
    console.error("[db] delete error:", error.message);
    throw new Error(`DB delete failed: ${error.message}`);
  }
  return store.deleteProduct(id);
}

export async function dbSaveManyProducts(products: MockProduct[]): Promise<{ saved: number; errors: string[] }> {
  const t = tbl("csl_products");
  const errors: string[] = [];

  if (t) {
    try {
      const rows = products.map((p) => ({ id: p.id, data: p }));
      for (let i = 0; i < rows.length; i += 200) {
        const chunk = rows.slice(i, i + 200);
        const { error } = await t.upsert(chunk, { onConflict: "id" });
        if (error) {
          console.error(`[db] batch upsert chunk ${Math.floor(i / 200)} error:`, error.message);
          errors.push(error.message);
        }
      }
      if (errors.length === 0) {
        return { saved: products.length, errors: [] };
      }
    } catch (e) {
      console.error("[db] batch save exception:", e);
      errors.push(String(e));
    }
  }

  // Fallback: in-memory store
  let saved = 0;
  for (const p of products) {
    try { store.saveProduct(p); saved++; } catch (e) { errors.push(String(e)); }
  }
  return { saved, errors };
}

// ── Settings ──────────────────────────────────────────────────────────────────

export async function dbGetSettings(): Promise<StoreSettings> {
  const t = tbl("csl_settings");
  if (t) {
    try {
      const { data, error } = await t.select("data").eq("id", 1).maybeSingle();
      if (!error && data?.data) return data.data as StoreSettings;
      if (error) console.error("[db] getSettings error:", error.message);
    } catch (e) {
      console.error("[db] getSettings exception:", e);
    }
  }
  return store.getSettings();
}

export async function dbSaveSettings(fields: Partial<StoreSettings>): Promise<StoreSettings> {
  const t = tbl("csl_settings");
  if (t) {
    try {
      // Read the CURRENT row directly. If the read fails we must NOT merge the
      // patch into mock defaults and overwrite the row — that silently wipes
      // real settings (this is how the Telegram token got erased).
      const { data, error: readErr } = await t.select("data").eq("id", 1).maybeSingle();
      if (readErr) {
        console.error("[db] saveSettings aborted — could not read current row:", readErr.message);
        throw new Error(`Settings read failed: ${readErr.message}`);
      }
      const current = (data?.data as StoreSettings) ?? store.getSettings();
      const updated: StoreSettings = { ...current, ...fields, updatedAt: new Date().toISOString() };
      const { error } = await t.upsert({ id: 1, data: updated }, { onConflict: "id" });
      if (!error) return updated;
      console.error("[db] saveSettings error:", error.message);
      throw new Error(`Settings save failed: ${error.message}`);
    } catch (e) {
      // Surface the failure to the caller instead of silently writing to the
      // in-memory mock (which would report success but persist nothing)
      throw e instanceof Error ? e : new Error(String(e));
    }
  }
  return store.saveSettings(fields);
}

export async function dbGetDriverPushSubs(): Promise<Record<string, unknown>> {
  const settings = await dbGetSettings();
  return (settings as any).driverPushSubs ?? {};
}

export async function dbSaveDriverPushSub(driverId: string, sub: unknown): Promise<void> {
  const current = await dbGetSettings();
  const subs = { ...((current as any).driverPushSubs ?? {}), [driverId]: sub };
  await dbSaveSettings({ driverPushSubs: subs } as any);
}

export async function dbDeleteDriverPushSub(driverId: string): Promise<void> {
  const current = await dbGetSettings();
  const subs = { ...((current as any).driverPushSubs ?? {}) };
  delete subs[driverId];
  await dbSaveSettings({ driverPushSubs: subs } as any);
}

export async function dbResetSettings(): Promise<StoreSettings> {
  const t = tbl("csl_settings");
  if (t) {
    try { await t.delete().eq("id", 1); } catch {}
  }
  return store.resetSettings();
}

// ── Coupons (stored inside csl_settings.coupons to avoid needing a separate table) ──

import type { MockCoupon } from "../app/api/_mock/store";

async function dbLoadCouponMap(): Promise<Record<string, MockCoupon>> {
  const settings = await dbGetSettings();
  if (settings.coupons) return settings.coupons;
  // First time: seed defaults from mock store into Supabase
  const defaults: Record<string, MockCoupon> = {};
  store.getAllCoupons().forEach(c => { defaults[c.id] = c; });
  await dbSaveSettings({ coupons: defaults });
  return defaults;
}

export async function dbGetAllCoupons(): Promise<MockCoupon[]> {
  const map = await dbLoadCouponMap();
  return Object.values(map).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function dbGetCouponByCode(code: string): Promise<MockCoupon | undefined> {
  const map = await dbLoadCouponMap();
  return Object.values(map).find(c => c.code.toUpperCase() === code.toUpperCase());
}

export async function dbSaveCoupon(coupon: MockCoupon): Promise<MockCoupon> {
  const map = await dbLoadCouponMap();
  map[coupon.id] = coupon;
  await dbSaveSettings({ coupons: map });
  return coupon;
}

export async function dbDeleteCoupon(id: string): Promise<boolean> {
  const map = await dbLoadCouponMap();
  if (!map[id]) return false;
  delete map[id];
  await dbSaveSettings({ coupons: map });
  return true;
}

// ── Gift Cards (stored in csl_settings under giftCards key) ─────────────────

export interface GiftCard {
  code: string;
  originalAmount: number;
  remainingBalance: number;
  recipientEmail: string;
  senderName: string;
  message: string;
  status: "active" | "redeemed" | "partial";
  issuedAt: string;
  source?: "customer_purchase" | "admin_issued";
  buyerEmail?: string; // who paid (customer purchases only)
  design?: string; // selected card design id (see GiftCardStore DESIGNS)
}

async function dbLoadGiftCardMap(): Promise<Record<string, GiftCard>> {
  const settings = await dbGetSettings();
  return (settings as any).giftCards ?? {};
}

export async function dbGetGiftCard(code: string): Promise<GiftCard | null> {
  const map = await dbLoadGiftCardMap();
  return map[code.toUpperCase()] ?? null;
}

export async function dbSaveGiftCard(card: GiftCard): Promise<void> {
  const map = await dbLoadGiftCardMap();
  map[card.code.toUpperCase()] = card;
  await dbSaveSettings({ giftCards: map } as any);
}

// ── Flash Deals (stored in csl_settings row id=1 under flashDeals key) ───────

import type { MockFlashDeal } from "../app/api/_mock/store";

async function dbLoadFlashDealMap(): Promise<Record<string, MockFlashDeal>> {
  const t = tbl("csl_settings");
  if (t) {
    try {
      const { data, error } = await t.select("data").eq("id", 1).maybeSingle();
      if (!error && data?.data?.flashDeals) return data.data.flashDeals as Record<string, MockFlashDeal>;
      if (error) console.error("[db] loadFlashDeals error:", error.message);
    } catch (e) {
      console.error("[db] loadFlashDeals exception:", e);
    }
  }
  return {};
}

async function dbSaveFlashDealMap(map: Record<string, MockFlashDeal>): Promise<void> {
  const t = tbl("csl_settings");
  if (!t) return;
  try {
    // Read current row, patch flashDeals field, write back
    const { data } = await t.select("data").eq("id", 1).maybeSingle();
    const current = (data?.data ?? {}) as Record<string, unknown>;
    const updated = { ...current, flashDeals: map };
    const { error } = await t.upsert({ id: 1, data: updated }, { onConflict: "id" });
    if (error) console.error("[db] saveFlashDeals error:", error.message);
  } catch (e) {
    console.error("[db] saveFlashDeals exception:", e);
  }
}

export async function dbGetAllFlashDeals(): Promise<MockFlashDeal[]> {
  const map = await dbLoadFlashDealMap();
  // Explicit sortOrder first; legacy deals without one fall back to newest-first
  return Object.values(map).sort(
    (a, b) =>
      (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER) ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function dbReorderFlashDeals(orderedIds: string[]): Promise<void> {
  const map = await dbLoadFlashDealMap();
  orderedIds.forEach((id, i) => { if (map[id]) map[id].sortOrder = i; });
  await dbSaveFlashDealMap(map);
}

export async function dbGetActiveFlashDeals(): Promise<MockFlashDeal[]> {
  const all = await dbGetAllFlashDeals();
  const now = new Date();
  return all.filter(d => {
    if (!d.active) return false;
    if (d.startAt && new Date(d.startAt) > now) return false;
    if (d.endsAt && new Date(d.endsAt) < now) return false;
    return true;
  });
}

export async function dbSaveFlashDeal(deal: MockFlashDeal): Promise<MockFlashDeal> {
  const map = await dbLoadFlashDealMap();
  map[deal.id] = deal;
  await dbSaveFlashDealMap(map);
  return deal;
}

export async function dbDeleteFlashDeal(id: string): Promise<boolean> {
  const map = await dbLoadFlashDealMap();
  if (!map[id]) return false;
  delete map[id];
  await dbSaveFlashDealMap(map);
  return true;
}

// ── Banners (stored in csl_settings row id=1 under heroBanners key) ─────────

export interface HeroBanner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  ctaText: string;
  ctaLink: string;
  linkType: "url" | "flash-deals" | "bundle-deals" | "new" | "hard-to-find" | "category" | "product";
  linkValue: string;
  active: boolean;
  startDate: string | null;
  endDate: string | null;
  sortOrder: number;
  bgColor: string;
  createdAt: string;
}

async function dbLoadBannerMap(): Promise<Record<string, HeroBanner>> {
  const t = tbl("csl_settings");
  if (t) {
    try {
      const { data, error } = await t.select("data").eq("id", 1).maybeSingle();
      if (!error && data?.data?.heroBanners) return data.data.heroBanners as Record<string, HeroBanner>;
      if (error) console.error("[db] loadBanners error:", error.message);
    } catch (e) {
      console.error("[db] loadBanners exception:", e);
    }
  }
  return {};
}

async function dbSaveBannerMap(map: Record<string, HeroBanner>): Promise<void> {
  const t = tbl("csl_settings");
  if (!t) return;
  try {
    const { data } = await t.select("data").eq("id", 1).maybeSingle();
    const current = (data?.data ?? {}) as Record<string, unknown>;
    const updated = { ...current, heroBanners: map };
    const { error } = await t.upsert({ id: 1, data: updated }, { onConflict: "id" });
    if (error) console.error("[db] saveBanners error:", error.message);
  } catch (e) {
    console.error("[db] saveBanners exception:", e);
  }
}

export async function dbGetAllBanners(): Promise<HeroBanner[]> {
  const map = await dbLoadBannerMap();
  return Object.values(map).sort((a, b) => a.sortOrder - b.sortOrder || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function dbGetActiveBanners(): Promise<HeroBanner[]> {
  const all = await dbGetAllBanners();
  const todayStr = new Date().toISOString().slice(0, 10); // "2026-06-27"
  return all.filter(b => {
    if (!b.active) return false;
    // Compare by date string only — avoids timezone UTC shift issues
    if (b.startDate && b.startDate.slice(0, 10) > todayStr) return false;
    if (b.endDate && b.endDate.slice(0, 10) < todayStr) return false;
    return true;
  });
}

export async function dbSaveBanner(banner: HeroBanner): Promise<HeroBanner> {
  const map = await dbLoadBannerMap();
  map[banner.id] = banner;
  await dbSaveBannerMap(map);
  return banner;
}

export async function dbDeleteBanner(id: string): Promise<boolean> {
  const map = await dbLoadBannerMap();
  if (!map[id]) return false;
  delete map[id];
  await dbSaveBannerMap(map);
  return true;
}

export async function dbReorderBanners(orderedIds: string[]): Promise<void> {
  const map = await dbLoadBannerMap();
  orderedIds.forEach((id, i) => { if (map[id]) map[id].sortOrder = i; });
  await dbSaveBannerMap(map);
}

// ── Categories (stored in csl_settings id=1 under "categories" key) ──────────

export interface Category {
  id: string;       // e.g. "cat_whiskey"
  value: string;    // e.g. "whiskey" — matches product.category string
  label: string;    // e.g. "Whiskey"
  emoji: string;    // e.g. "🥃"
  sortOrder: number;
  active: boolean;
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: "cat_whiskey",   value: "whiskey",   label: "Whiskey",      emoji: "🥃", sortOrder: 1,  active: true },
  { id: "cat_scotch",    value: "scotch",    label: "Scotch",       emoji: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", sortOrder: 2,  active: true },
  { id: "cat_vodka",     value: "vodka",     label: "Vodka",        emoji: "🍸", sortOrder: 3,  active: true },
  { id: "cat_tequila",   value: "tequila",   label: "Tequila",      emoji: "🌵", sortOrder: 4,  active: true },
  { id: "cat_rum",       value: "rum",       label: "Rum",          emoji: "🍹", sortOrder: 5,  active: true },
  { id: "cat_gin",       value: "gin",       label: "Gin",          emoji: "🌿", sortOrder: 6,  active: true },
  { id: "cat_wine",      value: "wine",      label: "Wine",         emoji: "🍷", sortOrder: 7,  active: true },
  { id: "cat_champagne", value: "champagne", label: "Champagne",    emoji: "🍾", sortOrder: 8,  active: true },
  { id: "cat_beer",      value: "beer",      label: "Beer",         emoji: "🍺", sortOrder: 9,  active: true },
  { id: "cat_cognac",    value: "cognac",    label: "Cognac",       emoji: "🥂", sortOrder: 10, active: true },
  { id: "cat_rtd",       value: "rtd",       label: "RTD",          emoji: "🧃", sortOrder: 11, active: true },
  { id: "cat_mixer",     value: "mixer",     label: "Mixer",        emoji: "🥤", sortOrder: 12, active: true },
  { id: "cat_liqueur",   value: "liqueur",   label: "Liqueur",      emoji: "🌸", sortOrder: 13, active: true },
  { id: "cat_rare",      value: "rare",      label: "Hard to Find", emoji: "💎", sortOrder: 14, active: true },
  { id: "cat_other",     value: "other",     label: "Other",        emoji: "📦", sortOrder: 15, active: true },
];

async function dbLoadCategories(): Promise<Category[]> {
  const t = tbl("csl_settings");
  if (t) {
    try {
      const { data, error } = await t.select("data").eq("id", 1).maybeSingle();
      if (!error && data?.data?.categories !== undefined) return data.data.categories as Category[];
      if (!error) {
        // First run — seed defaults
        const current = (data?.data ?? {}) as Record<string, unknown>;
        await t.upsert({ id: 1, data: { ...current, categories: DEFAULT_CATEGORIES } }, { onConflict: "id" });
        return DEFAULT_CATEGORIES;
      }
    } catch (e) { console.error("[db] loadCategories exception:", e); }
  }
  return DEFAULT_CATEGORIES;
}

async function dbSaveCategoriesList(cats: Category[]): Promise<void> {
  const t = tbl("csl_settings");
  if (!t) return;
  try {
    const { data } = await t.select("data").eq("id", 1).maybeSingle();
    const current = (data?.data ?? {}) as Record<string, unknown>;
    const { error } = await t.upsert({ id: 1, data: { ...current, categories: cats } }, { onConflict: "id" });
    if (error) console.error("[db] saveCategories error:", error.message);
  } catch (e) { console.error("[db] saveCategories exception:", e); }
}

export async function dbGetAllCategories(): Promise<Category[]> {
  return dbLoadCategories();
}

export async function dbGetActiveCategories(): Promise<Category[]> {
  return (await dbLoadCategories()).filter(c => c.active).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function dbCreateCategory(fields: Omit<Category, "id">): Promise<Category> {
  const cats = await dbLoadCategories();
  const cat: Category = { id: `cat_${Date.now()}`, ...fields };
  cats.push(cat);
  cats.sort((a, b) => a.sortOrder - b.sortOrder);
  await dbSaveCategoriesList(cats);
  return cat;
}

export async function dbUpdateCategory(id: string, fields: Partial<Omit<Category, "id">>): Promise<Category | undefined> {
  const cats = await dbLoadCategories();
  const idx = cats.findIndex(c => c.id === id);
  if (idx === -1) return undefined;
  cats[idx] = { ...cats[idx], ...fields };
  await dbSaveCategoriesList(cats);
  return cats[idx];
}

export async function dbDeleteCategory(id: string): Promise<boolean> {
  const cats = await dbLoadCategories();
  const idx = cats.findIndex(c => c.id === id);
  if (idx === -1) return false;
  cats.splice(idx, 1);
  await dbSaveCategoriesList(cats);
  return true;
}

export async function dbReorderCategories(orderedIds: string[]): Promise<void> {
  const cats = await dbLoadCategories();
  orderedIds.forEach((id, i) => {
    const c = cats.find(x => x.id === id);
    if (c) c.sortOrder = i;
  });
  await dbSaveCategoriesList(cats);
}

// ── Supabase REST fetch helpers (bypass JS client — guaranteed to work) ────────

import type { MockUser } from "../app/api/_mock/store";
import type { MockOrder } from "../app/api/_mock/store";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

async function supaGet(table: string, query: string): Promise<any[]> {
  if (!SUPA_URL || !SUPA_KEY) return [];
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/${table}?${query}&select=data`, {
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

async function supaUpsert(table: string, row: Record<string, unknown>): Promise<boolean> {
  if (!SUPA_URL || !SUPA_KEY) return false;
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${SUPA_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(row),
    });
    return res.ok;
  } catch { return false; }
}

async function supaUpdate(table: string, id: string, data: unknown): Promise<boolean> {
  if (!SUPA_URL || !SUPA_KEY) return false;
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${SUPA_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data }),
    });
    return res.ok;
  } catch { return false; }
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function dbGetUserByEmail(email: string): Promise<MockUser | undefined> {
  const rows = await supaGet("csl_users", `data->>email=eq.${encodeURIComponent(email)}`);
  if (rows.length > 0) return rows[0].data as MockUser;
  return store.getUserByEmail(email);
}

export async function dbGetUserById(id: string): Promise<MockUser | undefined> {
  const rows = await supaGet("csl_users", `id=eq.${encodeURIComponent(id)}`);
  if (rows.length > 0) return rows[0].data as MockUser;
  return store.getUserById(id);
}

/** Normalize any US phone variant to 10 digits: strips non-digits, removes leading "1" */
function to10Digits(phone: string): string {
  const d = phone.replace(/\D/g, "");
  return d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
}

export async function dbGetUserByPhone(phone: string): Promise<MockUser | undefined> {
  const clean10 = to10Digits(phone);
  if (!clean10 || clean10.length !== 10) return undefined;

  // Fetch all users and filter client-side — Supabase JSONB substring match is unreliable
  // across different stored formats (raw digits vs formatted vs E.164)
  const rows = await supaGet("csl_users", "order=id.asc&limit=1000");
  const match = (rows as any[]).find((r) => {
    const stored = to10Digits(r.data?.phone ?? "");
    return stored === clean10;
  });
  if (match) return match.data as MockUser;
  return store.getUserByPhone(phone);
}

export async function dbGetUserByGoogleId(googleId: string): Promise<MockUser | undefined> {
  const rows = await supaGet("csl_users", `data->>googleId=eq.${encodeURIComponent(googleId)}`);
  if (rows.length > 0) return rows[0].data as MockUser;
  return store.getUserByGoogleId?.(googleId);
}

export async function dbCreateUser(user: MockUser): Promise<void> {
  const ok = await supaUpsert("csl_users", { id: user.id, data: user });
  if (!ok) console.error("[db] dbCreateUser failed for", user.email);
}

export async function dbSaveUser(user: MockUser): Promise<void> {
  const ok = await supaUpsert("csl_users", { id: user.id, data: user });
  if (!ok) console.error("[db] dbSaveUser failed for", user.id);
}

export async function dbGetUserByResetToken(token: string): Promise<MockUser | undefined> {
  const rows = await supaGet("csl_users", "order=id.asc&limit=5000");
  const match = rows.find((r: any) => r.data?.resetToken === token);
  return match ? (match.data as MockUser) : undefined;
}

// ── Orders ────────────────────────────────────────────────────────────────────

export async function dbGetOrder(id: string): Promise<MockOrder | undefined> {
  const rows = await supaGet("csl_orders", `id=eq.${encodeURIComponent(id)}`);
  if (rows.length > 0) return rows[0].data as MockOrder;
  return store.getOrder(id);
}

export async function dbGetAllOrders(): Promise<MockOrder[]> {
  if (!SUPA_URL || !SUPA_KEY) return store.getAllOrders();
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/csl_orders?select=data&order=created_at.desc`, {
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
      cache: "no-store",
    });
    if (!res.ok) return store.getAllOrders();
    const rows = await res.json();
    if (rows.length > 0) return rows.map((r: any) => r.data as MockOrder);
  } catch {}
  return store.getAllOrders();
}

export async function dbGetOrdersByCustomer(customerId: string): Promise<MockOrder[]> {
  const rows = await supaGet("csl_orders", `data->>customerId=eq.${encodeURIComponent(customerId)}&order=created_at.desc`);
  if (rows.length > 0) return rows.map((r: any) => r.data as MockOrder);
  return store.getAllOrders().filter((o: MockOrder) => o.customerId === customerId);
}

export async function dbCreateOrder(order: MockOrder): Promise<void> {
  const ok = await supaUpsert("csl_orders", { id: order.id, data: order });
  if (!ok) console.error("[db] dbCreateOrder failed for", order.id);
}

export async function dbUpdateOrder(id: string, patch: Partial<MockOrder>): Promise<MockOrder | null> {
  const existing = await dbGetOrder(id);
  if (!existing) return null;
  const updated: MockOrder = { ...existing, ...patch, updatedAt: new Date().toISOString() };
  const ok = await supaUpdate("csl_orders", id, updated);
  if (!ok) console.error("[db] dbUpdateOrder failed for", id);
  return updated;
}

// ── Drivers (stored in csl_settings id=1 under "drivers" key) ─────────────────

import type { MockDriver } from "../app/api/_mock/store";

function getDefaultDriverMap(): Record<string, MockDriver> {
  const seeds = [
    { id: "d1", name: "Marcus T.", phone: "5124441001", email: "marcus@csl.com", username: "marcus", pin: "1234", lat: null, lng: null, totalDeliveries: 0, totalEarnings: 0, rating: 5.0, isOnline: false },
    { id: "d2", name: "Sarah J.",  phone: "5124441002", email: "sarah@csl.com",  username: "sarah",  pin: "5678", lat: null, lng: null, totalDeliveries: 0, totalEarnings: 0, rating: 5.0, isOnline: false },
    { id: "d3", name: "James R.",  phone: "5124441003", email: "james@csl.com",  username: "james",  pin: "9012", lat: null, lng: null, totalDeliveries: 0, totalEarnings: 0, rating: 5.0, isOnline: false },
  ];
  const map: Record<string, MockDriver> = {};
  for (const s of seeds) {
    map[s.id] = { ...s, active: true, passwordHash: Buffer.from(s.pin).toString("base64"), locationUpdatedAt: null, currentOrderId: null, createdAt: new Date("2024-01-01").toISOString() };
  }
  return map;
}

async function dbLoadDriverMap(): Promise<Record<string, MockDriver>> {
  const t = tbl("csl_settings");
  if (t) {
    try {
      const { data, error } = await t.select("data").eq("id", 1).maybeSingle();
      if (!error && data?.data?.drivers !== undefined) return data.data.drivers as Record<string, MockDriver>;
      // Supabase connected but no drivers key yet — seed defaults into Supabase now
      if (!error) {
        const defaults = getDefaultDriverMap();
        const current = (data?.data ?? {}) as Record<string, unknown>;
        await t.upsert({ id: 1, data: { ...current, drivers: defaults } }, { onConflict: "id" });
        return defaults;
      }
    } catch (e) { console.error("[db] loadDrivers exception:", e); }
  }
  return getDefaultDriverMap();
}

async function dbSaveDriverMap(map: Record<string, MockDriver>): Promise<void> {
  const t = tbl("csl_settings");
  if (!t) return;
  try {
    const { data } = await t.select("data").eq("id", 1).maybeSingle();
    const current = (data?.data ?? {}) as Record<string, unknown>;
    const { error } = await t.upsert({ id: 1, data: { ...current, drivers: map } }, { onConflict: "id" });
    if (error) console.error("[db] saveDriverMap error:", error.message);
  } catch (e) { console.error("[db] saveDriverMap exception:", e); }
}

export async function dbGetAllDrivers(): Promise<MockDriver[]> {
  return Object.values(await dbLoadDriverMap());
}

export async function dbGetDriver(id: string): Promise<MockDriver | undefined> {
  return (await dbLoadDriverMap())[id];
}

export async function dbGetDriverByUsername(username: string): Promise<MockDriver | undefined> {
  const map = await dbLoadDriverMap();
  return Object.values(map).find(d => d.username.toLowerCase() === username.toLowerCase());
}

export async function dbSaveDriver(driver: MockDriver): Promise<MockDriver> {
  const map = await dbLoadDriverMap();
  map[driver.id] = driver;
  await dbSaveDriverMap(map);
  return driver;
}

export async function dbDeleteDriver(id: string): Promise<boolean> {
  const map = await dbLoadDriverMap();
  if (!map[id]) return false;
  delete map[id];
  await dbSaveDriverMap(map);
  return true;
}

export async function dbValidateDriverPin(username: string, pin: string): Promise<MockDriver | undefined> {
  const driver = await dbGetDriverByUsername(username);
  return driver && driver.pin === pin ? driver : undefined;
}

// ── Bundle Tiers (stored in csl_settings id=1 under "bundleTiers" key) ─────────

import type { MockBundleTier } from "../app/api/_mock/store";

function getDefaultBundleTiers(): MockBundleTier[] {
  return [
    { id: "bt1", minQty: 2, discountPct: 5,  label: "Buy 2+ bottles — Save 5%",  active: true, sortOrder: 1 },
    { id: "bt2", minQty: 3, discountPct: 10, label: "Buy 3+ bottles — Save 10%", active: true, sortOrder: 2 },
    { id: "bt3", minQty: 6, discountPct: 15, label: "Buy 6+ bottles — Save 15%", active: true, sortOrder: 3 },
  ];
}

async function dbLoadBundleTiers(): Promise<MockBundleTier[]> {
  const t = tbl("csl_settings");
  if (t) {
    try {
      const { data, error } = await t.select("data").eq("id", 1).maybeSingle();
      if (!error && data?.data?.bundleTiers !== undefined) return data.data.bundleTiers as MockBundleTier[];
      if (!error) {
        const defaults = getDefaultBundleTiers();
        const current = (data?.data ?? {}) as Record<string, unknown>;
        await t.upsert({ id: 1, data: { ...current, bundleTiers: defaults } }, { onConflict: "id" });
        return defaults;
      }
    } catch (e) { console.error("[db] loadBundleTiers exception:", e); }
  }
  return store.getAllBundleTiers();
}

async function dbSaveBundleTiers(tiers: MockBundleTier[]): Promise<void> {
  const t = tbl("csl_settings");
  if (!t) return;
  try {
    const { data } = await t.select("data").eq("id", 1).maybeSingle();
    const current = (data?.data ?? {}) as Record<string, unknown>;
    const { error } = await t.upsert({ id: 1, data: { ...current, bundleTiers: tiers } }, { onConflict: "id" });
    if (error) console.error("[db] saveBundleTiers error:", error.message);
  } catch (e) { console.error("[db] saveBundleTiers exception:", e); }
}

export async function dbGetAllBundleTiers(): Promise<MockBundleTier[]> {
  return dbLoadBundleTiers();
}

export async function dbGetActiveBundleTiers(): Promise<MockBundleTier[]> {
  return (await dbLoadBundleTiers()).filter(t => t.active);
}

export async function dbCreateBundleTier(fields: Omit<MockBundleTier, "id">): Promise<MockBundleTier> {
  const tiers = await dbLoadBundleTiers();
  const tier: MockBundleTier = { id: `bt${Date.now()}`, ...fields };
  tiers.push(tier);
  await dbSaveBundleTiers(tiers);
  return tier;
}

export async function dbUpdateBundleTier(id: string, fields: Partial<MockBundleTier>): Promise<MockBundleTier | undefined> {
  const tiers = await dbLoadBundleTiers();
  const idx = tiers.findIndex(t => t.id === id);
  if (idx === -1) return undefined;
  tiers[idx] = { ...tiers[idx], ...fields };
  await dbSaveBundleTiers(tiers);
  return tiers[idx];
}

export async function dbDeleteBundleTier(id: string): Promise<boolean> {
  const tiers = await dbLoadBundleTiers();
  const idx = tiers.findIndex(t => t.id === id);
  if (idx === -1) return false;
  tiers.splice(idx, 1);
  await dbSaveBundleTiers(tiers);
  return true;
}
