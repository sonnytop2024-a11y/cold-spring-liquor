import { NextResponse } from "next/server";
import { dbGetActiveBanners } from "@/lib/db";

export async function GET() {
  const banners = await dbGetActiveBanners();
  return NextResponse.json(banners);
}
