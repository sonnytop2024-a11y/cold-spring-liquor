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
  if (!apiKey) {
    return NextResponse.json({ error: "Google Maps API key not configured" }, { status: 500 });
  }

  const origin = `${olat},${olng}`;
  const url =
    `https://maps.googleapis.com/maps/api/distancematrix/json` +
    `?origins=${encodeURIComponent(origin)}` +
    `&destinations=${encodeURIComponent(address)}` +
    `&mode=driving&units=imperial&key=${apiKey}`;

  let data: any;
  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    data = await res.json();
  } catch {
    return NextResponse.json({ error: "Network error reaching Google Maps" });
  }

  if (data.status !== "OK") {
    return NextResponse.json({ error: `Google Maps error: ${data.status}` });
  }

  const element = data.rows?.[0]?.elements?.[0];
  if (!element || element.status !== "OK") {
    return NextResponse.json({ error: `No route found (${element?.status ?? "unknown"})` });
  }

  const miles = (element.distance.value / 1609.344).toFixed(1);
  const minutes = Math.ceil(element.duration.value / 60);

  return NextResponse.json({ miles, minutes });
}
