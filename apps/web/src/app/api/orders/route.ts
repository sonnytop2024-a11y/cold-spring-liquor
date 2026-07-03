import { NextRequest, NextResponse } from "next/server";
import { dbGetAllOrders } from "@/lib/db";
import { processOrder } from "@/lib/processOrder";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sessionToken = req.cookies.get("csl-session")?.value ?? null;
  const result = await processOrder(body, sessionToken);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
  return NextResponse.json(result.order, { status: 201 });
}

export async function GET() {
  return NextResponse.json(await dbGetAllOrders());
}
