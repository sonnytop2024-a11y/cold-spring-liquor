import { requireAdminAuth } from "@/lib/adminAuth";
import { NextRequest, NextResponse } from "next/server";
import { dbGetAllProducts, dbSaveManyProducts } from "@/lib/db";
import type { MockProduct } from "../../../_mock/store";

const VALID_CATEGORIES = [
  "whiskey", "tequila", "vodka", "rum", "gin", "wine", "beer",
  "champagne", "cognac", "rtd", "liqueur", "other",
];

// Maps common CSV category names → canonical category
const CATEGORY_ALIAS: Record<string, string> = {
  // Whiskey variants
  "whisky": "whiskey", "bourbon": "whiskey", "scotch": "whiskey",
  "irish whiskey": "whiskey", "irish whisky": "whiskey", "rye": "whiskey",
  "tennessee whiskey": "whiskey", "tennessee whisky": "whiskey",
  "blended whiskey": "whiskey", "single malt": "whiskey",
  "canadian whisky": "whiskey", "japanese whisky": "whiskey",
  // Wine variants
  "red wine": "wine", "white wine": "wine", "rosé": "wine", "rose": "wine",
  "sparkling wine": "wine", "dessert wine": "wine", "port": "wine",
  "merlot": "wine", "cabernet": "wine", "chardonnay": "wine",
  "pinot": "wine", "sauvignon": "wine", "prosecco": "wine",
  // Beer variants
  "craft beer": "beer", "ipa": "beer", "lager": "beer", "ale": "beer",
  "stout": "beer", "porter": "beer", "hard seltzer": "beer", "seltzer": "beer",
  "cider": "beer", "malt beverage": "beer",
  // RTD / Ready-to-drink
  "ready to drink": "rtd", "ready-to-drink": "rtd", "cocktail": "rtd",
  "premixed": "rtd", "hard lemonade": "rtd", "hard tea": "rtd",
  "cooler": "rtd",
  // Champagne
  "sparkling": "champagne",
  // Cognac
  "brandy": "cognac", "armagnac": "cognac",
  // Liqueur
  "cordial": "liqueur", "schnapps": "liqueur", "amaretto": "liqueur",
  "triple sec": "liqueur", "kahlua": "liqueur", "baileys": "liqueur",
  "cream liqueur": "liqueur",
  // Spirits (generic → other)
  "spirits": "other", "spirit": "other", "misc": "other", "miscellaneous": "other",
};

function normalizeCategory(raw: string | undefined): string {
  if (!raw) return "other";
  const lower = raw.toLowerCase().trim();
  if (VALID_CATEGORIES.includes(lower)) return lower;
  if (CATEGORY_ALIAS[lower]) return CATEGORY_ALIAS[lower];
  // Partial match: if raw contains a known category keyword
  for (const cat of VALID_CATEGORIES) {
    if (lower.includes(cat)) return cat;
  }
  return "other";
}

function colKey(s: string) {
  return s.toLowerCase().replace(/[\s_\-().]/g, "");
}

function pick(row: Record<string, unknown>, ...candidates: string[]): string | undefined {
  for (const name of candidates) {
    const key = Object.keys(row).find((k) => colKey(k) === colKey(name));
    if (key !== undefined && row[key] !== undefined && String(row[key]).trim() !== "") {
      return String(row[key]).trim();
    }
  }
  return undefined;
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

interface ImportError { row: number; message: string; name?: string }

interface PreviewProduct extends MockProduct {}

interface PreviewUpdated {
  product: PreviewProduct;
  original: PreviewProduct;
  changes: string[];
}

export async function POST(req: NextRequest) {
  const authErr = requireAdminAuth(req); if (authErr) return authErr;
  const body = await req.json() as { rows: Record<string, unknown>[]; confirm?: boolean };
  const { rows, confirm = false } = body;

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }

  console.log(`[import] Processing ${rows.length} rows, confirm=${confirm}`);

  // Load existing products for dedup
  const existing = await dbGetAllProducts();
  const byId = new Map(existing.map((p) => [p.id.toLowerCase(), p]));
  const byName = new Map(
    existing.map((p) => [`${p.name.toLowerCase()}|||${(p.brand ?? "").toLowerCase()}`, p])
  );

  const newProducts: PreviewProduct[] = [];
  const updatedProducts: PreviewUpdated[] = [];
  const errors: ImportError[] = [];

  rows.forEach((raw, i) => {
    const rowNum = i + 2; // 1-based + header row

    const sku         = pick(raw, "sku", "id", "productid", "product_id", "item_id");
    const name        = pick(raw, "name", "productname", "product name", "title", "item", "product");
    const brand       = pick(raw, "brand", "manufacturer", "maker", "distillery", "brewery") ?? "";
    const rawCat      = pick(raw,
      "category", "type", "spirit", "spirit type", "subcategory",
      "product type", "product category", "item type", "class",
      "liquor type", "beverage type", "alcohol type",
    );
    const volume      = pick(raw, "volume", "size", "ml", "oz", "pack size") ?? "750ml";
    const rawPrice    = pick(raw, "price", "regular price", "retail price", "cost", "msrp", "unit price");
    const rawSale     = pick(raw, "sale price", "saleprice", "promo price", "promotion", "discount price", "special price");
    const rawStock    = pick(raw,
      "stock", "stock qty", "stockqty", "stock quantity", "stock_qty",
      "quantity", "qty", "qty on hand", "quantity on hand", "on hand qty",
      "inventory", "on hand", "onhand", "units", "unit count",
      "available", "available qty", "available quantity",
      "count", "total", "amount", "current stock", "current qty",
      "retail qty", "retail quantity", "in stock qty", "total qty",
    );
    const description = pick(raw, "description", "desc", "notes", "details", "product description") ?? "";
    const imageUrl    = pick(raw, "image url", "image", "photo", "img", "picture", "imageurl", "image_url") ?? null;
    const rawAbv      = pick(raw, "abv", "alcohol", "alcohol content", "proof", "alcohol%");
    const country     = pick(raw, "country", "origin", "made in", "region", "country of origin") ?? "USA";

    // ── Required: Product Name ──
    if (!name) {
      errors.push({ row: rowNum, message: "Missing required field: Product Name" });
      return;
    }

    // ── Required: Price ──
    if (!rawPrice) {
      errors.push({ row: rowNum, name, message: "Missing required field: Price" });
      return;
    }
    const price = parseFloat(String(rawPrice).replace(/[$,\s]/g, ""));
    if (isNaN(price) || price <= 0) {
      errors.push({ row: rowNum, name, message: `Invalid price: "${rawPrice}" — must be a positive number` });
      return;
    }

    // ── Optional: Sale Price — skip (don't fail) if invalid ──
    let salePrice: number | null = null;
    if (rawSale) {
      const sp = parseFloat(String(rawSale).replace(/[$,\s]/g, ""));
      if (!isNaN(sp) && sp > 0 && sp < price) salePrice = sp;
      // silently ignore if sale >= price or invalid
    }

    // ── Optional: Stock — default 0 ──
    const stockQty = rawStock ? (parseInt(String(rawStock).replace(/,/g, "")) || 0) : 0;

    // ── Optional: Category — normalize with alias map ──
    const category = normalizeCategory(rawCat);

    const abv = rawAbv ? (parseFloat(String(rawAbv).replace(/[%\s]/g, "")) || 0) : 0;

    // ── Dedup: match by SKU or name+brand ──
    let match: MockProduct | undefined;
    if (sku) match = byId.get(sku.toLowerCase());
    if (!match) match = byName.get(`${name.toLowerCase()}|||${brand.toLowerCase()}`);

    if (match) {
      const changes: string[] = [];
      if (Math.abs(match.price - price) >= 0.01) changes.push(`Price: $${match.price} → $${price}`);
      if (salePrice !== null && match.salePrice !== salePrice) changes.push(`Sale: $${match.salePrice ?? "–"} → $${salePrice}`);
      if (salePrice === null && match.salePrice !== null) changes.push("Sale price: removed");
      if (match.stockQty !== stockQty) changes.push(`Stock: ${match.stockQty} → ${stockQty}`);
      if (volume !== "750ml" && match.volume !== volume) changes.push(`Volume: ${match.volume} → ${volume}`);
      if (imageUrl && match.imageUrl !== imageUrl) changes.push("Image URL updated");
      if (description && match.description !== description) changes.push("Description updated");
      if (match.category !== category) changes.push(`Category: ${match.category} → ${category}`);

      const updated: PreviewProduct = {
        ...match,
        brand: brand || match.brand,
        price,
        salePrice,
        stockQty,
        inStock: stockQty > 0,
        active: stockQty > 0,
        volume,
        imageUrl: imageUrl ?? match.imageUrl,
        description: description || match.description,
        category,
        abv: abv || match.abv,
        country: country || match.country,
      };
      updatedProducts.push({ product: updated, original: match as PreviewProduct, changes });
    } else {
      // New product
      const id = sku ?? `p${Date.now()}${i}`;
      const slugBase = slugify(name);
      const slug = `${slugBase}-${id.slice(-6)}`;

      newProducts.push({
        id, slug,
        name: name.trim(),
        brand: brand.trim(),
        category,
        price,
        salePrice,
        volume,
        abv,
        country,
        stockQty,
        inStock: stockQty > 0,
        featured: false,
        active: stockQty > 0,
        rating: 0,
        reviewCount: 0,
        description,
        imageUrl: imageUrl ?? null,
      });
    }
  });

  if (!confirm) {
    console.log(`[import] Preview: ${newProducts.length} new, ${updatedProducts.length} updates, ${errors.length} errors`);
    return NextResponse.json({
      preview: true,
      newCount: newProducts.length,
      updateCount: updatedProducts.length,
      errorCount: errors.length,
      newProducts,
      updatedProducts,
      errors,
    });
  }

  // ── Confirm: write to DB ──────────────────────────────────────────────────
  const toSave: MockProduct[] = [
    ...newProducts,
    ...updatedProducts.map((u) => u.product),
  ];

  console.log(`[import] Saving ${toSave.length} products to DB...`);
  const { saved, errors: saveErrors } = await dbSaveManyProducts(toSave);
  console.log(`[import] Saved ${saved} products. Errors: ${saveErrors.length}`);

  return NextResponse.json({
    success: true,
    added: newProducts.length,
    updated: updatedProducts.length,
    saved,
    skipped: errors.length,
    errors: [
      ...errors,
      ...saveErrors.map((e) => ({ row: 0, message: `DB save error: ${e}` })),
    ],
  });
}
