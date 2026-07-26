import { NextResponse } from "next/server";
import { dbGetVaultFeed } from "@/lib/db";

// Stock must never lag the register — always read fresh (same as deals/flash).
export const dynamic = "force-dynamic";

/**
 * Public storefront feed for the Rare Whiskey Vault.
 * Shape matches the RareWhiskeyVault component contract:
 *   { settings: { enabled, lightFx, hideSoldOut }, products: [...] }
 * page.tsx calls dbGetVaultFeed() directly for the SSR first paint; this
 * route re-runs the same query for client-side revalidation (react-query).
 */
export async function GET() {
  try {
    return NextResponse.json(await dbGetVaultFeed());
  } catch (e) {
    console.error("[api/vault] error:", e);
    return NextResponse.json({ settings: { enabled: false, lightFx: true, hideSoldOut: false }, products: [] });
  }
}
