import { NextRequest, NextResponse } from "next/server";
import { store } from "../../_mock/store";

export async function POST(req: NextRequest) {
  const { code, subtotal } = await req.json();
  if (!code) return NextResponse.json({ error: "No coupon code provided." }, { status: 400 });

  const coupon = store.getCouponByCode(code);

  if (!coupon || !coupon.active) {
    return NextResponse.json({ error: "Invalid or expired coupon code." }, { status: 400 });
  }

  const now = new Date();
  if (coupon.startDate && new Date(coupon.startDate) > now) {
    return NextResponse.json({ error: "This coupon is not yet active." }, { status: 400 });
  }
  if (coupon.endDate && new Date(coupon.endDate) < now) {
    return NextResponse.json({ error: "This coupon has expired." }, { status: 400 });
  }
  if (coupon.maxUsage !== null && coupon.usageCount >= coupon.maxUsage) {
    return NextResponse.json({ error: "This coupon has reached its usage limit." }, { status: 400 });
  }
  if (subtotal < coupon.minOrder) {
    return NextResponse.json({ error: `Minimum order of $${coupon.minOrder} required for this coupon.` }, { status: 400 });
  }

  let discount = 0;
  if (coupon.type === "fixed") discount = Math.min(coupon.value, subtotal);
  else if (coupon.type === "percentage") discount = Math.round(subtotal * coupon.value) / 100;

  return NextResponse.json({ discount, message: `✓ ${coupon.label}`, code: coupon.code, type: coupon.type });
}
