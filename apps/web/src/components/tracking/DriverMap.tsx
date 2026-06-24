"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigation, Clock, MapPin } from "lucide-react";

async function fetchDriverLocation(orderId: string) {
  const res = await fetch(`/api/orders/${orderId}/driver-location`);
  if (!res.ok) return null;
  return res.json();
}

declare global {
  interface Window { L: any; }
}

export function DriverMap({ orderId }: { orderId: string }) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const [leafletReady, setLeafletReady] = useState(false);

  const { data: location } = useQuery({
    queryKey: ["driver-location", orderId],
    queryFn: () => fetchDriverLocation(orderId),
    refetchInterval: 8_000,
    enabled: !!orderId,
  });

  // Load Leaflet CSS + JS from CDN once
  useEffect(() => {
    if (window.L) { setLeafletReady(true); return; }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setLeafletReady(true);
    document.head.appendChild(script);
  }, []);

  // Init map once Leaflet is ready
  useEffect(() => {
    if (!leafletReady || !mapDivRef.current || mapRef.current) return;
    const L = window.L;
    const map = L.map(mapDivRef.current, { zoomControl: true, attributionControl: false }).setView(
      [30.5786, -97.8536], 13
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
    }).addTo(map);

    // Store marker pin
    const storeIcon = L.divIcon({
      html: `<div style="background:#1a1a1a;color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;border:3px solid #ff6b1a;">🏪</div>`,
      className: "", iconSize: [32, 32], iconAnchor: [16, 16],
    });
    L.marker([30.5786, -97.8536], { icon: storeIcon })
      .bindPopup("<strong>Cold Spring Liquor</strong><br>15609 Ronald Reagan Blvd")
      .addTo(map);

    mapRef.current = map;
  }, [leafletReady]);

  // Update driver marker when location changes
  useEffect(() => {
    if (!mapRef.current || !location || !window.L) return;
    const L = window.L;
    const { lat, lng } = location;

    const driverIcon = L.divIcon({
      html: `<div style="background:#ff6b1a;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:20px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">🚗</div>`,
      className: "", iconSize: [40, 40], iconAnchor: [20, 20],
    });

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLatLng([lat, lng]);
    } else {
      driverMarkerRef.current = L.marker([lat, lng], { icon: driverIcon })
        .bindPopup(`<strong>${location.driverName ?? "Your Driver"}</strong><br>On the way! 🚗`)
        .addTo(mapRef.current);
    }

    mapRef.current.panTo([lat, lng], { animate: true, duration: 1 });
  }, [location]);

  const hasLocation = !!location;

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="px-5 py-4 border-b flex items-start justify-between">
        <div>
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Navigation size={18} className="text-brand-500" />
            Live Driver Tracking
          </h2>
          {hasLocation ? (
            <div className="flex items-center gap-4 mt-1">
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <MapPin size={13} className="text-brand-500" />
                {location.distanceMiles?.toFixed(1)} miles away
              </span>
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <Clock size={13} className="text-green-500" />
                ~{location.etaMinutes} min ETA
              </span>
            </div>
          ) : (
            <p className="text-sm text-gray-400 mt-1">Tracking activates once driver is assigned</p>
          )}
        </div>
        {hasLocation && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            Live
          </span>
        )}
      </div>

      <div className="relative">
        <div ref={mapDivRef} className="h-80 bg-gray-100" />
        {!leafletReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-400">
              <div className="animate-spin border-2 border-brand-500 border-t-transparent rounded-full w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Loading map...</p>
            </div>
          </div>
        )}
      </div>

      {hasLocation && (
        <div className="px-5 py-3 bg-gray-50 border-t flex items-center justify-between text-sm">
          <span className="text-gray-600">Driver: <strong>{location.driverName}</strong></span>
          <a
            href={`https://maps.google.com/?q=${location.lat},${location.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-600 hover:underline font-medium"
          >
            Open in Google Maps →
          </a>
        </div>
      )}
    </div>
  );
}
