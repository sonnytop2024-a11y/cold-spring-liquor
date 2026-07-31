import { NextResponse } from "next/server";
import { dbGetActiveUnlockDeals } from "@/lib/db";

export async function GET() {
  return NextResponse.json(await dbGetActiveUnlockDeals());
}
