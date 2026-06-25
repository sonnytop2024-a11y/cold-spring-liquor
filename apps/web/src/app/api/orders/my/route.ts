import { NextRequest, NextResponse } from "next/server";
import { dbGetOrdersByCustomer } from "@/lib/db";
import { verifySessionToken } from "@/lib/session";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("csl-session")?.value;
  if (!token) return NextResponse.json([]);

  const userId = verifySessionToken(token);
  if (!userId) return NextResponse.json([]);

  const orders = await dbGetOrdersByCustomer(userId);
  return NextResponse.json(orders);
}
