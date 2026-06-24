import { NextRequest, NextResponse } from "next/server";
import { store } from "../../_mock/store";

export async function GET() {
  const settings = store.getSettings();
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = store.saveSettings(body);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

export async function DELETE() {
  const reset = store.resetSettings();
  return NextResponse.json(reset);
}
