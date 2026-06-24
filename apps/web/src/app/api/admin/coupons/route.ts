import { NextRequest, NextResponse } from "next/server";
import { store } from "../../_mock/store";

export async function GET() {
  return NextResponse.json(store.getAllCoupons());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { code, type, value, label, minOrder, maxUsage, usagePerCustomer, startDate, endDate, categoryRestriction, active } = body;

  if (!code || !type || !value) return NextResponse.json({ error: "code, type, value required" }, { status: 400 });
  if (!["fixed", "percentage", "free_delivery"].includes(type)) return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  const existing = store.getCouponByCode(code);
  if (existing) return NextResponse.json({ error: "Coupon code already exists" }, { status: 409 });

  const coupon = store.createCoupon({
    code: code.toUpperCase().trim(),
    type, value: Number(value),
    label: label || `${type === "fixed" ? `$${value} off` : type === "percentage" ? `${value}% off` : "Free delivery"}`,
    minOrder: Number(minOrder) || 0,
    maxUsage: maxUsage ? Number(maxUsage) : null,
    usagePerCustomer: usagePerCustomer ? Number(usagePerCustomer) : null,
    startDate: startDate || null,
    endDate: endDate || null,
    categoryRestriction: categoryRestriction || null,
    active: active !== false,
  });

  return NextResponse.json(coupon, { status: 201 });
}
