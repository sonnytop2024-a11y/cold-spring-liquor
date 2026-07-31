import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase.server";
import sharp from "sharp";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB raw input limit
const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const BUCKET = "csl-images";

// Product images: 800×800 square, white background, WHOLE bottle centered.
// fit "contain" (not "cover") so tall bottles are never cropped top/bottom,
// plus a guaranteed 24px white margin — after trim the content would otherwise
// touch the frame on two sides, which reads as "cropped" in the grid tile.
// Only affects newly uploaded images; already-stored images are untouched.
async function processProductImage(buffer: ArrayBuffer): Promise<Buffer> {
  const input = Buffer.from(buffer);
  const WHITE = { r: 255, g: 255, b: 255 };
  return sharp(input)
    .trim({ background: "#FFFFFF", threshold: 15 })
    .resize(752, 752, { fit: "contain", background: WHITE })
    .extend({ top: 24, bottom: 24, left: 24, right: 24, background: WHITE })
    .flatten({ background: WHITE })
    .toFormat("webp", { quality: 85, effort: 4 })
    .toBuffer();
}

// Banner images: max 1600px wide, preserve aspect ratio, no crop
async function processBannerImage(buffer: ArrayBuffer): Promise<Buffer> {
  const input = Buffer.from(buffer);
  return sharp(input)
    .resize(1600, undefined, { fit: "inside", withoutEnlargement: true })
    .toFormat("webp", { quality: 88, effort: 4 })
    .toBuffer();
}

// Promo banner strip images (chained in between category strips on the
// mobile "All" tab): fixed ~2.65:1 landscape to match the 140px-tall slot,
// cover-cropped and centered so any source image fills it cleanly — the
// frontend never sizes off the image itself (see PromoBannerSlot), only this
// fixed ratio, so a wrong-ratio upload would look off-center rather than
// break layout.
async function processPromoBannerImage(buffer: ArrayBuffer): Promise<Buffer> {
  const input = Buffer.from(buffer);
  return sharp(input)
    .resize(900, 340, { fit: "cover", position: "centre" })
    .toFormat("webp", { quality: 88, effort: 4 })
    .toBuffer();
}

// Category card photos: landscape 7:5 to match the card frame on /categories,
// cover-cropped and centered so any source image fills the tile cleanly.
async function processCategoryImage(buffer: ArrayBuffer): Promise<Buffer> {
  const input = Buffer.from(buffer);
  return sharp(input)
    .resize(700, 500, { fit: "cover", position: "centre" })
    .toFormat("webp", { quality: 85, effort: 4 })
    .toBuffer();
}

// Category pill/carousel icons: small, no forced crop (a custom-shaped or
// transparent-background icon shouldn't be square-cropped), capped at 160px
// so it stays crisp at the tiny sizes pills/carousel headers render it.
async function processIconImage(buffer: ArrayBuffer): Promise<Buffer> {
  const input = Buffer.from(buffer);
  return sharp(input)
    .resize(160, 160, { fit: "inside", withoutEnlargement: true })
    .toFormat("webp", { quality: 90, effort: 4 })
    .toBuffer();
}

// Hero showcase bottle images: auto-crop the empty border around the bottle
// (transparent or white, whichever the source uses), fit inside 400×400 with
// no forced crop, and keep the alpha channel so the bottle floats on the
// glowing circle. This is what lets admins upload any-size images without
// ever adjusting them manually.
async function processShowcaseImage(buffer: ArrayBuffer): Promise<Buffer> {
  const input = Buffer.from(buffer);
  return sharp(input)
    .trim({ threshold: 12 })
    .resize(400, 400, { fit: "inside", withoutEnlargement: true })
    .toFormat("webp", { quality: 88, effort: 4 })
    .toBuffer();
}

// Vault bottle images: the Rare Whiskey Vault stands bottles on a photographed
// shelf, so the image MUST have a transparent background. We validate real
// transparency, auto-trim the empty border (this is what guarantees the bottle
// sits exactly on the shelf line), and cap at 700px tall — keeping alpha.
async function processVaultImage(buffer: ArrayBuffer): Promise<Buffer> {
  const input = Buffer.from(buffer);
  const img = sharp(input);
  const meta = await img.metadata();
  if (!meta.hasAlpha) {
    throw new VaultImageError(
      "Bottle image must have a transparent background (PNG or WebP with alpha). Remove the background first, then upload again.",
    );
  }
  const stats = await img.stats();
  const alpha = stats.channels[stats.channels.length - 1];
  if (alpha.min > 250) {
    // Alpha channel exists but nothing is actually transparent (e.g. white box)
    throw new VaultImageError(
      "This image has no transparent pixels — the bottle would show as a box on the shelf. Remove the background first, then upload again.",
    );
  }
  return sharp(input)
    .trim({ threshold: 12 })
    .resize(undefined, 700, { fit: "inside", withoutEnlargement: true })
    .toFormat("webp", { quality: 88, effort: 4 })
    .toBuffer();
}

class VaultImageError extends Error {}

export async function POST(req: NextRequest) {
try {
    const formData = await req.formData();
    const file = formData.get("image");
    const rawFolder = req.nextUrl.searchParams.get("folder") ?? "products";
    const folder = /^[a-z]+$/.test(rawFolder) ? rawFolder : "products";

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No image file provided." }, { status: 400 });
    }
    const f = file as File;
    if (!ALLOWED.includes(f.type)) {
      return NextResponse.json({ error: "Only JPG, PNG, and WEBP files are allowed." }, { status: 400 });
    }
    if (f.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large. Maximum 10 MB." }, { status: 400 });
    }

    const sb = supabaseServer();
    if (!sb) {
      return NextResponse.json(
        { error: "Storage not configured. Missing Supabase environment variables." },
        { status: 500 },
      );
    }

    const rawBytes = await f.arrayBuffer();
    let processed: Buffer;
    try {
      processed = folder === "banners"
        ? await processBannerImage(rawBytes)
        : folder === "showcase"
          ? await processShowcaseImage(rawBytes)
          : folder === "categories"
            ? await processCategoryImage(rawBytes)
            : folder === "icons"
              ? await processIconImage(rawBytes)
              : folder === "promo"
                ? await processPromoBannerImage(rawBytes)
                : folder === "vault"
                  ? await processVaultImage(rawBytes)
                  : await processProductImage(rawBytes);
    } catch (err) {
      if (err instanceof VaultImageError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }

    const safeName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (sb as any).storage
      .from(BUCKET)
      .upload(safeName, processed, { contentType: "image/webp", upsert: false });

    if (error) {
      console.error("[upload] Supabase storage error:", error.message);
      const hint =
        error.message.toLowerCase().includes("not found") ||
        error.message.toLowerCase().includes("does not exist")
          ? ` Make sure the '${BUCKET}' storage bucket exists and is public in Supabase.`
          : "";
      return NextResponse.json({ error: `Upload failed: ${error.message}.${hint}` }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: { publicUrl } } = (sb as any).storage.from(BUCKET).getPublicUrl(safeName);
    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error("[upload] error:", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") return NextResponse.json({ ok: true });
    const sb = supabaseServer();
    if (!sb) return NextResponse.json({ ok: true });
    const match = url.match(new RegExp(`${BUCKET}/(.+)$`));
    if (!match) return NextResponse.json({ ok: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (sb as any).storage.from(BUCKET).remove([match[1]]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Delete failed." }, { status: 500 });
  }
}
