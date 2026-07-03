import { NextRequest, NextResponse } from "next/server";
import { dbGetAllBanners, dbSaveBanner, dbReorderBanners, type HeroBanner } from "@/lib/db";

export async function GET(req: NextRequest) {
return NextResponse.json(await dbGetAllBanners());
}

export async function POST(req: NextRequest) {
const body = await req.json();

  // Reorder request
  if (body.action === "reorder" && Array.isArray(body.ids)) {
    await dbReorderBanners(body.ids);
    return NextResponse.json({ ok: true });
  }

  const { imageUrl } = body;
  if (!imageUrl) {
    return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
  }

  const all = await dbGetAllBanners();
  const banner: HeroBanner = {
    id: `banner_${Date.now()}`,
    title: body.title ?? "",
    subtitle: body.subtitle ?? "",
    imageUrl,
    ctaText: body.ctaText ?? "",
    ctaLink: body.ctaLink ?? "",
    linkType: body.linkType ?? "url",
    linkValue: body.linkValue ?? "",
    active: body.active !== false,
    startDate: body.startDate ?? null,
    endDate: body.endDate ?? null,
    sortOrder: all.length,
    bgColor: body.bgColor ?? "#1a1a2e",
    createdAt: new Date().toISOString(),
  };

  await dbSaveBanner(banner);
  return NextResponse.json(banner, { status: 201 });
}
