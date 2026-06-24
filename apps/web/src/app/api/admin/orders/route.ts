import { NextRequest, NextResponse } from "next/server";
import { store } from "../../_mock/store";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  let orders = store.getAllOrders();
  if (status) orders = orders.filter(o => o.status === status);
  return NextResponse.json(orders);
}
