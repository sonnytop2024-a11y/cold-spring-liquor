import { requireAdminAuth } from "@/lib/adminAuth";
import { NextRequest, NextResponse } from "next/server";
import { dbGetAllOrders } from "@/lib/db";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

async function getAllUsers(): Promise<any[]> {
  if (!SUPA_URL || !SUPA_KEY) return [];
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/csl_users?select=data&order=created_at.desc&limit=1000`, {
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const rows = await res.json();
    return rows.map((r: any) => r.data);
  } catch { return []; }
}

export async function GET(req: NextRequest) {
  const authErr = requireAdminAuth(req); if (authErr) return authErr;
  const search = req.nextUrl.searchParams.get("search")?.toLowerCase() ?? "";

  const [users, orders] = await Promise.all([getAllUsers(), dbGetAllOrders()]);

  // Build per-customer order stats
  const statsMap: Record<string, { orderCount: number; totalSpend: number; lastOrderAt: string | null }> = {};
  for (const o of orders) {
    if (!o.customerId) continue;
    if (!statsMap[o.customerId]) statsMap[o.customerId] = { orderCount: 0, totalSpend: 0, lastOrderAt: null };
    statsMap[o.customerId].orderCount++;
    if (o.status === "delivered") statsMap[o.customerId].totalSpend += o.total;
    if (!statsMap[o.customerId].lastOrderAt || o.createdAt > statsMap[o.customerId].lastOrderAt!) {
      statsMap[o.customerId].lastOrderAt = o.createdAt;
    }
  }

  let customers = users.map((u: any) => {
    const stats = statsMap[u.id] ?? { orderCount: 0, totalSpend: 0, lastOrderAt: null };
    return {
      id: u.id,
      displayName: u.name ?? "—",
      email: u.email ?? "—",
      phone: u.phone ?? "—",
      dob: u.dob ?? null,
      deliveryAddress: u.deliveryAddress ?? null,
      tier: u.tier ?? "Bronze",
      points: u.points ?? 0,
      createdAt: u.createdAt,
      googleId: u.googleId ?? null,
      orderCount: stats.orderCount,
      totalSpend: stats.totalSpend,
      lastOrderAt: stats.lastOrderAt,
      rewards: {
        totalPoints: u.points ?? 0,
        totalSpend: stats.totalSpend,
        vipTier: (u.tier ?? "Bronze").toLowerCase(),
      },
    };
  });

  if (search) {
    customers = customers.filter(
      (c) =>
        c.displayName.toLowerCase().includes(search) ||
        c.email.toLowerCase().includes(search) ||
        c.phone.includes(search)
    );
  }

  return NextResponse.json(customers);
}
