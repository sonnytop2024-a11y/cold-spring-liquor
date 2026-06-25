import { NextRequest, NextResponse } from "next/server";
import { dbGetOrdersByCustomer } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const orders = await dbGetOrdersByCustomer(params.id);
  return NextResponse.json(orders);
}
