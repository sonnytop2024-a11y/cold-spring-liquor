import { requireAdminAuth } from "@/lib/adminAuth";
import { NextRequest, NextResponse } from "next/server";
import { store } from "../../../_mock/store";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const authErr = requireAdminAuth(req); if (authErr) return authErr;
  const body = await req.json();
  const coupon = store.updateCoupon(params.id, {
    ...body,
    code: body.code?.toUpperCase().trim(),
    value: body.value !== undefined ? Number(body.value) : undefined,
    minOrder: body.minOrder !== undefined ? Number(body.minOrder) : undefined,
    maxUsage: body.maxUsage ? Number(body.maxUsage) : null,
    usagePerCustomer: body.usagePerCustomer ? Number(body.usagePerCustomer) : null,
  });
  if (!coupon) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(coupon);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ok = store.deleteCoupon(params.id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
