import { NextRequest, NextResponse } from "next/server";
import { dbGetOrder, dbGetDriver } from "@/lib/db";
import { STORE_LAT, STORE_LNG } from "../../../_mock/data";

const ACTIVE_DELIVERY = [
  "driver_assigned", "driver_at_store",
  "out_for_delivery", "driver_arriving", "driver_arrived",
];

// Rough geocode for Cedar Park / Georgetown / Austin area addresses
function guessDestCoords(city?: string): { lat: number; lng: number } {
  const c = (city ?? "").toLowerCase();
  if (c.includes("cedar park"))  return { lat: 30.5203, lng: -97.8202 };
  if (c.includes("leander"))     return { lat: 30.5788, lng: -97.8531 };
  if (c.includes("round rock"))  return { lat: 30.5083, lng: -97.6789 };
  if (c.includes("georgetown"))  return { lat: 30.6332, lng: -97.6779 };
  // Default: nearby Cedar Park
  return { lat: 30.5417, lng: -97.8530 };
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const order = await dbGetOrder(params.id);
  if (!order || !ACTIVE_DELIVERY.includes(order.status)) return NextResponse.json(null);

  const driver = order.driverId ? await dbGetDriver(order.driverId) : null;
  const dest = guessDestCoords(order.deliveryAddress?.city);

  let lat: number;
  let lng: number;
  let isLiveGPS = false;

  if (driver?.lat && driver?.lng) {
    // Real GPS from driver app
    lat = driver.lat;
    lng = driver.lng;
    isLiveGPS = true;
  } else if (order.status === "driver_arrived") {
    // Driver is at destination — show destination coords
    lat = dest.lat;
    lng = dest.lng;
  } else {
    // Simulate smooth movement from store to destination
    const elapsed = (Date.now() - new Date(order.updatedAt).getTime()) / 1000;
    const totalSecs = order.status === "driver_assigned" ? 5 * 60 :   // 5 min to store
                      order.status === "driver_at_store" ? 2 * 60 :   // 2 min at store
                      18 * 60;                                          // 18 min to dest
    const progress = Math.min(elapsed / totalSecs, 0.99);

    // For driver_at_store/driver_assigned: stay near store
    if (["driver_assigned", "driver_at_store"].includes(order.status)) {
      lat = STORE_LAT;
      lng = STORE_LNG;
    } else {
      lat = STORE_LAT + (dest.lat - STORE_LAT) * progress;
      lng = STORE_LNG + (dest.lng - STORE_LNG) * progress;
    }
  }

  const distKm = haversineKm(lat, lng, dest.lat, dest.lng);
  const distMiles = distKm * 0.621371;
  const etaMinutes = Math.max(1, Math.round(distKm / 30 * 60)); // ~30 km/h city driving

  return NextResponse.json({
    lat, lng,
    destLat: dest.lat,
    destLng: dest.lng,
    storeLat: STORE_LAT,
    storeLng: STORE_LNG,
    distanceMiles: Math.round(distMiles * 10) / 10,
    etaMinutes,
    driverName: driver?.name ?? "Your Driver",
    driverId: driver?.id ?? null,
    isLiveGPS,
    status: order.status,
  });
}
