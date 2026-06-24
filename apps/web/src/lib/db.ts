/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Persistent DB layer for products + settings.
 * Tries Supabase first; falls back to mock store if not configured or on error.
 */

import { supabaseServer } from "./supabase.server";
import { store, type MockProduct, type StoreSettings } from "../app/api/_mock/store";

// Helper: get Supabase table as `any` to bypass missing generated types
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
      const { data, error } = await t.select("data").order("updated_at", { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((r: any) => r.data as MockProduct);
      }
      // If Supabase returns empty array → fall through to mock store defaults
      if (error) console.error("[db] getAllProducts error:", error.message);
    } catch (e) {
      console.error("[db] getAllProducts exception:", e);
    }
  }
  return store.getAllProducts();
}

export async function dbGetProduct(idOrSlug: string): Promise<MockProduct | undefined> {
  const all = await dbGetAllProducts();
  return all.find((p) => p.id === idOrSlug || p.slug === idOrSlug);
}

export async function dbSaveProduct(product: MockProduct): Promise<void> {
  const t = tbl("csl_products");
  if (t) {
    try {
      const { error } = await t.upsert(
        { id: product.id, data: product, updated_at: new Date().toISOString() },
        { onConflict: "id" }
      );
      if (!error) return;
      console.error("[db] upsert product error:", error.message);
    } catch (e) {
      console.error("[db] save product exception:", e);
    }
  }
  store.saveProduct(product);
}

export async function dbDeleteProduct(id: string): Promise<boolean> {
  const t = tbl("csl_products");
  if (t) {
    try {
      const { error } = await t.delete().eq("id", id);
      if (!error) return true;
      console.error("[db] delete product error:", error.message);
    } catch (e) {
      console.error("[db] delete product exception:", e);
    }
  }
  return store.deleteProduct(id);
}

export async function dbSaveManyProducts(products: MockProduct[]): Promise<{ saved: number; errors: string[] }> {
  const t = tbl("csl_products");
  const errors: string[] = [];

  if (t) {
    try {
      const rows = products.map((p) => ({
        id: p.id,
        data: p,
        updated_at: new Date().toISOString(),
      }));
      for (let i = 0; i < rows.length; i += 200) {
        const chunk = rows.slice(i, i + 200);
        const { error } = await t.upsert(chunk, { onConflict: "id" });
        if (error) {
          console.error("[db] batch upsert error:", error.message);
          errors.push(error.message);
        }
      }
      if (errors.length === 0) return { saved: products.length, errors: [] };
    } catch (e) {
      console.error("[db] batch save exception:", e);
      errors.push(String(e));
    }
  }

  // Fallback: mock store
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
    } catch (e) {
      console.error("[db] get settings exception:", e);
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
      const { error } = await t.upsert(
        { id: 1, data: updated, updated_at: new Date().toISOString() },
        { onConflict: "id" }
      );
      if (!error) return updated;
      console.error("[db] save settings error:", error.message);
    } catch (e) {
      console.error("[db] save settings exception:", e);
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
