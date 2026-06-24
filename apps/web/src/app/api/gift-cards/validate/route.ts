import { NextRequest, NextResponse } from "next/server";

const DEMO_CARDS: Record<string, number> = {
  "GIFT-DEMO-TEST": 50,
  "GIFT-ABCD-EFGH": 25,
  "GIFT-TEST-1234": 100,
};

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code") ?? "";
  const balance = DEMO_CARDS[code.toUpperCase()];
  if (balance) return NextResponse.json({ valid: true, balance });
  return NextResponse.json({ valid: false, balance: 0 });
}

// CartView sends POST — support both
export async function POST(req: NextRequest) {
  const { code } = await req.json();
  const balance = DEMO_CARDS[(code ?? "").toUpperCase()];
  if (balance) return NextResponse.json({ valid: true, balance });
  return NextResponse.json({ valid: false, balance: 0 }, { status: 400 });
}
