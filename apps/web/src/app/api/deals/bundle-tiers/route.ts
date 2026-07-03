import { NextResponse } from "next/server";
import { dbGetActiveBundleTiers } from "@/lib/db";

export async function GET() {
  return NextResponse.json(await dbGetActiveBundleTiers());
}
