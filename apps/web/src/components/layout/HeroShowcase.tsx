"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/* ─────────────────────────────────────────────────────────────────────
   Hero Product Showcase — the circular "delivery light" showcase in the
   dark corner of the Hero. Fully admin-controlled (products, placement,
   size, on/off) via GET /api/hero-showcase; content changes never need
   a deploy. Every effect layer is pointer-events:none except the circle
   itself (tap → product URL, swipe/arrows/dots to switch).

   UX approved via design preview 2026-07-16/17:
   - Position defaults: mobile right 4% / bottom 4% / 150px,
     desktop left 46% / bottom 4.5% / 160px — sits in the dark zone of
     the real hero artwork, never overlapping the truck/store/route/CTAs.
   - Spark field streak length 5.6–17.6px (client-tuned, do not extend).
   - Badge sits OUTSIDE the circle so overflow:hidden can't clip it.
───────────────────────────────────────────────────────────────────── */

export interface HeroShowcaseProduct {
  id: string;
  kicker: string;
  subtitle: string;
  badge: string;
  price: number;
  regularPrice: number | null;
  imageUrl: string | null;
  url: string;
  active: boolean;
  order: number;
}

export interface HeroShowcaseConfig {
  enabled: boolean;
  showOnMobile: boolean;
  showOnDesktop: boolean;
  products: HeroShowcaseProduct[];
  mobile: { size: number; right: number; bottom: number };
  desktop: { size: number; left: number; bottom: number };
}

/* Store-pin anchor for the comet pulse, as fractions of the hero box.
   Matches the pin baked into the real hero artwork on each breakpoint. */
const ANCHOR = {
  mobile: { x: 0.20, y: 0.667, bowX: 30, bowY: 60 },
  desktop: { x: 0.107, y: 0.737, bowX: 40, bowY: 95 },
};

const showcaseCSS = `
  .hsc-outer{position:absolute;z-index:8;aspect-ratio:1/1;}
  .hsc-glow-ring{position:absolute;inset:-10px;border-radius:50%;border:1px solid rgba(255,140,40,.25);
    box-shadow:0 0 22px rgba(255,120,30,.18);animation:hscBreathe 4.5s ease-in-out infinite;pointer-events:none;}
  @keyframes hscBreathe{0%,100%{opacity:.55;}50%{opacity:1;}}
  .hsc-circle{position:absolute;inset:0;border-radius:50%;border:1.5px solid rgba(255,130,30,.9);
    background:radial-gradient(circle at 50% 68%, rgba(255,110,10,.20), rgba(4,3,2,.82) 68%);
    backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);
    box-shadow:0 0 10px rgba(255,100,0,.55),0 0 26px rgba(255,90,0,.25),inset 0 0 20px rgba(255,110,20,.14);
    display:flex;align-items:center;justify-content:center;touch-action:pan-y;overflow:hidden;}
  .hsc-ring-highlight{position:absolute;inset:-1.5px;border-radius:50%;
    background:conic-gradient(from 0deg, transparent 0deg, rgba(255,210,140,.95) 14deg, transparent 34deg);
    -webkit-mask:radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px));
    mask:radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px));
    animation:hscRingSpin 10s linear infinite;pointer-events:none;}
  @keyframes hscRingSpin{to{transform:rotate(360deg);}}
  .hsc-flash{position:absolute;inset:-16px;border-radius:50%;box-shadow:0 0 0 0 rgba(255,150,40,0);pointer-events:none;}
  .hsc-flash.burst{animation:hscBurst 600ms ease-out;}
  @keyframes hscBurst{
    0%{box-shadow:0 0 0 0 rgba(255,170,70,.65);}
    55%{box-shadow:0 0 34px 16px rgba(255,140,40,.38);}
    100%{box-shadow:0 0 0 0 rgba(255,140,40,0);}
  }
  .hsc-sparks{position:absolute;inset:-42%;pointer-events:none;z-index:1;transition:opacity .4s ease;}
  .hsc-sparks.reduced{opacity:.35;}
  .hsc-spark{animation:hscTwinkle var(--dur,2.4s) ease-in-out infinite;animation-delay:var(--delay,0s);transform-origin:center;}
  @keyframes hscTwinkle{0%,100%{opacity:var(--min,.15);}50%{opacity:var(--max,.85);}}
  .hsc-sparks.boost .hsc-spark{animation:hscSparkBoost 650ms ease-out;}
  @keyframes hscSparkBoost{0%{opacity:.3;}30%{opacity:1;}100%{opacity:.5;}}
  .hsc-particle{position:absolute;left:50%;top:50%;width:4px;height:4px;border-radius:50%;background:#ffcf8f;
    box-shadow:0 0 6px 2px rgba(255,170,70,.8);opacity:0;pointer-events:none;}
  .hsc-particle.fly{animation:hscFly 650ms ease-out forwards;}
  @keyframes hscFly{
    0%{opacity:1;transform:translate(-50%,-50%) translate(0,0) scale(1);}
    100%{opacity:0;transform:translate(-50%,-50%) translate(var(--px),var(--py)) scale(.3);}
  }
  .hsc-badge{position:absolute;top:-3%;right:-4%;background:linear-gradient(135deg,#F7D26B,#B8860B);
    color:#241a04;font-size:8px;font-weight:800;line-height:1.25;padding:5px 8px;border-radius:9px;
    text-align:center;box-shadow:0 4px 10px rgba(0,0,0,.45);transform:rotate(6deg);z-index:12;
    letter-spacing:.02em;pointer-events:none;white-space:nowrap;}
  .hsc-slide{position:absolute;inset:16%;display:flex;flex-direction:column;align-items:center;justify-content:center;
    text-align:center;opacity:1;transform:scale(1) translateY(0);
    transition:opacity .32s ease, transform .4s ease, filter .32s ease;cursor:pointer;}
  .hsc-slide.out{opacity:0;transform:scale(.86);filter:blur(1px);}
  .hsc-slide.in{opacity:0;transform:scale(.86) translateY(6px);}
  .hsc-kicker{font-size:9.5px;letter-spacing:.09em;color:#F7D26B;font-weight:800;font-family:Georgia,serif;}
  .hsc-subtitle{font-size:7.6px;color:#d8d0c2;margin-top:2px;letter-spacing:.02em;}
  .hsc-bottle{height:44%;display:flex;align-items:flex-end;justify-content:center;margin-top:4px;
    filter:drop-shadow(0 8px 8px rgba(0,0,0,.55));animation:hscFloat 3.6s ease-in-out infinite;}
  .hsc-bottle img, .hsc-bottle svg{height:100%;width:auto;max-width:100%;object-fit:contain;}
  .hsc-bottle > span{height:100%;display:flex;align-items:flex-end;justify-content:center;}
  @keyframes hscFloat{0%,100%{transform:translateY(0);}50%{transform:translateY(-4px);}}
  .hsc-price{font-size:14px;font-weight:800;color:#F7D26B;margin-top:4px;letter-spacing:.01em;}
  .hsc-price .strike{font-size:9px;color:#8a8a8a;text-decoration:line-through;margin-left:5px;font-weight:600;}
  .hsc-dots{position:absolute;bottom:7%;left:0;right:0;display:flex;justify-content:center;gap:5px;z-index:11;}
  .hsc-dot{width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.35);cursor:pointer;transition:.2s;border:none;padding:0;}
  .hsc-dot.active{width:14px;border-radius:3px;background:linear-gradient(90deg,#F7D26B,#E8590C);}
  .hsc-arrow{position:absolute;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;
    display:flex;align-items:center;justify-content:center;background:transparent;border:none;
    z-index:11;cursor:pointer;color:#f2d9b0;font-size:13px;transition:background .15s;}
  .hsc-arrow.left{left:-15px;}
  .hsc-arrow.right{right:-15px;}
  .hsc-arrow:active,.hsc-arrow:hover{background:rgba(255,180,90,.12);}
  .hsc-spur{position:absolute;inset:0;width:100%;height:100%;z-index:4;pointer-events:none;}
  .hsc-spur path{fill:none;stroke:rgba(255,150,40,.20);stroke-width:1.6;stroke-linecap:round;stroke-dasharray:1.5 8;}
  .hsc-pulse-core,.hsc-pulse-t1,.hsc-pulse-t2{position:absolute;left:0;top:0;border-radius:50%;z-index:7;opacity:0;pointer-events:none;offset-rotate:0deg;}
  .hsc-pulse-core{width:9px;height:9px;background:radial-gradient(circle,#fff8e6 0%,#ffbb5e 45%,rgba(255,120,20,0) 76%);
    box-shadow:0 0 10px 3px rgba(255,170,70,.9),0 0 22px 9px rgba(255,120,20,.5);}
  .hsc-pulse-t1{width:6px;height:6px;background:radial-gradient(circle,rgba(255,190,110,.7),rgba(255,120,20,0) 75%);}
  .hsc-pulse-t2{width:4px;height:4px;background:radial-gradient(circle,rgba(255,190,110,.45),rgba(255,120,20,0) 75%);}
  .hsc-traveling{opacity:1;animation:hscTravel 1.5s cubic-bezier(.45,0,.25,1) forwards;}
  .hsc-pulse-t1.hsc-traveling{animation-delay:55ms;}
  .hsc-pulse-t2.hsc-traveling{animation-delay:110ms;}
  @keyframes hscTravel{
    0%{offset-distance:0%;opacity:0;}
    6%{opacity:1;}
    90%{opacity:.9;}
    100%{offset-distance:100%;opacity:0;}
  }
  .hsc-pulse-ring{position:absolute;width:28px;height:28px;border-radius:50%;border:1.5px solid rgba(255,150,40,.7);z-index:6;opacity:0;pointer-events:none;}
  .hsc-pulse-ring.fire{animation:hscRingOut 750ms ease-out forwards;}
  @keyframes hscRingOut{0%{opacity:.8;transform:scale(.6);}100%{opacity:0;transform:scale(2.6);}}
  @media (prefers-reduced-motion: reduce){
    .hsc-glow-ring,.hsc-ring-highlight,.hsc-bottle{animation:none !important;}
    .hsc-spark{animation:none !important;opacity:.3;}
    .hsc-sparks{opacity:.35;}
  }
`;

function placeholderBottleSVG(seed: string) {
  const colors = ["#e0a24a", "#e8c26b", "#b23b3b", "#5aa0b3", "#8a6fb0"];
  const color = colors[Math.abs(seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % colors.length];
  const id = color.replace("#", "") + seed.replace(/[^a-z0-9]/gi, "").slice(0, 6);
  return `<svg width="62" height="128" viewBox="0 0 62 128" aria-hidden="true">
    <defs><linearGradient id="hb${id}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.55"/>
      <stop offset="45%" stop-color="${color}" stop-opacity="1"/>
      <stop offset="60%" stop-color="#fff" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0.85"/>
    </linearGradient></defs>
    <ellipse cx="31" cy="122" rx="17" ry="4" fill="rgba(0,0,0,0.4)"/>
    <rect x="26" y="2" width="10" height="16" rx="2" fill="#D4A93B"/>
    <path d="M22 18 L40 18 L45 36 L45 112 Q45 119 38 119 L24 119 Q17 119 17 112 L17 36 Z" fill="url(#hb${id})"/>
    <rect x="20" y="52" width="22" height="26" rx="1.5" fill="rgba(10,8,4,0.55)"/>
    <rect x="20" y="52" width="22" height="4" fill="rgba(255,255,255,0.15)"/>
    <line x1="24" y1="24" x2="24" y2="112" stroke="rgba(255,255,255,0.25)" stroke-width="1.4"/>
  </svg>`;
}

export function HeroShowcase() {
  const [config, setConfig] = useState<HeroShowcaseConfig | null>(null);
  const [current, setCurrent] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [entering, setEntering] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();

  const outerRef = useRef<HTMLDivElement>(null);
  const sparksRef = useRef<SVGSVGElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);
  const spurPathRef = useRef<SVGPathElement>(null);
  const pulseCoreRef = useRef<HTMLDivElement>(null);
  const pulseT1Ref = useRef<HTMLDivElement>(null);
  const pulseT2Ref = useRef<HTMLDivElement>(null);
  const pulseRingRef = useRef<HTMLDivElement>(null);

  const animatingRef = useRef(false);
  const pausedRef = useRef(false);
  const visibleRef = useRef(true);
  const cycleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentRef = useRef(0);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const swipedRef = useRef(false);
  currentRef.current = current;

  const reducedMotion = () =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/hero-showcase")
      .then(r => (r.ok ? r.json() : null))
      .then((cfg: HeroShowcaseConfig | null) => {
        if (cancelled || !cfg || !cfg.enabled || cfg.products.length === 0) return;
        setConfig(cfg);
      })
      .catch(() => {}); // decorative — fail silently
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  /* spark field, spur path, cycle scheduling */
  const products = config?.products ?? [];

  const arrivalFX = useCallback(() => {
    const flash = flashRef.current, sparks = sparksRef.current, pf = particlesRef.current;
    if (flash) {
      flash.classList.remove("burst");
      void flash.offsetWidth;
      flash.classList.add("burst");
    }
    if (reducedMotion()) return;
    if (sparks) {
      sparks.classList.remove("boost");
      void sparks.getBoundingClientRect();
      sparks.classList.add("boost");
      setTimeout(() => sparks.classList.remove("boost"), 700);
    }
    if (pf) {
      pf.innerHTML = "";
      for (let i = 0; i < 16; i++) {
        const p = document.createElement("div");
        p.className = "hsc-particle";
        const angle = (Math.PI * 2 / 16) * i + (Math.random() - 0.5) * 0.3;
        const dist = 40 + Math.random() * 26;
        p.style.setProperty("--px", `${Math.cos(angle) * dist}px`);
        p.style.setProperty("--py", `${Math.sin(angle) * dist}px`);
        p.style.animationDelay = `${Math.random() * 80}ms`;
        pf.appendChild(p);
      }
      requestAnimationFrame(() => pf.querySelectorAll(".hsc-particle").forEach(p => p.classList.add("fly")));
      setTimeout(() => { pf.innerHTML = ""; }, 800);
    }
  }, []);

  const swapTo = useCallback((i: number) => {
    if (reducedMotion()) {
      setCurrent(i);
      setTimeout(() => { animatingRef.current = false; }, 200);
      return;
    }
    setLeaving(true);
    setTimeout(() => {
      setCurrent(i);
      setLeaving(false);
      setEntering(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setEntering(false)));
      setTimeout(() => { animatingRef.current = false; }, 380);
    }, 300);
  }, []);

  const firePulse = useCallback((onArrive: () => void) => {
    if (reducedMotion()) { onArrive(); return; }
    const ring = pulseRingRef.current;
    if (ring) { ring.classList.remove("fire"); void ring.offsetWidth; ring.classList.add("fire"); }
    [pulseCoreRef, pulseT1Ref, pulseT2Ref].forEach(r => {
      const el = r.current;
      if (el) { el.classList.remove("hsc-traveling"); void el.offsetWidth; el.classList.add("hsc-traveling"); }
    });
    setTimeout(onArrive, 1500);
  }, []);

  const scheduleCycle = useCallback(function schedule() {
    if (cycleRef.current) clearTimeout(cycleRef.current);
    cycleRef.current = null;
    if (pausedRef.current || !visibleRef.current || document.hidden || products.length < 2) return;
    cycleRef.current = setTimeout(() => {
      if (animatingRef.current) { schedule(); return; }
      animatingRef.current = true;
      firePulse(() => {
        arrivalFX();
        swapTo((currentRef.current + 1) % products.length);
      });
      schedule();
    }, 7000);
  }, [products.length, firePulse, arrivalFX, swapTo]);

  const manualGoTo = useCallback((i: number) => {
    if (i === currentRef.current || animatingRef.current) return;
    if (cycleRef.current) clearTimeout(cycleRef.current);
    animatingRef.current = true;
    arrivalFX(); // local flash only — no full pulse for manual navigation
    swapTo(i);
    setTimeout(scheduleCycle, 420);
  }, [arrivalFX, swapTo, scheduleCycle]);

  const pauseThenResume = useCallback(() => {
    pausedRef.current = true;
    if (cycleRef.current) clearTimeout(cycleRef.current);
    if (resumeRef.current) clearTimeout(resumeRef.current);
    resumeRef.current = setTimeout(() => { pausedRef.current = false; scheduleCycle(); }, 4000);
  }, [scheduleCycle]);

  /* mount effects: sparks, spur path, observers */
  useEffect(() => {
    if (!config) return;
    if (isMobile ? !config.showOnMobile : !config.showOnDesktop) return; // hidden on this device
    const sparks = sparksRef.current;
    if (sparks && !sparks.hasChildNodes()) {
      const cx = 100, cy = 100, innerR = 66, N = 44;
      let svg = "";
      for (let i = 0; i < N; i++) {
        const angle = (Math.PI * 2 / N) * i + (Math.random() - 0.5) * 0.25;
        const len = 5.6 + Math.random() * 12; // client-approved 5.6–17.6px
        const x1 = cx + Math.cos(angle) * innerR, y1 = cy + Math.sin(angle) * innerR;
        const x2 = cx + Math.cos(angle) * (innerR + len), y2 = cy + Math.sin(angle) * (innerR + len);
        const width = 0.6 + Math.random() * 1.1;
        const dur = (1.6 + Math.random() * 2.2).toFixed(2), delay = (Math.random() * 2.4).toFixed(2);
        const minO = (0.1 + Math.random() * 0.15).toFixed(2), maxO = (0.55 + Math.random() * 0.4).toFixed(2);
        const color = i % 3 === 0 ? "#ffe3ad" : "#ffb454";
        svg += `<line class="hsc-spark" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="${width.toFixed(2)}" stroke-linecap="round" style="--dur:${dur}s;--delay:${delay}s;--min:${minO};--max:${maxO}"/>`;
      }
      sparks.innerHTML = svg;
    }

    const hero = outerRef.current?.closest(".hero-section") as HTMLElement | null;
    if (!hero) return;

    const layoutSpur = () => {
      const rect = hero.getBoundingClientRect();
      const a = isMobile ? ANCHOR.mobile : ANCHOR.desktop;
      const pos = isMobile ? config.mobile : config.desktop;
      const ax = rect.width * a.x, ay = rect.height * a.y;
      let cxPx: number;
      if (isMobile) cxPx = rect.width - rect.width * (config.mobile.right / 100) - pos.size / 2;
      else cxPx = rect.width * (config.desktop.left / 100) + pos.size / 2;
      const cyPx = rect.height - rect.height * (pos.bottom / 100) - pos.size / 2;
      const mx = (ax + cxPx) / 2 + a.bowX, my = (ay + cyPx) / 2 + a.bowY;
      const d = `M ${ax.toFixed(1)} ${ay.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${cxPx.toFixed(1)} ${cyPx.toFixed(1)}`;
      spurPathRef.current?.setAttribute("d", d);
      [pulseCoreRef, pulseT1Ref, pulseT2Ref].forEach(r => {
        if (r.current) r.current.style.offsetPath = `path('${d}')`;
      });
      if (pulseRingRef.current) {
        pulseRingRef.current.style.left = `${ax - 14}px`;
        pulseRingRef.current.style.top = `${ay - 14}px`;
      }
    };
    layoutSpur();
    window.addEventListener("resize", layoutSpur);

    const onVis = () => {
      if (document.hidden) { if (cycleRef.current) clearTimeout(cycleRef.current); }
      else scheduleCycle();
    };
    document.addEventListener("visibilitychange", onVis);

    let io: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(entries => {
        visibleRef.current = entries[0].isIntersecting;
        if (visibleRef.current && !document.hidden && !pausedRef.current) scheduleCycle();
        else if (cycleRef.current) clearTimeout(cycleRef.current);
      }, { threshold: 0.2 });
      io.observe(hero);
    }

    scheduleCycle();
    return () => {
      window.removeEventListener("resize", layoutSpur);
      document.removeEventListener("visibilitychange", onVis);
      io?.disconnect();
      if (cycleRef.current) clearTimeout(cycleRef.current);
      if (resumeRef.current) clearTimeout(resumeRef.current);
    };
  }, [config, isMobile, scheduleCycle]);

  if (!config) return null;
  // per-device visibility, admin-controlled (desktop defaults OFF — its hero
  // artwork has no clean dark zone like mobile's bottom-right corner)
  if (isMobile ? !config.showOnMobile : !config.showOnDesktop) return null;
  const pos = isMobile ? config.mobile : config.desktop;
  const p = products[current];
  if (!p) return null;

  const outerStyle: React.CSSProperties = isMobile
    ? { width: config.mobile.size, right: `${config.mobile.right}%`, bottom: `${config.mobile.bottom}%` }
    : { width: config.desktop.size, left: `${config.desktop.left}%`, bottom: `${config.desktop.bottom}%` };

  function handleSlideClick() {
    if (swipedRef.current || !p.url) return;
    if (p.url.startsWith("/")) router.push(p.url);
    else window.open(p.url, "_blank", "noopener");
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: showcaseCSS }} />
      <svg className="hsc-spur" aria-hidden="true"><path ref={spurPathRef} d="" /></svg>
      <div ref={pulseT2Ref} className="hsc-pulse-t2" />
      <div ref={pulseT1Ref} className="hsc-pulse-t1" />
      <div ref={pulseCoreRef} className="hsc-pulse-core" />
      <div ref={pulseRingRef} className="hsc-pulse-ring" />

      <div ref={outerRef} className="hsc-outer" style={outerStyle}>
        <div className="hsc-glow-ring" />
        <svg ref={sparksRef} className="hsc-sparks" viewBox="0 0 200 200" aria-hidden="true" />
        <div
          className="hsc-circle"
          onMouseDown={pauseThenResume}
          onTouchStart={e => {
            pauseThenResume();
            touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            swipedRef.current = false;
          }}
          onTouchEnd={e => {
            if (!touchRef.current) return;
            const dx = e.changedTouches[0].clientX - touchRef.current.x;
            if (Math.abs(dx) > 40) {
              swipedRef.current = true;
              manualGoTo(dx < 0 ? (current + 1) % products.length : (current - 1 + products.length) % products.length);
              setTimeout(() => { swipedRef.current = false; }, 300);
            }
            touchRef.current = null;
          }}
        >
          <div ref={flashRef} className="hsc-flash" />
          <div className="hsc-ring-highlight" />
          <div ref={particlesRef} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />

          <div
            className={`hsc-slide ${leaving ? "out" : ""} ${entering ? "in" : ""}`}
            onClick={handleSlideClick}
            role={p.url ? "link" : undefined}
            aria-label={`${p.kicker} — $${p.price.toFixed(2)}`}
          >
            <div className="hsc-kicker">{p.kicker}</div>
            <div className="hsc-subtitle">{p.subtitle}</div>
            <div className="hsc-bottle">
              {p.imageUrl ? (
                <img src={p.imageUrl} alt={p.kicker} loading={current === 0 ? "eager" : "lazy"} />
              ) : (
                <span dangerouslySetInnerHTML={{ __html: placeholderBottleSVG(p.id) }} />
              )}
            </div>
            <div className="hsc-price">
              ${p.price.toFixed(2)}
              {p.regularPrice ? <span className="strike">${p.regularPrice.toFixed(2)}</span> : null}
            </div>
          </div>

          {products.length > 1 && (
            <>
              <button type="button" className="hsc-arrow left" aria-label="Previous product"
                onClick={() => manualGoTo((current - 1 + products.length) % products.length)}>❮</button>
              <button type="button" className="hsc-arrow right" aria-label="Next product"
                onClick={() => manualGoTo((current + 1) % products.length)}>❯</button>
              <div className="hsc-dots">
                {products.map((_, i) => (
                  <button key={i} type="button" aria-label={`Product ${i + 1}`}
                    className={`hsc-dot ${i === current ? "active" : ""}`}
                    onClick={() => manualGoTo(i)} />
                ))}
              </div>
            </>
          )}
        </div>
        {p.badge && <div className="hsc-badge">
          {p.badge.split("\n").map((line, i) => <span key={i}>{i > 0 && <br />}{line}</span>)}
        </div>}
      </div>

      {/* preload next slide's image so the transition never pops in blank */}
      {products.length > 1 && products[(current + 1) % products.length].imageUrl && (
        <link rel="preload" as="image" href={products[(current + 1) % products.length].imageUrl!} />
      )}
    </>
  );
}
