"use client";

import { STORE_HOURS } from "@/lib/pickupWindows";
import { categoryPlaceholder } from "@/lib/categoryPlaceholder";

// Per-day store hours list — shown wherever the pickup address appears
export function StoreHoursList({ compact }: { compact?: boolean } = {}) {
  return (
    <div className={compact ? "mt-2" : "mt-3"}>
      <p className={`font-bold text-gray-700 uppercase tracking-wide mb-1 ${compact ? "text-[10px]" : "text-xs"}`}>🕐 Store Hours</p>
      <div className={compact ? "space-y-0.5 text-[11px]" : "grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs"}>
        {STORE_HOURS.map(h => (
          <div key={h.day} className="flex items-baseline justify-between gap-3">
            <span className="text-gray-500 shrink-0">{h.day}</span>
            <span className={`whitespace-nowrap text-right ${h.closed ? "text-red-500 font-semibold" : "text-gray-700 font-medium"}`}>{h.hours}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Product thumbnail with automatic category placeholder fallback
export function ItemThumb({ imageUrl, category, name, size = 44 }: {
  imageUrl?: string | null; category?: string | null; name: string; size?: number;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl || categoryPlaceholder(category)}
      alt={name}
      width={size}
      height={size}
      className="object-contain rounded-lg bg-gray-50 border border-gray-100 shrink-0"
      style={{ width: size, height: size }}
      onError={e => { (e.target as HTMLImageElement).src = categoryPlaceholder(category); }}
    />
  );
}
