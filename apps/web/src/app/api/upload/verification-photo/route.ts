import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase.server";
import sharp from "sharp";

// Customer-facing upload for the "Missing Product Image Assistance" feature —
// a reference photo the customer provides when a product has no catalog image,
// so Admin/Driver can see exactly what to prepare. Not the same as the
// admin-only /api/admin/upload route (that one is tuned for 800x800 catalog
// photos); this one just resizes down, no forced square crop.
const MAX_SIZE = 8 * 1024 * 1024; // 8MB raw input limit
const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const BUCKET = "csl-images";
const FOLDER = "order-verification";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No image file provided." }, { status: 400 });
    }
    const f = file as File;
    if (!ALLOWED.includes(f.type)) {
      return NextResponse.json({ error: "Only JPG, PNG, and WEBP files are allowed." }, { status: 400 });
    }
    if (f.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large. Maximum 8 MB." }, { status: 400 });
    }

    const sb = supabaseServer();
    if (!sb) {
      return NextResponse.json(
        { error: "Storage not configured. Missing Supabase environment variables." },
        { status: 500 },
      );
    }

    const rawBytes = await f.arrayBuffer();
    const processed = await sharp(Buffer.from(rawBytes))
      .resize(1200, undefined, { fit: "inside", withoutEnlargement: true })
      .toFormat("webp", { quality: 85, effort: 4 })
      .toBuffer();

    const safeName = `${FOLDER}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (sb as any).storage
      .from(BUCKET)
      .upload(safeName, processed, { contentType: "image/webp", upsert: false });

    if (error) {
      console.error("[upload/verification-photo] Supabase storage error:", error.message);
      return NextResponse.json({ error: `Upload failed: ${error.message}.` }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: { publicUrl } } = (sb as any).storage.from(BUCKET).getPublicUrl(safeName);
    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error("[upload/verification-photo] error:", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
