import { requireAdminAuth } from "@/lib/adminAuth";
import { NextRequest, NextResponse } from "next/server";
import { dbGetSettings, dbSaveSettings, dbResetSettings } from "@/lib/db";

export async function GET() {
  const settings = await dbGetSettings();
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const authErr = requireAdminAuth(req); if (authErr) return authErr;
  try {
    const body = await req.json();
    const updated = await dbSaveSettings(body);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

export async function DELETE() {
  const reset = await dbResetSettings();
  return NextResponse.json(reset);
}
