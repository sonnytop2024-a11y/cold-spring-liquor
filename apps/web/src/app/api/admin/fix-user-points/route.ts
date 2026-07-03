import { NextRequest, NextResponse } from "next/server";
import { dbGetUserByEmail, dbSaveUser } from "@/lib/db";

export async function POST(req: NextRequest) {
const { email, points } = await req.json();
  if (!email || points == null) return NextResponse.json({ error: "email and points required" }, { status: 400 });

  const user = await dbGetUserByEmail(email);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const oldPoints = user.points;
  const tier: "Bronze" | "Silver" | "Gold" | "Platinum" =
    points >= 3000 ? "Platinum" : points >= 1500 ? "Gold" : points >= 500 ? "Silver" : "Bronze";

  await dbSaveUser({ ...user, points, tier });

  return NextResponse.json({ success: true, email, oldPoints, newPoints: points, tier });
}
