import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
// Service role key bypasses RLS — preferred for server routes.
// Falls back to anon key (needs permissive RLS policies on csl_products / csl_settings).
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

let _client: ReturnType<typeof createClient> | null = null;

export function supabaseServer() {
  if (!URL || !KEY) return null;
  if (!_client) _client = createClient(URL, KEY, { auth: { persistSession: false } });
  return _client;
}
