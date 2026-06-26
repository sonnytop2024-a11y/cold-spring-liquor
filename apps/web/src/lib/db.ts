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
        console.log(`[db] loaded ${all.length} products from Supabase`);
        return all;
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

export async function dbSaveProduct(product: MockProduct): Promise<void> {
  const t = tbl("csl_products");
  if (t) {
    // Upsert with only id + data — no updated_at dependency
    const { error } = await t.upsert({ id: product.id, data: product }, { onConflict: "id" });
    if (!error) {
      console.log(`[db] saved product ${product.id}`);
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
      const { error: updateErr } = await t.update({ data: merged }).eq("id", id);
      if (!updateErr) {
        console.log(`[db] patched product ${id}:`, Object.keys(patch));
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
      console.log(`[db] delete id=${id}: removed ${count} row(s) from Supabase`);
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
        console.log(`[db] batch saved ${products.length} products`);
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
  const current = await dbGetSettings();
  const updated: StoreSettings = { ...current, ...fields, updatedAt: new Date().toISOString() };

  const t = tbl("csl_settings");
  if (t) {
    try {
      const { error } = await t.upsert({ id: 1, data: updated }, { onConflict: "id" });
      if (!error) return updated;
      console.error("[db] saveSettings error:", error.message);
    } catch (e) {
      console.error("[db] saveSettings exception:", e);
    }
  }
  return store.saveSettings(fields);
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
