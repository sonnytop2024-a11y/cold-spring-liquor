import { NextRequest, NextResponse } from "next/server";

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "csl-admin-dev-secret";

export function requireAdminAuth(req: NextRequest): NextResponse | null {
  const header = req.headers.get("x-admin-secret");
  if (header && header === ADMIN_SECRET) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
