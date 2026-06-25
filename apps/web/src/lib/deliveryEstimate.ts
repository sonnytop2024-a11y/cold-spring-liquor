// Distance + ETA from store to customer address
// Store: 15609 Ronald Reagan Blvd Ste B100, Leander TX 78641

export const STORE_LAT = 30.5786;
export const STORE_LNG = -97.8536;

const ZIP_COORDS: Record<string, { lat: number; lng: number }> = {
  // Leander
  "78641": { lat: 30.5788, lng: -97.8531 },
  "78642": { lat: 30.6588, lng: -97.9231 }, // Liberty Hill
  // Cedar Park
  "78613": { lat: 30.5203, lng: -97.8202 },
  // Round Rock
  "78664": { lat: 30.5083, lng: -97.6789 },
  "78665": { lat: 30.5297, lng: -97.6489 },
  "78681": { lat: 30.5297, lng: -97.7489 },
  // Georgetown
  "78626": { lat: 30.6332, lng: -97.6779 },
  "78627": { lat: 30.6416, lng: -97.6779 },
  "78628": { lat: 30.6516, lng: -97.7128 },
  // Hutto
  "78634": { lat: 30.5432, lng: -97.5489 },
  // Taylor
  "76574": { lat: 30.5688, lng: -97.4089 },
  // Pflugerville
  "78660": { lat: 30.4583, lng: -97.6189 },
  "78691": { lat: 30.5083, lng: -97.6189 },
  // Austin NW
  "78750": { lat: 30.4634, lng: -97.7942 },
  "78759": { lat: 30.4334, lng: -97.7529 },
  "78730": { lat: 30.3834, lng: -97.8242 },
  "78731": { lat: 30.3734, lng: -97.7742 },
  "78732": { lat: 30.4234, lng: -97.8742 },
  "78726": { lat: 30.4434, lng: -97.8142 },
  "78727": { lat: 30.4234, lng: -97.7342 },
  "78729": { lat: 30.4534, lng: -97.7742 },
  "78758": { lat: 30.3934, lng: -97.7042 },
  // Lakeway / Bee Cave / Steiner Ranch
  "78734": { lat: 30.3734, lng: -97.9642 },
  "78735": { lat: 30.3234, lng: -97.8642 },
  "78738": { lat: 30.3334, lng: -97.9142 },
  "78746": { lat: 30.3134, lng: -97.8142 },
  // Kyle / Buda
  "78640": { lat: 29.9883, lng: -97.8789 },
  "78610": { lat: 30.0883, lng: -97.8389 },
  // Manor / Elgin
  "78653": { lat: 30.3434, lng: -97.5542 },
  "78621": { lat: 30.3534, lng: -97.3742 },
};

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  "leander":       { lat: 30.5788, lng: -97.8531 },
  "cedar park":    { lat: 30.5203, lng: -97.8202 },
  "round rock":    { lat: 30.5083, lng: -97.6789 },
  "georgetown":    { lat: 30.6332, lng: -97.6779 },
  "pflugerville":  { lat: 30.4583, lng: -97.6189 },
  "hutto":         { lat: 30.5432, lng: -97.5489 },
  "taylor":        { lat: 30.5688, lng: -97.4089 },
  "liberty hill":  { lat: 30.6588, lng: -97.9231 },
  "lakeway":       { lat: 30.3734, lng: -97.9642 },
  "bee cave":      { lat: 30.3234, lng: -97.9142 },
  "steiner ranch": { lat: 30.4234, lng: -97.8742 },
  "austin":        { lat: 30.4634, lng: -97.7942 },
  "kyle":          { lat: 29.9883, lng: -97.8789 },
  "buda":          { lat: 30.0883, lng: -97.8389 },
  "manor":         { lat: 30.3434, lng: -97.5542 },
};

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function estimateDeliveryFromStore(address: {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}): { distanceMiles: number; etaMinutes: number } {
  let dest: { lat: number; lng: number } | null = null;

  // Try zip code first (more precise)
  if (address.zip) {
    const zip = address.zip.trim().slice(0, 5);
    dest = ZIP_COORDS[zip] ?? null;
  }

  // Fallback: city name match
  if (!dest && address.city) {
    const city = address.city.toLowerCase().trim();
    for (const [key, coords] of Object.entries(CITY_COORDS)) {
      if (city.includes(key) || key.includes(city)) {
        dest = coords;
        break;
      }
    }
  }

  // Final fallback: same area as store (~3 miles)
  if (!dest) {
    dest = { lat: 30.5417, lng: -97.8530 };
  }

  const distanceMiles = haversineMiles(STORE_LAT, STORE_LNG, dest.lat, dest.lng);
  // 15 min prep at store + driving at ~25 mph city speed
  const rawMinutes = 15 + (distanceMiles / 25) * 60;
  // Round to nearest 5 min, minimum 20 min
  const etaMinutes = Math.max(20, Math.round(rawMinutes / 5) * 5);

  return {
    distanceMiles: Math.round(distanceMiles * 10) / 10,
    etaMinutes,
  };
}
