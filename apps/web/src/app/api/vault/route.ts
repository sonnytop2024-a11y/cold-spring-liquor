import { NextResponse } from "next/server";
import { dbGetVault, dbGetProductsByIds } from "@/lib/db";

// Stock must never lag the register — always read fresh (same as deals/flash).
export const dynamic = "force-dynamic";

/**
 * Public storefront feed for the Rare Whiskey Vault.
 * Shape matches the RareWhiskeyVault component contract:
 *   { settings: { enabled, lightFx, hideSoldOut }, products: [...] }
 * The vault config stores only productId + order + visibility; every price,
 * name, stock and catalog image is joined live from csl_products here.
 */
export async function GET() {
  try {
    const vault = await dbGetVault();
    const settings = { enabled: vault.enabled, lightFx: vault.lightFx, hideSoldOut: vault.hideSoldOut };

    if (!vault.enabled || vault.items.length === 0) {
      return NextResponse.json({ settings, products: [] });
    }

    const byId = await dbGetProductsByIds(vault.items.map((i) => i.productId));

    const products = vault.items
      .map((item) => {
        const p = byId.get(item.productId);
        // Product deleted or deactivated in the catalog → drops out of the vault
        if (!p || p.active === false) return null;
        if (!item.visible) return null;
        if (vault.hideSoldOut && (p.stockQty ?? 0) <= 0) return null;
        // Display fields: full product name (volume suffix stripped) + volume.
        // Catalog names often look like "Eagle Rare, 750mL".
        let name = p.name.trim();
        let volume = (p.volume || "").trim();
        const m = name.match(/^(.*?)[,\s]+([\d.]+\s*m?L)\s*$/i);
        if (m) {
          name = m[1].trim();
          // The name suffix is what's printed on the label — it wins over the
          // volume column, which is sometimes stale (e.g. Weller 1.75L vs 750ml)
          volume = m[2].trim();
        }

        return {
          id: p.id,
          handle: p.slug,
          name,
          volume,
          price: p.salePrice ?? p.price,
          stock: p.stockQty ?? 0,
          image: item.imageUrl ?? p.imageUrl,
          // Vault uploads are pre-trimmed transparent webp; catalog fallbacks are
          // white-background squares that need client-side bg removal.
          needsBgRemoval: !item.imageUrl,
          visible: true,
          // Full product payload so the storefront can hand it to the cart store
          product: p,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ settings, products });
  } catch (e) {
    console.error("[api/vault] error:", e);
    return NextResponse.json({ settings: { enabled: false, lightFx: true, hideSoldOut: false }, products: [] });
  }
}
