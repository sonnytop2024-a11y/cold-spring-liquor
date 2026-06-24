import { NextRequest, NextResponse } from "next/server";
import { store } from "../../_mock/store";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("csl-session")?.value;
  if (!token) return NextResponse.json([], { status: 200 });

  const user = store.getUserBySession(token);
  if (!user) return NextResponse.json([], { status: 200 });

  const orders = store.getOrdersByCustomer(user.id);
  return NextResponse.json(orders);
}
