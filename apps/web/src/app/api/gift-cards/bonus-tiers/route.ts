import { NextResponse } from "next/server";
import { dbGetActiveBonusTiers } from "@/lib/db";

// Public, read-only — the gift card page reads this to show the "you'll also
// get a bonus card" banner before checkout. No secrets in here.
export async function GET() {
  const tiers = await dbGetActiveBonusTiers();
  return NextResponse.json(tiers);
}
