"use client";

import { useEffect, useRef, useState } from "react";

/* ─────────────────────────────────────────────────────────────────────
   Admin-controlled weather overlay for the Hero Section.

   Config comes from GET /api/hero-weather (backed by csl_settings), so
   admins can change rain/lightning without a code deploy. The overlay
   sits above the hero background/gradient and below the content
   (z-index 5 vs content z-10), never intercepts pointer events, pauses
   when the tab is hidden, and fully disables under reduced motion.

   Structured as independent render passes (rain now; snow/fog/leaves
   later) — new effect types only add a config sub-object + one pass,
   with no changes to HeroSection.
───────────────────────────────────────────────────────────────────── */

export interface HeroWeatherConfig {
  enabled: boolean;
  rain: { enabled: boolean; intensity: "light" | "medium" | "heavy" };
  lightning: { enabled: boolean; frequency: "low" | "medium" | "high" };
  opacity: number; // 10–100
}

const INTENSITY_DROP_FACTOR = { light: 0.5, medium: 1, heavy: 1.8 } as const;
const FREQ_RANGE_MS = { low: [20000, 30000], medium: [10000, 20000], high: [5000, 10000] } as const;
const TIER_FACTOR = { low: 0.5, mid: 0.8, high: 1 } as const;

function deviceTier(): keyof typeof TIER_FACTOR {
  const cores = navigator.hardwareConcurrency || 4;
  const mem = (navigator as any).deviceMemory || 4;
  if (cores <= 4 || mem <= 4) return "low";
  if (cores <= 8) return "mid";
  return "high";
}

interface Drop {
  x: number; y: number; len: number; speed: number; drift: number; depth: number;
}

function makeDrop(w: number, h: number, randomY: boolean): Drop {
  const depth = Math.random();
  return {
    x: Math.random() * w,
    y: randomY ? Math.random() * h : -20,
    len: 12 + depth * 24,
    speed: 240 + depth * 360,
    drift: 0.35 + depth * 0.35,
    depth,
  };
}

const flashCSS = `
  .hero-weather-lightning {
    position: absolute; inset: 0; z-index: 5;
    background: rgba(255,240,220,.5);
    opacity: 0; pointer-events: none; mix-blend-mode: screen;
  }
  .hero-weather-lightning.flash { animation: hero-weather-flash 900ms ease-out; }
  @keyframes hero-weather-flash {
    0%{opacity:0} 8%{opacity:.55} 16%{opacity:.05} 24%{opacity:.32} 35%{opacity:0} 100%{opacity:0}
  }
`;

export function runWeatherEffect(
  hostEl: HTMLElement,
  canvasEl: HTMLCanvasElement,
  lightningEl: HTMLElement,
  getConfig: () => HeroWeatherConfig,
): () => void {
  const ctx = canvasEl.getContext("2d");
  if (!ctx) return () => {};
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let drops: Drop[] = [];
  let raf: number | null = null;
  let lastT: number | null = null;
  let lightningTimer: ReturnType<typeof setTimeout> | null = null;
  let running = false;
  let tabHidden = false;

  const reducedMotionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const reducedMotion = () => reducedMotionMq.matches;

  function resize() {
    const rect = hostEl.getBoundingClientRect();
    canvasEl.width = rect.width * dpr;
    canvasEl.height = rect.height * dpr;
    canvasEl.style.width = `${rect.width}px`;
    canvasEl.style.height = `${rect.height}px`;
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    initDrops(rect.width, rect.height);
  }

  function initDrops(w: number, h: number) {
    const cfg = getConfig();
    if (!cfg.enabled || !cfg.rain.enabled) { drops = []; return; }
    // Drop count scales with hero area, capped, then adjusted for
    // intensity and device capability so low-end phones stay smooth.
    const base = Math.max(16, Math.min(70, Math.floor((w * h) / 9000)));
    const count = Math.round(base * INTENSITY_DROP_FACTOR[cfg.rain.intensity] * TIER_FACTOR[deviceTier()]);
    drops = new Array(count).fill(0).map(() => makeDrop(w, h, true));
  }

  function tick(t: number) {
    if (!running) return;
    const cfg = getConfig();
    if (lastT === null) lastT = t;
    const dt = Math.min(40, t - lastT) / 1000;
    lastT = t;

    const w = canvasEl.width / dpr, h = canvasEl.height / dpr;
    ctx!.clearRect(0, 0, w, h);

    if (cfg.enabled && cfg.rain.enabled) {
      const globalOpacity = cfg.opacity / 100;
      ctx!.lineCap = "round";
      for (const d of drops) {
        const a = (0.09 + d.depth * 0.18) * globalOpacity;
        ctx!.strokeStyle = `rgba(255,214,170,${a})`;
        ctx!.lineWidth = 0.6 + d.depth * 0.7;
        ctx!.beginPath();
        ctx!.moveTo(d.x, d.y);
        ctx!.lineTo(d.x - d.len * d.drift * 0.5, d.y + d.len);
        ctx!.stroke();
        d.y += d.speed * dt;
        d.x -= d.speed * dt * d.drift * 0.5;
        if (d.y > h + 20) Object.assign(d, makeDrop(w, h, false));
      }
    }
    raf = requestAnimationFrame(tick);
  }

  function scheduleLightning() {
    if (lightningTimer) clearTimeout(lightningTimer);
    const cfg = getConfig();
    if (!cfg.enabled || !cfg.lightning.enabled || reducedMotion()) return;
    const [min, max] = FREQ_RANGE_MS[cfg.lightning.frequency];
    const delay = min + Math.random() * (max - min);
    lightningTimer = setTimeout(() => {
      const c = getConfig();
      if (c.enabled && c.lightning.enabled && !reducedMotion() && !tabHidden) {
        lightningEl.classList.remove("flash");
        void (lightningEl as HTMLElement).offsetWidth; // restart CSS animation
        lightningEl.classList.add("flash");
      }
      scheduleLightning();
    }, delay);
  }

  function start() {
    stop();
    if (reducedMotion()) return; // reduced motion: no rain, no lightning
    resize();
    running = true;
    lastT = null;
    raf = requestAnimationFrame(tick);
    scheduleLightning();
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    if (lightningTimer) clearTimeout(lightningTimer);
    ctx!.clearRect(0, 0, canvasEl.width, canvasEl.height);
  }

  function refresh() {
    if (reducedMotion()) { stop(); return; }
    if (!running) { start(); return; }
    initDrops(canvasEl.width / dpr, canvasEl.height / dpr);
    scheduleLightning();
  }

  const onVisibility = () => {
    tabHidden = document.hidden;
    if (document.hidden) stop();
    else refresh();
  };
  const onResize = () => { if (running) resize(); };
  const onMotionChange = () => refresh();

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("resize", onResize);
  reducedMotionMq.addEventListener?.("change", onMotionChange);

  refresh();

  return () => {
    stop();
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("resize", onResize);
    reducedMotionMq.removeEventListener?.("change", onMotionChange);
  };
}

export function HeroWeatherEffect() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lightningRef = useRef<HTMLDivElement>(null);
  const configRef = useRef<HeroWeatherConfig | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/hero-weather")
      .then(r => (r.ok ? r.json() : null))
      .then((cfg: HeroWeatherConfig | null) => {
        if (cancelled || !cfg || !cfg.enabled) return;
        configRef.current = cfg;
        setLoaded(true);
      })
      .catch(() => {}); // weather is decorative — fail silently
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    // The overlay div fills the hero via absolute positioning, so it (not
    // the hero section element) is the sizing host. Carousel/slide changes
    // inside the hero never touch this subtree, so the effect never resets.
    if (!hostRef.current || !canvasRef.current || !lightningRef.current) return;
    return runWeatherEffect(
      hostRef.current, canvasRef.current, lightningRef.current,
      () => configRef.current!,
    );
  }, [loaded]);

  if (!loaded) return null;

  return (
    <div ref={hostRef} className="absolute inset-0 z-[5] pointer-events-none" aria-hidden="true">
      <style dangerouslySetInnerHTML={{ __html: flashCSS }} />
      <canvas ref={canvasRef} className="absolute inset-0" style={{ zIndex: 4 }} />
      <div ref={lightningRef} className="hero-weather-lightning" />
    </div>
  );
}
