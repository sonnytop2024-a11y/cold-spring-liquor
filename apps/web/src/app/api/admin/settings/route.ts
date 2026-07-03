import { NextRequest, NextResponse } from "next/server";
import { dbGetSettings, dbSaveSettings, dbResetSettings } from "@/lib/db";

export async function GET(req: NextRequest) {
const settings = await dbGetSettings();
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
try {
    const body = await req.json();
    const updated = await dbSaveSettings(body);
    return NextResponse.json(updated);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid request body";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
const reset = await dbResetSettings();
  return NextResponse.json(reset);
}
