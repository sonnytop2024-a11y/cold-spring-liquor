"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

interface PromoBanner {
  id: string;
  name: string;
  positionCategory: string;
  image?: string;
  destType: "product" | "url";
  destValue: string;
  priority: number;
}

// Admin-managed banner chained in right after a category strip on the
// mobile "All" tab. The slot is a fixed 45:17 box (matching the processed
// upload ratio) so it reserves space before the image loads — never
// height:auto, never a layout shift. See admin's Promo Banners tab for
// the eligibility rules (active + date range + has an image).
// No view/click tracking (anh Sơn, 30/07: kept deliberately out of scope).
const ROTATE_MS = 5000;
const FADE_MS = 700;

export function PromoBannerSlot({ positionCategory }: { positionCategory: string }) {
  // Shared query key — every slot on the page asks for the same list, so
  // react-query dedupes it into one request (same trick as ProductCard's
  // unlock-deal badge).
  const { data: banners } = useQuery<PromoBanner[]>({
    queryKey: ["promo-banners"],
    queryFn: async () => {
      const r = await fetch("/api/promo-banners");
      if (!r.ok) return [];
      return r.json() as Promise<PromoBanner[]>;
    },
    staleTime: 60_000,
  });

  const list = useMemo(
    () =>
      (banners ?? [])
        .filter((b) => b.positionCategory === positionCategory)
        .sort((a, b) => b.priority - a.priority),
    [banners, positionCategory],
  );

  const [idx, setIdx] = useState(0);

  useEffect(() => setIdx(0), [list.length]);
  useEffect(() => {
    if (list.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % list.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [list.length]);

  if (list.length === 0) return null;
  const active = list[idx];

  // aspect-[45/17] = the exact 900×340 ratio every promo upload is processed
  // to — the frame always matches the image, so nothing gets cropped on
  // narrow screens (Samsung Fold cover ~344px cut the banner edges with the
  // old fixed 140px height), and the reserved box still prevents layout shift.
  const CLASSES = "block relative w-full aspect-[45/17] rounded-2xl overflow-hidden shadow-md bg-gray-100";

  // All banners for this slot are stacked on top of each other, each with
  // its own opacity — the outgoing one fades out while the next fades in at
  // the same time (a real crossfade), instead of swapping the src on a
  // single <img> which pops instantly (anh Sơn, 31/07: "mờ dần rồi xuất
  // hiện banner khác", not the hard cut it was doing).
  const stack = (
    <>
      {list.map((b, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={b.id}
          src={b.image}
          alt={b.name}
          loading="lazy"
          decoding="async"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity ease-in-out ${i === idx ? "opacity-100" : "opacity-0"}`}
          style={{ transitionDuration: `${FADE_MS}ms` }}
        />
      ))}
      {list.length > 1 && (
        <span className="absolute right-2.5 bottom-2 flex gap-1 z-10" aria-hidden="true">
          {list.map((b, i) => (
            <span key={b.id} className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${i === idx ? "bg-white" : "bg-white/40"}`} />
          ))}
        </span>
      )}
    </>
  );

  return (
    <div className="mt-4">
      {/* No destination set → decorative only, not clickable */}
      {active.destValue ? (
        <Link href={active.destValue} aria-label={active.name} className={CLASSES}>
          {stack}
        </Link>
      ) : (
        <div className={CLASSES}>{stack}</div>
      )}
    </div>
  );
}
