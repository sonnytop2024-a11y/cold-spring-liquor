import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No image file provided." }, { status: 400 });
    }

    if (!ALLOWED.includes((file as File).type)) {
      return NextResponse.json(
        { error: "Only JPG, PNG, and WEBP files are allowed." },
        { status: 400 },
      );
    }

    if ((file as File).size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File is too large. Maximum size is 5 MB." },
        { status: 400 },
      );
    }

    const f = file as File;
    const rawExt = f.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const ext = rawExt === "jpg" ? "jpg" : rawExt === "png" ? "png" : "webp";
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const uploadDir = join(process.cwd(), "public", "uploads", "products");
    await mkdir(uploadDir, { recursive: true });

    const bytes = await f.arrayBuffer();
    await writeFile(join(uploadDir, safeName), Buffer.from(bytes));

    return NextResponse.json({ url: `/uploads/products/${safeName}` });
  } catch (err) {
    console.error("[upload] error:", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}

// Optional: delete an uploaded image by URL
export async function DELETE(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || !url.startsWith("/uploads/products/")) {
      return NextResponse.json({ error: "Invalid URL." }, { status: 400 });
    }
    const filename = url.split("/uploads/products/")[1];
    if (!filename || filename.includes("..")) {
      return NextResponse.json({ error: "Invalid filename." }, { status: 400 });
    }
    const filePath = join(process.cwd(), "public", "uploads", "products", filename);
    if (existsSync(filePath)) {
      await unlink(filePath);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Delete failed." }, { status: 500 });
  }
}
