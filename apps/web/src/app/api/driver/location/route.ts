import { NextRequest, NextResponse } from "next/server";
import { store } from "../../_mock/store";

// Driver app posts its GPS location here every few seconds
export async function POST(req: NextRequest) {
  const { driverId, lat, lng } = await req.json();
  if (!driverId || lat == null || lng == null) {
    return NextResponse.json({ error: "driverId, lat, lng required" }, { status: 400 });
  }
  const driver = store.updateDriverLocation(driverId, lat, lng);
  if (!driver) return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

// Admin/customer can poll a specific driver's location
export async function GET(req: NextRequest) {
  const driverId = req.nextUrl.searchParams.get("driverId");
  if (!driverId) return NextResponse.json({ error: "driverId required" }, { status: 400 });
  const driver = store.getDriver(driverId);
  if (!driver) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    driverId, name: driver.name, lat: driver.lat, lng: driver.lng,
    isOnline: driver.isOnline, locationUpdatedAt: driver.locationUpdatedAt,
  });
}
