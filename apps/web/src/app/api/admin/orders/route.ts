import { NextRequest, NextResponse } from "next/server";
import { dbGetAllOrders } from "@/lib/db";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  let orders = await dbGetAllOrders();
  if (status) orders = orders.filter(o => o.status === status);
  return NextResponse.json(orders);
}
