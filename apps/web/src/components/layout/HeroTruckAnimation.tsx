'use client';

import { useEffect, useRef } from 'react';

// Route waypoints (normalized 0–1) tracing the orange neon route in hero-bg-mobile.jpg
const WP: [number, number][] = [
  [0.27, 0.88],
  [0.44, 0.83],
  [0.54, 0.79],
  [0.49, 0.72],
  [0.37, 0.67],
  [0.36, 0.61],
  [0.44, 0.57],
  [0.53, 0.54],
  [0.57, 0.48],
  [0.55, 0.43],
  [0.60, 0.37],
  [0.64, 0.30],
  [0.67, 0.22],
];

// Day-mode route tracing hero-bg-mobile-day.jpg (853×1844 daylight artwork)
const WP_DAY: [number, number][] = [
  [0.276, 0.740],
  [0.320, 0.788],
  [0.385, 0.853],
  [0.449, 0.883],
  [0.550, 0.859],
  [0.610, 0.796],
  [0.673, 0.734],
  [0.718, 0.670],
  [0.712, 0.613],
  [0.680, 0.550],
  [0.700, 0.490],
  [0.770, 0.432],
  [0.782, 0.350],
  [0.808, 0.308],
  [0.846, 0.270],
];

function toCurve(pts: [number, number][]) {
  return pts.slice(0, -1).map((_, i) => {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    return [p1,
      [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6],
      [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6],
      p2] as [[number,number],[number,number],[number,number],[number,number]];
  });
}

function evalBez(
  [p0, c1, c2, p1]: [[number,number],[number,number],[number,number],[number,number]],
  t: number
): [number, number] {
  const m = 1 - t;
  return [
    m*m*m*p0[0] + 3*m*m*t*c1[0] + 3*m*t*t*c2[0] + t*t*t*p1[0],
    m*m*m*p0[1] + 3*m*m*t*c1[1] + 3*m*t*t*c2[1] + t*t*t*p1[1],
  ];
}

function buildPath(wp: [number, number][], n = 300) {
  const segs = toCurve(wp);
  const raw: [number, number][] = [];
  segs.forEach(seg => {
    const steps = Math.ceil(n * 3 / segs.length);
    for (let i = 0; i <= steps; i++) raw.push(evalBez(seg, i / steps));
  });
  const lens = [0];
  for (let i = 1; i < raw.length; i++) {
    const dx = raw[i][0] - raw[i-1][0], dy = raw[i][1] - raw[i-1][1];
    lens.push(lens[i-1] + Math.sqrt(dx*dx + dy*dy));
  }
  const tot = lens[lens.length - 1];
  return Array.from({ length: n }, (_, s) => {
    const tgt = (s / (n - 1)) * tot;
    let lo = 0, hi = raw.length - 1;
    while (lo + 1 < hi) { const m = (lo + hi) >> 1; if (lens[m] <= tgt) lo = m; else hi = m; }
    const f = lens[hi] === lens[lo] ? 0 : (tgt - lens[lo]) / (lens[hi] - lens[lo]);
    return [
      raw[lo][0] + f * (raw[hi][0] - raw[lo][0]),
      raw[lo][1] + f * (raw[hi][1] - raw[lo][1]),
    ] as [number, number];
  });
}

const N = 300;
const SAMPLES = buildPath(WP, N);
const SAMPLES_DAY = buildPath(WP_DAY, N);

const T_IDLE   = 1000;
const T_DRIVE  = 6500;
const T_ARRIVE = 2200;
const T_PAUSE  = 7000;

export function HeroTruckAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const truckRef  = useRef<HTMLImageElement>(null);
  const rafRef    = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const truck  = truckRef.current;
    if (!canvas || !truck) return;

    let alive = true;

    const setup = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const r   = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = r.width  * dpr;
      canvas.height = r.height * dpr;
      canvas.style.width  = r.width  + 'px';
      canvas.style.height = r.height + 'px';
    };
    setup();
    const ro = new ResizeObserver(setup);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    let phase: 'idle'|'driving'|'arrived'|'pause' = 'idle';
    let prog  = 0;
    let phaseT = performance.now();
    let trail: [number, number][] = [];
    let lastTheme = '';

    const heroSection = canvas.closest<HTMLElement>('.hero-section');

    function frame(now: number) {
      if (!alive) return;
      const ctx = canvas!.getContext('2d');
      if (!ctx) { rafRef.current = requestAnimationFrame(frame); return; }

      const dpr = window.devicePixelRatio || 1;
      const W   = canvas!.width  / dpr;
      const H   = canvas!.height / dpr;

      // Mobile only — skip on desktop
      if (W >= 768) {
        truck!.style.display = 'none';
        rafRef.current = requestAnimationFrame(frame);
        return;
      }

      // Day mode drives the daylight artwork's route; behind the showcase
      // circle (its route passes under it), above canvas otherwise.
      const theme = heroSection?.dataset.heroTheme === 'day' ? 'day' : 'night';
      if (theme !== lastTheme) {
        lastTheme = theme;
        trail = [];
        truck!.style.zIndex = theme === 'day' ? '6' : '20';
      }
      const samples = theme === 'day' ? SAMPLES_DAY : SAMPLES;

      const el = now - phaseT;

      if      (phase === 'idle'    && el >= T_IDLE)   { phase = 'driving'; phaseT = now; trail = []; }
      else if (phase === 'driving')                    { prog = Math.min(el / T_DRIVE, 1); if (prog >= 1) { phase = 'arrived'; phaseT = now; } }
      else if (phase === 'arrived' && el >= T_ARRIVE) { phase = 'pause';   phaseT = now; trail = []; }
      else if (phase === 'pause'   && el >= T_PAUSE)  { phase = 'idle';    phaseT = now; prog  = 0; }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, W, H);

      if (phase !== 'driving' && phase !== 'arrived') {
        truck!.style.display = 'none';
        ctx.restore();
        rafRef.current = requestAnimationFrame(frame);
        return;
      }

      const arrEl = phase === 'arrived' ? now - phaseT : 0;
      const fade  = phase === 'arrived' ? Math.max(1 - (arrEl / T_ARRIVE) * 0.80, 0.20) : 1;

      const idx  = Math.min(Math.floor(prog * (N - 1)), N - 1);
      const pt   = samples[idx];
      const tx   = pt[0] * W;
      const ty   = pt[1] * H;

      trail.push([tx, ty]);
      if (trail.length > 45) trail.shift();

      ctx.globalAlpha = fade;

      // Light trail
      for (let i = 1; i < trail.length; i++) {
        const t = i / trail.length;
        ctx.beginPath();
        ctx.moveTo(trail[i-1][0], trail[i-1][1]);
        ctx.lineTo(trail[i][0],   trail[i][1]);
        ctx.strokeStyle = `rgba(255,200,0,${t * 0.52})`;
        ctx.lineWidth   = 0.8 + t * 2.8;
        ctx.lineCap     = 'round';
        ctx.stroke();
      }

      // House glow on arrival
      if (phase === 'arrived') {
        const hp = samples[N - 1];
        const hx = hp[0] * W, hy = hp[1] * H;
        const pulse = 0.5 + 0.5 * Math.sin(now / 380);
        const hi    = Math.min(arrEl / 400, 1);
        ctx.save();
        ctx.globalAlpha = hi * fade * 0.90;
        ctx.shadowColor = 'rgba(255,212,0,0.9)'; ctx.shadowBlur = 22 + pulse * 16;
        ctx.strokeStyle = `rgba(255,220,60,${0.50 + pulse * 0.40})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(hx, hy, 18 + pulse * 10, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur  = 0;
        ctx.strokeStyle = `rgba(255,240,120,${0.25 + pulse * 0.25})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(hx, hy, 9 + pulse * 4, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }

      ctx.restore();

      // Truck sprite — translate only, no rotation (3D isometric sprite)
      const perspScale = 1.0 - 0.28 * prog;
      const TW = 82, TH = 65;
      const sW = TW * perspScale;
      const sH = TH * perspScale;

      truck!.style.display   = 'block';
      truck!.style.opacity   = String(fade);
      truck!.style.width     = sW + 'px';
      truck!.style.transform = `translate(${tx - sW * 0.48}px, ${ty - sH * 0.54}px)`;

      rafRef.current = requestAnimationFrame(frame);
    }

    phaseT = performance.now();
    rafRef.current = requestAnimationFrame(frame);

    return () => {
      alive = false;
      ro.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 5 }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={truckRef}
        src="/truck-sprite.png"
        alt=""
        aria-hidden="true"
        className="absolute top-0 left-0 pointer-events-none select-none"
        style={{
          display: 'none',
          zIndex: 20,
          willChange: 'transform',
          imageRendering: 'auto',
        }}
      />
    </>
  );
}
