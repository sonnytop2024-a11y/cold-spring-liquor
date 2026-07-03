import { NextResponse } from "next/server";
import { dbGetAllCoupons } from "@/lib/db";

export async function GET() {
  const all = await dbGetAllCoupons();
  const now = new Date();
  const active = all
    .filter(c => {
      if (!c.active) return false;
      if (c.startDate && new Date(c.startDate) > now) return false;
      if (c.endDate && new Date(c.endDate) < now) return false;
      if (c.maxUsage != null && (c.usageCount ?? 0) >= c.maxUsage) return false;
      return true;
    })
    .map(c => ({
      code: c.code,
      type: c.type,
      value: c.value,
      label: c.label,
      minOrder: c.minOrder,
    }));
  return NextResponse.json(active);
}
