"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Banner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  ctaText: string;
  ctaLink: string;
  linkType: string;
  linkValue: string;
  bgColor: string;
}

function resolveLink(banner: Banner): string {
  switch (banner.linkType) {
    case "flash-deals":   return "/#flash-deals";
    case "bundle-deals":  return "/#bundle-deals";
    case "new":           return "/products?sort=newest";
    case "hard-to-find":  return "/products?category=hard-to-find";
    case "category":      return `/products?category=${encodeURIComponent(banner.linkValue)}`;
    case "product":       return `/products/${banner.linkValue}`;
    default:              return banner.ctaLink || "/products";
  }
}

export function HeroBannerCarousel({ initialBanners }: { initialBanners?: Banner[] }) {
  const [banners, setBanners] = useState<Banner[]>(initialBanners ?? []);
  const [current, setCurrent] = useState(0);
  const [loaded, setLoaded] = useState((initialBanners?.length ?? 0) > 0);
  const [transitioning, setTransitioning] = useState(false);
  const router = useRouter();
  const touchStartX = useRef<number | null>(null);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Server-provided banners render in the initial HTML; the client fetch is
  // only a fallback for callers that don't pass them.
  useEffect(() => {
    if (initialBanners && initialBanners.length > 0) return;
    fetch("/api/banners")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length) {
          setBanners(data);
          setLoaded(true);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goTo = useCallback((idx: number) => {
    if (transitioning || idx === current) return;
    setTransitioning(true);
    setCurrent(idx);
  }, [transitioning, current]);

  const next = useCallback(() => goTo((current + 1) % banners.length), [current, banners.length, goTo]);
  const prev = useCallback(() => goTo((current - 1 + banners.length) % banners.length), [current, banners.length, goTo]);

  useEffect(() => {
    if (banners.length <= 1) return;
    autoRef.current = setInterval(next, 5000);
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [banners.length, next]);

  const resetAuto = () => {
    if (autoRef.current) clearInterval(autoRef.current);
    autoRef.current = setInterval(next, 5000);
  };

  const handlePrev = () => { prev(); resetAuto(); };
  const handleNext = () => { next(); resetAuto(); };
  const handleDot = (i: number) => { goTo(i); resetAuto(); };

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) { diff > 0 ? handleNext() : handlePrev(); }
    touchStartX.current = null;
  };

  if (!loaded || banners.length === 0) return null;

  return (
    <section
      className="w-full bg-gray-900 select-none"
      style={{ touchAction: "pan-y" }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* mobile: 2:1 ratio | desktop: 40vw height, max 560px */}
      <div className="relative w-full bg-black pb-[50%] md:pb-0 md:h-[40vw] md:max-h-[560px] overflow-hidden">

        {/* GPU-composited sliding strip — all slides rendered, translateX moves between them */}
        <div
          className="absolute inset-0 flex"
          style={{
            transform: `translateX(-${current * 100}%)`,
            transition: transitioning ? "transform 420ms cubic-bezier(0.25, 0.46, 0.45, 0.94)" : "none",
            willChange: "transform",
            WebkitBackfaceVisibility: "hidden",
            backfaceVisibility: "hidden",
          }}
          onTransitionEnd={() => setTransitioning(false)}
        >
          {banners.map((banner) => {
            const hasOverlay = !!(banner.title || banner.subtitle || banner.ctaText);
            return (
              <div key={banner.id} className="relative flex-none w-full h-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={banner.imageUrl}
                  alt={banner.title || "Banner"}
                  className="w-full h-full object-contain object-center"
                  draggable={false}
                />

                {hasOverlay && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.25) 45%, transparent 75%)",
                    }}
                  />
                )}

                {hasOverlay && (
                  <div className="absolute bottom-0 left-0 right-0 px-6 pb-5 sm:px-10 sm:pb-7 md:px-14 md:pb-9">
                    {banner.title && (
                      <h2 className="text-white font-extrabold text-lg sm:text-2xl md:text-3xl leading-tight drop-shadow-md max-w-2xl">
                        {banner.title}
                      </h2>
                    )}
                    {banner.subtitle && (
                      <p className="text-white/90 text-sm sm:text-base mt-1 max-w-xl drop-shadow">
                        {banner.subtitle}
                      </p>
                    )}
                    {banner.ctaText && (
                      <button
                        onClick={() => router.push(resolveLink(banner))}
                        className="mt-3 inline-block bg-white hover:bg-gray-100 text-gray-900 font-bold text-sm px-6 py-2.5 rounded-lg shadow transition-colors"
                      >
                        {banner.ctaText}
                      </button>
                    )}
                  </div>
                )}

                {!hasOverlay && (banner.ctaLink || banner.linkType !== "url") && (
                  <button
                    className="absolute inset-0 w-full h-full"
                    onClick={() => router.push(resolveLink(banner))}
                    aria-label="View promotion"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Prev / Next arrows */}
        {banners.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/90 hover:bg-white shadow-md flex items-center justify-center text-gray-700 transition-all"
              aria-label="Previous"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/90 hover:bg-white shadow-md flex items-center justify-center text-gray-700 transition-all"
              aria-label="Next"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* Dot indicators */}
        {banners.length > 1 && (
          <div className="absolute bottom-2 right-4 z-10 flex items-center gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => handleDot(i)}
                className={`rounded-full transition-all ${
                  i === current
                    ? "w-4 h-2 bg-white"
                    : "w-2 h-2 bg-white/50 hover:bg-white/75"
                }`}
                aria-label={`Banner ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
