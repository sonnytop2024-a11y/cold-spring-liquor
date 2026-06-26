import { requireAdminAuth } from "@/lib/adminAuth";
import { NextRequest, NextResponse } from "next/server";
import { dbGetAllOrders } from "@/lib/db";

export async function GET(req: NextRequest) {
  const authErr = requireAdminAuth(req); if (authErr) return authErr;
  const status = req.nextUrl.searchParams.get("status");
  let orders = await dbGetAllOrders();
  if (status) orders = orders.filter(o => o.status === status);
  return NextResponse.json(orders);
}
