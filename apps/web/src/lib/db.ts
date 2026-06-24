/**
 * Persistent DB layer for products + settings.
 * Tries Supabase first; falls back to mock store if not configured or on error.
 *
 * SUPABASE SETUP — run once in Supabase SQL Editor:
 * ─────────────────────────────────────────────────
 * create table if not exists csl_products (
 *   id text primary key,
 *   data jsonb not null,
 *   updated_at timestamptz default now()
 * );
 * alter table csl_products enable row level security;
 * create policy "allow_all" on csl_products for all using (true) with check (true);
 *
 * create table if not exists csl_settings (
 *   id integer primary key default 1,
 *   data jsonb not null default '{}',
 *   updated_at timestamptz default now()
 * );
 * alter table csl_settings enable row level security;
 * create policy "allow_all" on csl_settings for all using (true) with check (true);
 * ─────────────────────────────────────────────────
 */

import { supabaseServer } from "./supabase.server";
import { store, type MockProduct, type StoreSettings } from "../app/api/_mock/store";

// ── Products ──────────────────────────────────────────────────────────────────

export async function dbGetAllProducts(): Promise<MockProduct[]> {
  const sb = supabaseServer();
  if (sb) {
    try {
      const { data, error } = await sb
        .from("csl_products")
        .select("data")
        .order("updated_at", { ascending: false });
      if (!error && data && data.length >= 0) {
        return (data as Array<{ data: unknown }>).map((r) => r.data as MockProduct);
      }
    } catch {
      // Supabase not reachable — fall through to mock
    }
  }
  return store.getAllProducts();
}

export async function dbGetProduct(idOrSlug: string): Promise<MockProduct | undefined> {
  const all = await dbGetAllProducts();
  return all.find((p) => p.id === idOrSlug || p.slug === idOrSlug);
}

export async function dbSaveProduct(product: MockProduct): Promise<void> {
  const sb = supabaseServer();
  if (sb) {
    try {
      const { error } = await sb.from("csl_products").upsert(
        { id: product.id, data: product, updated_at: new Date().toISOString() },
        { onConflict: "id" }
      );
      if (!error) return;
      console.error("[db] Supabase upsert product error:", error.message);
    } catch (e) {
      console.error("[db] Supabase save product exception:", e);
    }
  }
  store.saveProduct(product);
}

export async function dbDeleteProduct(id: string): Promise<boolean> {
  const sb = supabaseServer();
  if (sb) {
    try {
      const { error } = await sb.from("csl_products").delete().eq("id", id);
      if (!error) return true;
      console.error("[db] Supabase delete product error:", error.message);
    } catch (e) {
      console.error("[db] Supabase delete product exception:", e);
    }
  }
  return store.deleteProduct(id);
}

export async function dbSaveManyProducts(products: MockProduct[]): Promise<{ saved: number; errors: string[] }> {
  const sb = supabaseServer();
  const errors: string[] = [];

  if (sb) {
    try {
      const rows = products.map((p) => ({
        id: p.id,
        data: p,
        updated_at: new Date().toISOString(),
      }));
      // Batch upsert in chunks of 200 to avoid payload limits
      for (let i = 0; i < rows.length; i += 200) {
        const chunk = rows.slice(i, i + 200);
        const { error } = await sb
          .from("csl_products")
          .upsert(chunk, { onConflict: "id" });
        if (error) {
          console.error("[db] Supabase batch upsert error:", error.message);
          errors.push(error.message);
        }
      }
      if (errors.length === 0) return { saved: products.length, errors: [] };
    } catch (e) {
      console.error("[db] Supabase batch save exception:", e);
      errors.push(String(e));
    }
  }

  // Fallback: save one by one to mock store
  let saved = 0;
  for (const p of products) {
    try { store.saveProduct(p); saved++; } catch (e) { errors.push(String(e)); }
  }
  return { saved, errors };
}

// ── Settings ──────────────────────────────────────────────────────────────────

export async function dbGetSettings(): Promise<StoreSettings> {
  const sb = supabaseServer();
  if (sb) {
    try {
      const { data, error } = await sb
        .from("csl_settings")
        .select("data")
        .eq("id", 1)
        .maybeSingle();
      const row = data as { data: unknown } | null;
      if (!error && row?.data) return row.data as StoreSettings;
    } catch (e) {
      console.error("[db] Supabase get settings exception:", e);
    }
  }
  return store.getSettings();
}

export async function dbSaveSettings(fields: Partial<StoreSettings>): Promise<StoreSettings> {
  const current = await dbGetSettings();
  const updated: StoreSettings = { ...current, ...fields, updatedAt: new Date().toISOString() };

  const sb = supabaseServer();
  if (sb) {
    try {
      const { error } = await sb.from("csl_settings").upsert(
        { id: 1, data: updated, updated_at: new Date().toISOString() },
        { onConflict: "id" }
      );
      if (!error) return updated;
      console.error("[db] Supabase save settings error:", error.message);
    } catch (e) {
      console.error("[db] Supabase save settings exception:", e);
    }
  }
  return store.saveSettings(fields);
}

export async function dbResetSettings(): Promise<StoreSettings> {
  const sb = supabaseServer();
  if (sb) {
    try {
      await sb.from("csl_settings").delete().eq("id", 1);
    } catch {}
  }
  return store.resetSettings();
}
