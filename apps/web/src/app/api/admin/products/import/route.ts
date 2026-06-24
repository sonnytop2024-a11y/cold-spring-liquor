import { NextRequest, NextResponse } from "next/server";
import { store } from "../../../_mock/store";
import type { MockProduct } from "../../../_mock/store";

const VALID_CATEGORIES = [
  "whiskey","tequila","vodka","rum","gin","wine","beer",
  "champagne","cognac","rtd","liqueur","other",
];

// Flexible column-name normalizer — strips spaces/underscores/hyphens, lowercased
function colKey(s: string) {
  return s.toLowerCase().replace(/[\s_\-().]/g, "");
}

function pick(row: Record<string, unknown>, ...candidates: string[]): string | undefined {
  for (const name of candidates) {
    const key = Object.keys(row).find((k) => colKey(k) === colKey(name));
    if (key !== undefined && row[key] !== undefined && row[key] !== "") {
      return String(row[key]).trim();
    }
  }
  return undefined;
}

interface PreviewProduct {
  id: string; slug: string; name: string; brand: string; category: string;
  price: number; salePrice: number | null; volume: string; abv: number;
  country: string; stockQty: number; inStock: boolean; featured: boolean;
  active: boolean; rating: number; reviewCount: number; description: string;
  imageUrl: string | null;
}
interface PreviewUpdated { product: PreviewProduct; original: PreviewProduct; changes: string[] }
interface ImportError { row: number; message: string; name?: string }

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    rows: Record<string, unknown>[];
    confirm?: boolean;
  };

  const { rows, confirm = false } = body;

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }

  const existing = store.getAllProducts();
  const byId = new Map(existing.map((p) => [p.id.toLowerCase(), p]));
  const byName = new Map(
    existing.map((p) => [`${p.name.toLowerCase()}|||${p.brand.toLowerCase()}`, p])
  );

  const newProducts: PreviewProduct[] = [];
  const updatedProducts: PreviewUpdated[] = [];
  const errors: ImportError[] = [];

  rows.forEach((raw, i) => {
    const rowNum = i + 1;

    const sku         = pick(raw, "sku", "id", "productid", "product_id");
    const name        = pick(raw, "name", "productname", "product name", "title", "item");
    const brand       = pick(raw, "brand", "manufacturer", "maker", "distillery", "brewery");
    const rawCat      = pick(raw, "category", "type", "spirit", "spirit type");
    const volume      = pick(raw, "volume", "size", "ml", "oz", "pack size");
    const rawPrice    = pick(raw, "price", "regular price", "retail price", "cost", "msrp");
    const rawSale     = pick(raw, "sale price", "saleprice", "promo price", "promotion", "discount price");
    const rawStock    = pick(raw, "stock", "stock qty", "quantity", "qty", "inventory", "on hand");
    const description = pick(raw, "description", "desc", "notes", "details");
    const imageUrl    = pick(raw, "image url", "image", "photo", "img", "picture", "imageurl");
    const rawAbv      = pick(raw, "abv", "alcohol", "alcohol content", "proof");
    const country     = pick(raw, "country", "origin", "made in", "region");

    // Required fields
    if (!name) { errors.push({ row: rowNum, message: "Missing required: Product Name" }); return; }
    if (!brand) { errors.push({ row: rowNum, name, message: "Missing required: Brand" }); return; }
    if (!rawPrice) { errors.push({ row: rowNum, name, message: "Missing required: Price" }); return; }

    const price = parseFloat(rawPrice.replace(/[$,]/g, ""));
    if (isNaN(price) || price <= 0) {
      errors.push({ row: rowNum, name, message: `Invalid price: "${rawPrice}"` }); return;
    }

    const salePrice = rawSale ? parseFloat(rawSale.replace(/[$,]/g, "")) : null;
    if (salePrice !== null && (isNaN(salePrice) || salePrice >= price)) {
      errors.push({ row: rowNum, name, message: `Sale price ($${salePrice}) must be less than regular price ($${price})` }); return;
    }

    const stockQty = rawStock ? (parseInt(rawStock) || 0) : 0;
    const category = VALID_CATEGORIES.includes(rawCat?.toLowerCase() ?? "")
      ? rawCat!.toLowerCase()
      : "other";
    const abv = rawAbv ? (parseFloat(rawAbv) || 0) : 0;

    // Match existing by SKU or name+brand
    let match: MockProduct | undefined;
    if (sku) match = byId.get(sku.toLowerCase());
    if (!match) match = byName.get(`${name.toLowerCase()}|||${brand.toLowerCase()}`);

    if (match) {
      // Compute what changes
      const changes: string[] = [];
      if (Math.abs(match.price - price) >= 0.01) changes.push(`Price: $${match.price} → $${price}`);
      if ((match.salePrice ?? null) !== salePrice && salePrice !== null) changes.push(`Sale Price: $${match.salePrice ?? "none"} → $${salePrice}`);
      if (salePrice === null && match.salePrice !== null) changes.push(`Sale Price: removed`);
      if (match.stockQty !== stockQty) changes.push(`Stock: ${match.stockQty} → ${stockQty}`);
      if (volume && match.volume !== volume) changes.push(`Volume: ${match.volume} → ${volume}`);
      if (imageUrl && match.imageUrl !== imageUrl) changes.push(`Image URL updated`);
      if (description && match.description !== description) changes.push(`Description updated`);
      if (match.category !== category) changes.push(`Category: ${match.category} → ${category}`);

      const updated: PreviewProduct = {
        ...match,
        price,
        salePrice,
        stockQty,
        inStock: stockQty > 0,
        volume: volume ?? match.volume,
        imageUrl: imageUrl ?? match.imageUrl,
        description: description ?? match.description,
        category,
      };
      updatedProducts.push({ product: updated, original: match as PreviewProduct, changes });
    } else {
      // New product
      const id = sku ?? `p${Date.now()}${i}`;
      const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const slug = `${slugBase}-${id.slice(-6)}`;

      const newProduct: PreviewProduct = {
        id, slug,
        name: name.trim(),
        brand: brand.trim(),
        category,
        price,
        salePrice,
        volume: volume ?? "750ml",
        abv,
        country: country ?? "USA",
        stockQty,
        inStock: stockQty > 0,
        featured: false,
        active: true,
        rating: 0,
        reviewCount: 0,
        description: description ?? "",
        imageUrl: imageUrl ?? null,
      };
      newProducts.push(newProduct);
    }
  });

  if (!confirm) {
    // Preview mode — no writes
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

  // Confirm — apply to store
  let added = 0;
  let updated = 0;

  for (const p of newProducts) {
    store.saveProduct(p as MockProduct);
    added++;
  }
  for (const { product } of updatedProducts) {
    store.saveProduct(product as MockProduct);
    updated++;
  }

  return NextResponse.json({
    success: true,
    added,
    updated,
    skipped: errors.length,
    errors,
  });
}
