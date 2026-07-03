import { NextRequest, NextResponse } from "next/server";
import { dbGetDriver, dbSaveDriver } from "@/lib/db";
import { store } from "../../_mock/store";

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-driver-token");
  const { driverId, lat, lng } = await req.json();
  if (!driverId || lat == null || lng == null) {
    return NextResponse.json({ error: "driverId, lat, lng required" }, { status: 400 });
  }
  // Verify the request came from a logged-in driver session
  if (!token || store.getDriverBySession(token)?.id !== driverId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const driver = await dbGetDriver(driverId);
  if (!driver) return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  await dbSaveDriver({ ...driver, lat, lng, locationUpdatedAt: new Date().toISOString() });
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const driverId = req.nextUrl.searchParams.get("driverId");
  if (!driverId) return NextResponse.json({ error: "driverId required" }, { status: 400 });
  const driver = await dbGetDriver(driverId);
  if (!driver) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    driverId, name: driver.name, lat: driver.lat, lng: driver.lng,
    isOnline: driver.isOnline, locationUpdatedAt: driver.locationUpdatedAt,
  });
}
