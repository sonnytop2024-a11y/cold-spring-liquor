import { NextRequest, NextResponse } from "next/server";
import { store } from "../../../_mock/store";
import { STORE_LAT, STORE_LNG } from "../../../_mock/data";

const ACTIVE_DELIVERY = ["driver_assigned","driver_at_store","out_for_delivery","driver_arriving"];

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const order = store.getOrder(params.id);
  if (!order || !ACTIVE_DELIVERY.includes(order.status)) return NextResponse.json(null);

  // Use real driver GPS if available
  const driver = order.driverId ? store.getDriver(order.driverId) : null;

  let lat: number;
  let lng: number;

  if (driver?.lat && driver?.lng) {
    // Real GPS from driver app
    const jitter = () => (Math.random() - 0.5) * 0.0003;
    lat = driver.lat + jitter();
    lng = driver.lng + jitter();
  } else {
    // Simulate movement from store toward a default destination
    const destLat = order.deliveryAddress?.city?.toLowerCase().includes("cedar park") ? 30.5052 : 30.5788;
    const destLng = -97.8460;
    const elapsed = (Date.now() - new Date(order.updatedAt).getTime()) / 1000;
    const progress = Math.min(elapsed / (18 * 60), 1);
    const jitter = () => (Math.random() - 0.5) * 0.001;
    lat = STORE_LAT + (destLat - STORE_LAT) * progress + jitter();
    lng = STORE_LNG + (destLng - STORE_LNG) * progress + jitter();
  }

  // Calculate distance to a representative destination
  const destLat = 30.5788;
  const destLng = -97.8460;
  const R = 3958.8;
  const dLat = ((destLat - lat) * Math.PI) / 180;
  const dLng = ((destLng - lng) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat * Math.PI) / 180) * Math.cos((destLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const distanceMiles = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return NextResponse.json({
    lat, lng,
    distanceMiles: Math.round(distanceMiles * 10) / 10,
    etaMinutes: Math.max(1, Math.round(distanceMiles / 0.4)),
    driverName: driver?.name ?? "Your Driver",
    driverId: driver?.id ?? null,
    isLiveGPS: !!(driver?.lat && driver?.lng),
  });
}
