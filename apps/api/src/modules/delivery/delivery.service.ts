import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

const STORE_LAT = 30.5786;
const STORE_LNG = -97.8536;
const MAX_RADIUS_MILES = 5;

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Injectable()
export class DeliveryService {
  constructor(private readonly configService: ConfigService) {}

  async checkAvailability(address: string): Promise<{ available: boolean; distanceMiles?: number }> {
    const apiKey = this.configService.get("GOOGLE_MAPS_API_KEY");
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

    const { data } = await axios.get(url);
    if (data.status !== "OK" || !data.results[0]) {
      return { available: false };
    }

    const { lat, lng } = data.results[0].geometry.location;
    const distance = haversineDistance(STORE_LAT, STORE_LNG, lat, lng);
    return { available: distance <= MAX_RADIUS_MILES, distanceMiles: distance };
  }
}
