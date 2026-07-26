import { NextRequest, NextResponse } from "next/server";
import { dbGetVault, dbSaveVault, dbGetProductsByIds, type VaultItem } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Admin view: vault config + items joined with live product data. */
export async function GET() {
  const vault = await dbGetVault();
  const byId = await dbGetProductsByIds(vault.items.map((i) => i.productId));
  const items = vault.items.map((item) => {
    const p = byId.get(item.productId);
    return {
      ...item,
      name: p?.name ?? "(product deleted)",
      brand: p?.brand ?? "",
      price: p ? p.salePrice ?? p.price : null,
      stockQty: p?.stockQty ?? 0,
      catalogImageUrl: p?.imageUrl ?? null,
      productActive: p ? p.active !== false : false,
    };
  });
  return NextResponse.json({
    enabled: vault.enabled,
    lightFx: vault.lightFx,
    hideSoldOut: vault.hideSoldOut,
    items,
  });
}

/** Mutations use the same action-body contract as /api/admin/flash-deals. */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const vault = await dbGetVault();

  switch (body.action) {
    case "settings": {
      const patch: Record<string, boolean> = {};
      for (const k of ["enabled", "lightFx", "hideSoldOut"] as const) {
        if (typeof body[k] === "boolean") patch[k] = body[k];
      }
      return NextResponse.json(await dbSaveVault(patch));
    }

    case "add": {
      const productId = String(body.productId ?? "");
      if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });
      if (vault.items.some((i) => i.productId === productId)) {
        return NextResponse.json({ error: "Product is already in the vault" }, { status: 409 });
      }
      const byId = await dbGetProductsByIds([productId]);
      if (!byId.get(productId)) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }
      const item: VaultItem = { productId, visible: true, imageUrl: null, addedAt: new Date().toISOString() };
      const saved = await dbSaveVault({ items: [...vault.items, item] });
      return NextResponse.json(saved, { status: 201 });
    }

    case "remove": {
      const items = vault.items.filter((i) => i.productId !== body.productId);
      return NextResponse.json(await dbSaveVault({ items }));
    }

    case "visible": {
      const items = vault.items.map((i) =>
        i.productId === body.productId ? { ...i, visible: body.visible !== false } : i,
      );
      return NextResponse.json(await dbSaveVault({ items }));
    }

    case "image": {
      // imageUrl: null clears the dedicated bottle photo (falls back to catalog)
      const imageUrl = typeof body.imageUrl === "string" && body.imageUrl ? body.imageUrl : null;
      const items = vault.items.map((i) =>
        i.productId === body.productId ? { ...i, imageUrl } : i,
      );
      return NextResponse.json(await dbSaveVault({ items }));
    }

    case "reorder": {
      if (!Array.isArray(body.ids)) return NextResponse.json({ error: "ids required" }, { status: 400 });
      const byProductId = new Map(vault.items.map((i) => [i.productId, i]));
      const items = (body.ids as string[]).map((id) => byProductId.get(id)).filter(Boolean) as VaultItem[];
      // Anything the client forgot keeps its place at the end instead of vanishing
      for (const i of vault.items) if (!body.ids.includes(i.productId)) items.push(i);
      return NextResponse.json(await dbSaveVault({ items }));
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
