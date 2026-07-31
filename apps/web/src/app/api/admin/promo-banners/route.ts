import { NextRequest, NextResponse } from "next/server";
import { dbGetAllPromoBanners, dbCreatePromoBanner } from "@/lib/db";

export async function GET() {
  return NextResponse.json(await dbGetAllPromoBanners());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, positionCategory, image, destType, destValue, priority, active, startDate, endDate } = body;

  if (!positionCategory) {
    return NextResponse.json({ error: "positionCategory required" }, { status: 400 });
  }
  if (destType !== "product" && destType !== "url") {
    return NextResponse.json({ error: "destType must be 'product' or 'url'" }, { status: 400 });
  }

  const banner = await dbCreatePromoBanner({
    name: (name || "").trim() || "Untitled Banner",
    positionCategory,
    image: image || undefined,
    destType,
    destValue: destValue || "",
    priority: Number(priority) || 0,
    active: active !== false,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  return NextResponse.json(banner, { status: 201 });
}
