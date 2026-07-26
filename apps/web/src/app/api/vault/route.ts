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
        // Two display lines: bold brand line + small variant line. Catalog rows
        // often have an empty brand field and names like "Eagle Rare, 750mL",
        // so fall back to splitting the trailing volume off the name.
        let brand = p.brand?.trim() || "";
        let variant = "";
        if (brand && p.name.toLowerCase().startsWith(brand.toLowerCase())) {
          variant = p.name.slice(brand.length).replace(/^[\s,–—-]+/, "").trim();
        } else if (!brand) {
          const m = p.name.match(/^(.*?)[,\s]+([\d.]+\s*m?L)\s*$/i);
          if (m) {
            brand = m[1].trim();
            variant = m[2].trim();
          } else {
            brand = p.name;
          }
        } else {
          variant = p.name;
        }
        if (!variant) variant = p.volume || "";

        return {
          id: p.id,
          handle: p.slug,
          brand,
          variant,
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
