import { NextRequest, NextResponse } from "next/server";
import { dbGetAllCoupons, dbSaveCoupon, dbDeleteCoupon } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
const body = await req.json();
  const all = await dbGetAllCoupons();
  const existing = all.find(c => c.id === params.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = {
    ...existing,
    ...body,
    code: body.code?.toUpperCase().trim() ?? existing.code,
    value: body.value !== undefined ? Number(body.value) : existing.value,
    minOrder: body.minOrder !== undefined ? Number(body.minOrder) : existing.minOrder,
    maxUsage: body.maxUsage ? Number(body.maxUsage) : null,
    usagePerCustomer: body.usagePerCustomer ? Number(body.usagePerCustomer) : null,
  };

  await dbSaveCoupon(updated);
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
const ok = await dbDeleteCoupon(params.id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
