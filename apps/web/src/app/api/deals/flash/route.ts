import { NextResponse } from "next/server";
import { dbGetActiveFlashDeals } from "@/lib/db";

export async function GET() {
  return NextResponse.json(await dbGetActiveFlashDeals());
}
