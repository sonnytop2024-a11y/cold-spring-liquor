import { requireAdminAuth } from "@/lib/adminAuth";
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase.server";
import sharp from "sharp";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB raw input limit
const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const BUCKET = "csl-images";

// Output: 800×800 WebP, quality 85, white background, bottle centered
async function processImage(buffer: ArrayBuffer): Promise<Buffer> {
  const input = Buffer.from(buffer);
  return sharp(input)
    .trim({ background: "#FFFFFF", threshold: 15 }) // strip excess whitespace
    .resize(800, 800, {
      fit: "cover",
      position: "centre",
    })
    .flatten({ background: { r: 255, g: 255, b: 255 } }) // remove transparency → white
    .toFormat("webp", { quality: 85, effort: 4 })
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
    const processed = await processImage(rawBytes);

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
    console.log(`[upload] processed & saved ${safeName} → ${publicUrl}`);
    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error("[upload] error:", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const authErr = requireAdminAuth(req); if (authErr) return authErr;
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
