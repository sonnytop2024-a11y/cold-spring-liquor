"use client";

import { useEffect, useRef } from "react";

/* Live preview of the public Hero weather overlay, driven by the *unsaved*
   draft settings so admins see changes instantly before hitting Save.
   Rendering logic mirrors apps/web HeroWeatherEffect (kept in sync by hand,
   same as the duplicated Settings type — the two apps share no packages). */

export interface HeroWeatherConfig {
  enabled: boolean;
  rain: { enabled: boolean; intensity: "light" | "medium" | "heavy" };
  lightning: { enabled: boolean; frequency: "low" | "medium" | "high" };
  opacity: number;
}

const INTENSITY_DROP_FACTOR = { light: 0.5, medium: 1, heavy: 1.8 } as const;
const FREQ_RANGE_MS = { low: [20000, 30000], medium: [10000, 20000], high: [5000, 10000] } as const;

interface Drop { x: number; y: number; len: number; speed: number; drift: number; depth: number }

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

const previewCSS = `
  .hw-preview-lightning {
    position: absolute; inset: 0; z-index: 5;
    background: rgba(255,240,220,.5);
    opacity: 0; pointer-events: none; mix-blend-mode: screen;
  }
  .hw-preview-lightning.flash { animation: hw-preview-flash 900ms ease-out; }
  @keyframes hw-preview-flash {
    0%{opacity:0} 8%{opacity:.55} 16%{opacity:.05} 24%{opacity:.32} 35%{opacity:0} 100%{opacity:0}
  }
`;

export function HeroWeatherPreview({ config }: { config: HeroWeatherConfig }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lightningRef = useRef<HTMLDivElement>(null);
  const configRef = useRef(config);
  const refreshRef = useRef<(() => void) | null>(null);

  configRef.current = config;

  useEffect(() => {
    const hostEl = hostRef.current, canvasEl = canvasRef.current, lightningEl = lightningRef.current;
    if (!hostEl || !canvasEl || !lightningEl) return;
    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let drops: Drop[] = [];
    let raf: number | null = null;
    let lastT: number | null = null;
    let lightningTimer: ReturnType<typeof setTimeout> | null = null;
    let running = false;

    const reducedMotionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reducedMotion = () => reducedMotionMq.matches;
    const getConfig = () => configRef.current;

    function resize() {
      const rect = hostEl!.getBoundingClientRect();
      canvasEl!.width = rect.width * dpr;
      canvasEl!.height = rect.height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      initDrops(rect.width, rect.height);
    }

    function initDrops(w: number, h: number) {
      const cfg = getConfig();
      if (!cfg.enabled || !cfg.rain.enabled) { drops = []; return; }
      const base = Math.max(16, Math.min(70, Math.floor((w * h) / 9000)));
      drops = new Array(Math.round(base * INTENSITY_DROP_FACTOR[cfg.rain.intensity]))
        .fill(0).map(() => makeDrop(w, h, true));
    }

    function tick(t: number) {
      if (!running) return;
      const cfg = getConfig();
      if (lastT === null) lastT = t;
      const dt = Math.min(40, t - lastT) / 1000;
      lastT = t;
      const w = canvasEl!.width / dpr, h = canvasEl!.height / dpr;
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
      lightningTimer = setTimeout(() => {
        const c = getConfig();
        if (c.enabled && c.lightning.enabled && !reducedMotion() && !document.hidden) {
          lightningEl!.classList.remove("flash");
          void lightningEl!.offsetWidth;
          lightningEl!.classList.add("flash");
        }
        scheduleLightning();
      }, min + Math.random() * (max - min));
    }

    function start() {
      stop();
      if (reducedMotion()) return;
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
      ctx!.clearRect(0, 0, canvasEl!.width, canvasEl!.height);
    }

    function refresh() {
      if (reducedMotion()) { stop(); return; }
      if (!running) { start(); return; }
      initDrops(canvasEl!.width / dpr, canvasEl!.height / dpr);
      scheduleLightning();
    }
    refreshRef.current = refresh;

    const onVisibility = () => { if (document.hidden) stop(); else refresh(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", refresh);
    refresh();

    return () => {
      stop();
      refreshRef.current = null;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", refresh);
    };
  }, []);

  // Re-seed drops / lightning schedule whenever the draft config changes
  useEffect(() => { refreshRef.current?.(); }, [config]);

  return (
    <div
      ref={hostRef}
      className="relative h-44 rounded-xl overflow-hidden border"
      style={{
        background:
          "radial-gradient(ellipse at 75% 30%, rgba(255,150,40,0.18), transparent 55%), linear-gradient(180deg, #06070b 0%, #0a0704 55%, #120a04 100%)",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: previewCSS }} />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 4 }} />
      <div ref={lightningRef} className="hw-preview-lightning" />
      <div className="relative z-10 p-4 pointer-events-none select-none">
        <p className="text-white font-black text-lg leading-tight" style={{ fontFamily: "Georgia, serif" }}>
          Premium<br /><span style={{ color: "#F0C239" }}>Liquor</span> Delivered.
        </p>
        <span className="inline-block mt-2 text-[11px] font-bold text-white bg-orange-600 rounded-lg px-2.5 py-1">
          Shop Now
        </span>
      </div>
      <span className="absolute top-2 right-2 z-10 text-[10px] text-gray-300 bg-black/50 rounded-full px-2 py-0.5">
        Live preview — unsaved changes
      </span>
    </div>
  );
}
