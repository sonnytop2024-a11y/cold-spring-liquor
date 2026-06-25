import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const olat = searchParams.get("olat");
  const olng = searchParams.get("olng");
  const address = searchParams.get("address");

  if (!olat || !olng || !address) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (apiKey) {
    const url =
      `https://maps.googleapis.com/maps/api/distancematrix/json` +
      `?origins=${encodeURIComponent(`${olat},${olng}`)}` +
      `&destinations=${encodeURIComponent(address)}` +
      `&mode=driving&units=imperial&key=${apiKey}`;
    try {
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (data.status !== "OK") {
        return NextResponse.json({ error: `Maps error: ${data.status}` });
      }
      const element = data.rows?.[0]?.elements?.[0];
      if (!element || element.status !== "OK") {
        return NextResponse.json({ error: `No route (${element?.status ?? "unknown"})` });
      }
      const miles = (element.distance.value / 1609.344).toFixed(1);
      const minutes = Math.ceil(element.duration.value / 60);
      return NextResponse.json({ miles, minutes });
    } catch {
      return NextResponse.json({ error: "Google Maps request failed" });
    }
  }

  // No local API key — proxy server-to-server (avoids browser CORS/redirect issues)
  const webUrl = process.env.WEB_API_URL ?? "https://www.coldspringliquor.com";
  try {
    const proxyUrl =
      `${webUrl}/api/driver/distance` +
      `?olat=${olat}&olng=${olng}&address=${encodeURIComponent(address)}`;
    const res = await fetch(proxyUrl, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Distance calculation unavailable" });
  }
}
