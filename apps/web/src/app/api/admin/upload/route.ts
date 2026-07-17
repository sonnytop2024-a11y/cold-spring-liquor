import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase.server";
import sharp from "sharp";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB raw input limit
const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const BUCKET = "csl-images";

// Product images: 800×800 square, white background, bottle centered
async function processProductImage(buffer: ArrayBuffer): Promise<Buffer> {
  const input = Buffer.from(buffer);
  return sharp(input)
    .trim({ background: "#FFFFFF", threshold: 15 })
    .resize(800, 800, { fit: "cover", position: "centre" })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
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
    const processed = folder === "banners"
      ? await processBannerImage(rawBytes)
      : folder === "showcase"
        ? await processShowcaseImage(rawBytes)
        : await processProductImage(rawBytes);

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
