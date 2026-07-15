import Link from "next/link";
import { HeroTruckAnimation } from "./HeroTruckAnimation";

/* ─────────────────────────────────────────────────────────────────────
   Hero CSS – module-level const to avoid React SSR hydration mismatch
───────────────────────────────────────────────────────────────────── */
const heroCSS = `
  .hero-section {
    background: #050302;
    position: relative;
    overflow: hidden;
  }
  .hero-bg-img {
    object-fit: cover;
    object-position: center top;
  }
  .hero-gradient {
    background: linear-gradient(
      148deg,
      rgba(0,0,0,0.42) 0%,
      rgba(0,0,0,0.20) 18%,
      rgba(0,0,0,0.05) 35%,
      transparent 50%
    );
  }

  /* ══════════════════════════════════════════════════════════════════
     MOBILE  < 768px  –  Portrait 9:16 (941×1672 px)
  ══════════════════════════════════════════════════════════════════ */
  @media (max-width: 767px) {
    .hero-section {
      aspect-ratio: 9/16;
      min-height: 560px;
    }
  }

  /* Dark glassmorphism card top-left */
  .hero-card {
    display: flex;
    flex-direction: column;
    max-width: 156px;
    margin-left: -1rem;
    background: rgba(0,0,0,0.64);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-radius: 0 0 22px 0;
  }
  .hero-top {
    display: flex; flex-direction: column; gap: 6px;
    padding: 14px 13px 0 1rem;
  }
  .hero-badge {
    display: inline-flex; align-items: center; gap: 4px;
    border: 1px solid rgba(255,255,255,0.22);
    background: rgba(0,0,0,0.30);
    font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
    font-size: 6.5px; padding: 3px 7px; border-radius: 999px;
    width: fit-content; white-space: nowrap;
  }
  .hero-h1 {
    font-size: 1.40rem; line-height: 0.95; letter-spacing: -0.4px;
    text-shadow: 0 1px 14px rgba(0,0,0,1), 0 1px 4px rgba(0,0,0,1);
    margin: 0;
  }

  /* Old tagline – hidden on mobile, restored on desktop */
  .hero-tagline {
    display: none;
    font-size: 0.73rem; font-weight: 800; color: rgba(255,255,255,0.95);
    line-height: 1.4;
  }

  /* ── New mobile USP text ───────────────────────── */
  .hero-usps {
    font-size: 0.70rem; font-weight: 800;
    color: rgba(255,255,255,0.95);
    line-height: 1.55; letter-spacing: 0.01em;
    -webkit-font-smoothing: antialiased;
  }
  .hero-delivery {
    font-size: 0.64rem; font-weight: 600;
    color: rgba(230,230,230,0.92);
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  /* ── Neon keyword: crisp text + outer-only glow ─ */
  /*
   * Electric Neon Yellow-Green (#CCFF00 = rgb 204,255,0).
   * Glow radius starts at 10px+ → never overlaps letterforms → text stays sharp.
   */
  .neon-kw {
    color: #FFD400;
    font-weight: 900;
    -webkit-font-smoothing: antialiased;
    text-shadow:
      0 0 10px rgba(255,212,0,0.95),
      0 0 22px rgba(255,212,0,0.60),
      0 0 42px rgba(255,212,0,0.25);
    animation: neon-flicker 6s ease-in-out infinite;
  }
  /* Stagger so keywords don't all flicker at the same time */
  .hero-usps    .neon-kw:nth-child(1) { animation-delay: 0.3s;  }
  .hero-usps    .neon-kw:nth-child(2) { animation-delay: 2.1s;  }
  .hero-usps    .neon-kw:nth-child(3) { animation-delay: 3.9s;  }
  .hero-delivery .neon-kw             { animation-delay: 1.5s;  }

  @keyframes neon-flicker {
    0%, 84%, 86%, 88%, 90%, 100% {
      text-shadow:
        0 0 10px rgba(255,212,0,0.95),
        0 0 22px rgba(255,212,0,0.60),
        0 0 42px rgba(255,212,0,0.25);
      opacity: 1;
    }
    85% { text-shadow: 0 0 5px rgba(255,212,0,0.35); opacity: 0.82; }
    87% { text-shadow:
            0 0 12px rgba(255,212,0,1),
            0 0 28px rgba(255,212,0,0.70),
            0 0 52px rgba(255,212,0,0.35);
          opacity: 0.96; }
    89% { text-shadow: 0 0 6px rgba(255,212,0,0.45); opacity: 0.80; }
  }

  /* ── Sweep highlight + hover – desktop/mouse only ─── */
  @media (hover: hover) and (pointer: fine) {
    .neon-kw {
      position: relative;
      display: inline-block;
      overflow: hidden;
    }
    .neon-kw::after {
      content: '';
      position: absolute;
      top: -10%; left: -120%;
      width: 55%; height: 120%;
      background: linear-gradient(
        105deg,
        transparent 10%,
        rgba(255,220,60,0.42) 50%,
        transparent 90%
      );
      animation: neon-sweep 6s ease-in-out infinite;
      pointer-events: none;
    }
    /* Sweep stagger matches flicker stagger */
    .hero-usps    .neon-kw:nth-child(2)::after { animation-delay: 1.8s; }
    .hero-usps    .neon-kw:nth-child(3)::after { animation-delay: 3.6s; }
    .hero-delivery .neon-kw::after             { animation-delay: 1.2s; }

    @keyframes neon-sweep {
      0%, 100%  { left: -120%; opacity: 0; }
      2%        { opacity: 1; }
      28%       { left: 160%; opacity: 0; }
      29%, 99%  { left: -120%; opacity: 0; }
    }

    .neon-kw:hover {
      filter: brightness(1.18);
      transition: filter 0.25s ease;
    }
  }

  /* Heading "Liquor" stays inline so it doesn't break layout */
  .hero-h1 .neon-kw { display: inline; }
  /* Tagline is a block element – don't let neon-kw shrink it */
  p.hero-tagline.neon-kw { display: none; }
  @media (min-width: 768px) {
    p.hero-tagline.neon-kw { display: block; }
  }
  @media (hover: hover) and (pointer: fine) {
    .hero-h1 .neon-kw { display: inline; }
    .hero-h1 .neon-kw::after { display: none; }
    p.hero-tagline.neon-kw { display: block; }
    p.hero-tagline.neon-kw::after { display: none; }
  }

  /* Accessibility – respect reduced-motion preference */
  @media (prefers-reduced-motion: reduce) {
    .neon-kw           { animation: none !important; }
    .neon-kw::after    { display: none !important; }
  }

  .hero-body { display: none; }
  .hero-buttons {
    display: flex; flex-direction: column; gap: 7px;
    padding: 8px 13px 15px 1rem;
  }
  .hero-btn-primary {
    display: flex; align-items: center; justify-content: center; gap: 5px;
    font-size: 0.73rem; font-weight: 700;
    padding: 10px 8px; border-radius: 12px; color: #fff;
    background: linear-gradient(135deg,#ff6a00,#ea580c);
    box-shadow: 0 3px 14px rgba(255,106,0,0.45);
    white-space: nowrap; width: 100%;
  }
  .hero-btn-secondary {
    display: flex; align-items: center; justify-content: center; gap: 5px;
    font-size: 0.73rem; font-weight: 700;
    padding: 10px 8px; border-radius: 12px;
    color: rgba(255,255,255,0.93);
    border: 1.5px solid rgba(255,255,255,0.30);
    background: rgba(0,0,0,0.38); backdrop-filter: blur(10px);
    white-space: nowrap; width: 100%;
  }

  /* iPhone SE ≤ 380px */
  @media (max-width: 380px) {
    .hero-card     { max-width: 140px; }
    .hero-h1       { font-size: 1.22rem; }
    .hero-usps     { font-size: 0.63rem; }
    .hero-delivery { font-size: 0.59rem; }
    .hero-btn-primary, .hero-btn-secondary { font-size: 0.66rem; padding: 9px 6px; }
  }

  /* iPhone Pro Max / Air 415–767px */
  @media (min-width: 415px) and (max-width: 767px) {
    .hero-card     { max-width: 172px; }
    .hero-h1       { font-size: 1.55rem; }
    .hero-usps     { font-size: 0.76rem; }
    .hero-delivery { font-size: 0.68rem; }
    .hero-btn-primary, .hero-btn-secondary { font-size: 0.77rem; padding: 11px 8px; }
  }

  /* ── US Flag · mobile only ─────────────────────────── */
  @media (min-width: 768px) {
  }


  @keyframes usFlagWave {
    0%   { transform: skewX(0deg)    skewY(0deg)    scaleX(1.00); }
    8%   { transform: skewX(-3deg)   skewY(0.5deg)  scaleX(0.97); }
    20%  { transform: skewX(4deg)    skewY(-0.5deg) scaleX(0.99); }
    35%  { transform: skewX(-3.5deg) skewY(0.4deg)  scaleX(0.96); }
    50%  { transform: skewX(4.5deg)  skewY(-0.6deg) scaleX(1.00); }
    65%  { transform: skewX(-3deg)   skewY(0.5deg)  scaleX(0.97); }
    78%  { transform: skewX(3.5deg)  skewY(-0.3deg) scaleX(0.99); }
    90%  { transform: skewX(-2deg)   skewY(0.3deg)  scaleX(0.98); }
    100% { transform: skewX(0deg)    skewY(0deg)    scaleX(1.00); }
  }
  @media (prefers-reduced-motion: reduce) {
  }

  /* ══════════════════════════════════════════════════════════════════
     DESKTOP ≥ 768px  –  Landscape image, normal flow
  ══════════════════════════════════════════════════════════════════ */
  @media (min-width: 768px) {
    .hero-section { min-height: 520px; }
    .hero-bg-img  { object-position: 55% 20%; }
    .hero-gradient {
      background: linear-gradient(
        to right,
        rgba(10,6,2,0.97) 0%, rgba(10,6,2,0.88) 22%,
        rgba(10,6,2,0.55) 38%, rgba(10,6,2,0.15) 54%,
        transparent 68%
      );
    }
    /* Reset mobile card */
    .hero-card {
      max-width: none; margin-left: 0;
      background: transparent; backdrop-filter: none; -webkit-backdrop-filter: none;
      border-radius: 0;
    }
    .hero-top    { max-width: 440px; padding: 64px 0 0; gap: 14px; }
    .hero-badge  { font-size: 10px; padding: 5px 14px; gap: 6px; }
    .hero-h1 {
      font-size: clamp(2.5rem, 4.5vw, 3.75rem);
      letter-spacing: -1.5px; line-height: 0.96;
      text-shadow: 0 2px 24px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.9);
    }
    /* Restore old tagline on desktop, hide new mobile USP blocks */
    .hero-tagline  { display: block; font-size: clamp(1.1rem,2vw,1.3rem); white-space: nowrap; }
    .hero-usps, .hero-delivery { display: none; }
    .hero-body {
      display: block; font-size: 1rem; line-height: 1.5;
      color: rgba(210,210,210,0.9);
      text-shadow: 0 1px 6px rgba(0,0,0,1);
    }
    .hero-buttons { flex-direction: row; padding: 8px 0 0; width: fit-content; }
    .hero-btn-primary   { width: auto; font-size: 0.9rem; padding: 13px 28px; border-radius: 12px; }
    .hero-btn-secondary { width: auto; font-size: 0.9rem; padding: 13px 24px; border-radius: 12px; }
  }
  @media (min-width: 1024px) {
    .hero-section { min-height: 600px; }
    .hero-top     { padding-top: 80px; }
  }
`;

export function HeroSection() {
  return (
    <section className="hero-section">
      <style dangerouslySetInnerHTML={{ __html: heroCSS }} />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <picture className="absolute inset-0 w-full h-full pointer-events-none select-none">
        <source media="(max-width: 767px)" srcSet="/hero-bg-mobile.jpg" />
        <source media="(min-width: 768px)"  srcSet="/hero-bg.jpg" />
        <img src="/hero-bg.jpg" alt="" aria-hidden="true"
          className="hero-bg-img block w-full h-full" />
      </picture>
      <div className="hero-gradient absolute inset-0 pointer-events-none" />
      <HeroTruckAnimation />


      <div className="container-main relative z-10">
        <div className="hero-card">
          <div className="hero-top">

            {/* Location badge */}
            <div className="hero-badge">
              <svg width="8" height="10" viewBox="0 0 10 12" fill="none" aria-hidden="true">
                <path d="M5 0C2.8 0 1 1.8 1 4c0 3 4 8 4 8s4-5 4-8c0-2.2-1.8-4-4-4zm0 5.5A1.5 1.5 0 1 1 5 2.5a1.5 1.5 0 0 1 0 3z" fill="#f97316"/>
              </svg>
              <span className="text-white">Leander · Cedar Park · Liberty Hill, TX</span>
            </div>

            {/* Headline */}
            <h1 className="hero-h1 font-heading font-black text-white">
              Premium<br />
              <span className="neon-kw">Liquor</span><br />
              Delivered.
            </h1>

            {/* Desktop tagline – hidden on mobile via CSS */}
            <p className="hero-tagline neon-kw">FREE Delivery. NO Tip. Ever.</p>

            {/* ── Mobile USP neon text ──────────────────────────── */}
            {/* Line 1: three neon keywords */}
            <p className="hero-usps">
              <span className="neon-kw">No Fee</span>
              {", "}
              <span className="neon-kw">No Tip</span>
              {", "}
              <span className="neon-kw">No Hidden Costs</span>
              {"."}
            </p>
            {/* Line 2: delivery time promise */}
            <p className="hero-delivery">
              Premium spirits at your door in{" "}
              <span className="neon-kw">10–30 min</span>.
            </p>
            {/* ─────────────────────────────────────────────────── */}

            {/* Body copy – desktop only */}
            <p className="hero-body">
              No fee, no tip, no hidden costs.{" "}
              <strong className="text-white">Premium spirits</strong> at your door in{" "}
              <strong className="text-white">10–30 min.</strong>
            </p>
            <p className="hero-body hidden md:block" style={{ marginTop:"-4px" }}>
              The only delivery service in the area with{" "}
              <strong className="text-white">absolutely no extra charges.</strong>
            </p>

          </div>

          {/* CTA buttons */}
          <div className="hero-buttons">
            <Link href="/categories" className="hero-btn-primary">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              Shop Now
            </Link>
            <Link href="#delivery-check" className="hero-btn-secondary">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              Check My Area
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}

export function TrustBar() {
  return (
    <div className="relative z-10"
      style={{ borderTop:"1px solid rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.03)" }}>
      <div className="container-main py-4 xs:py-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 xs:gap-4">
          {[
            { icon:"🚚", label:"FREE Delivery",   sub:"No minimum, every order"  },
            { icon:"💰", label:"No Tip Required", sub:"We pay our drivers fairly" },
            { icon:"⚡", label:"10–30 Min",       sub:"Fastest in Leander area"  },
            { icon:"🔒", label:"Safe & Secure",   sub:"Verified ID at delivery"  },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-2 xs:gap-3">
              <span className="text-xl xs:text-2xl flex-shrink-0">{icon}</span>
              <div className="min-w-0">
                <p className="font-bold text-xs xs:text-sm text-white truncate">{label}</p>
                <p className="text-[10px] xs:text-xs text-gray-500 truncate">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
