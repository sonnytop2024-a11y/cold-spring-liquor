'use client';

const TIERS = [
  {
    qty: 3, label: "3 Bottles", pct: 5,
    features: ["Mix & Match any 3 bottles", "Automatically applied at checkout"],
    badge: null as null | string, badgePos: null as null | 'center' | 'corner',
    accent: "#FF6B00",
    borderColor: "rgba(255,107,0,0.50)",
    glow: "rgba(255,107,0,0.25)",
    bottleImg: "",
    featured: false,
  },
  {
    qty: 6, label: "6 Bottles", pct: 10,
    features: ["Best value — stock up & save", "Automatically applied at checkout"],
    badge: "👑 BEST VALUE", badgePos: 'corner' as null | 'center' | 'corner',
    accent: "#FFB800",
    borderColor: "rgba(255,184,0,0.60)",
    glow: "rgba(255,184,0,0.28)",
    bottleImg: "",
    featured: true,
  },
];

function MiniBottle({ color }: { color: string }) {
  return (
    <svg width="14" height="32" viewBox="0 0 14 32" fill="none">
      <rect x="4.5" y="0.5" width="5" height="5" rx="1.5" stroke={color} strokeWidth="1.3"/>
      <path d="M4 5.5C2 7.5 1.5 10 1.5 13.5V26C1.5 28.2 3.1 30 5 30H9C10.9 30 12.5 28.2 12.5 26V13.5C12.5 10 12 7.5 10 5.5Z" stroke={color} strokeWidth="1.3" fill="none"/>
    </svg>
  );
}

function Check({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
      <circle cx="8" cy="8" r="7" stroke={color} strokeWidth="1.2" strokeOpacity="0.7"/>
      <path d="M5.5 8L7 9.8L10.5 5.8" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function BottlePlaceholder({ qty, accent, glow }: { qty: number; accent: string; glow: string }) {
  // Renders when no real photo is provided
  const hList = [120, 136, 128, 118];
  const wList = [32, 36, 34, 30];
  const centers = qty <= 2
    ? [58, 102]
    : qty === 3
    ? [42, 80, 118]
    : qty === 4
    ? [32, 62, 98, 128]
    : qty <= 6
    ? [22, 48, 74, 100, 126, 150].slice(0, qty)
    : [22, 48, 74, 100, 126];

  return (
    <svg viewBox="0 0 160 190" style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <radialGradient id={`g-${qty}`} cx="50%" cy="90%" r="60%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.35"/>
          <stop offset="60%" stopColor={accent} stopOpacity="0.08"/>
          <stop offset="100%" stopColor="#000" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id={`top-${qty}`} cx="50%" cy="30%" r="55%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.06"/>
          <stop offset="100%" stopColor="#000" stopOpacity="0"/>
        </radialGradient>
        <filter id={`f-${qty}`}><feGaussianBlur stdDeviation="7"/></filter>
        <filter id={`fs-${qty}`}><feGaussianBlur stdDeviation="2.5"/></filter>
        {centers.map((_, i) => (
          <linearGradient key={i} id={`b-${qty}-${i}`} x1="15%" y1="0%" x2="85%" y2="100%">
            <stop offset="0%" stopColor="#1a0e00"/>
            <stop offset="35%" stopColor={accent} stopOpacity="0.22"/>
            <stop offset="100%" stopColor="#0d0800"/>
          </linearGradient>
        ))}
      </defs>

      <rect width="160" height="190" fill="#050300"/>
      <ellipse cx="80" cy="175" rx="75" ry="28" fill={glow} filter={`url(#f-${qty})`}/>
      <rect width="160" height="190" fill={`url(#g-${qty})`}/>
      <rect width="160" height="190" fill={`url(#top-${qty})`}/>

      {/* Bokeh */}
      {[[25,50,2.2,0.45],[140,40,1.6,0.35],[90,20,1.9,0.3],[148,100,1.4,0.28],[18,120,1.8,0.32]].map(([cx,cy,r,op],i)=>(
        <circle key={i} cx={cx} cy={cy} r={r} fill={accent} opacity={op} filter={`url(#fs-${qty})`}/>
      ))}

      {/* Smoke wisps */}
      <ellipse cx="60" cy="100" rx="20" ry="45" fill={accent} fillOpacity="0.04" filter={`url(#f-${qty})`}/>
      <ellipse cx="110" cy="115" rx="16" ry="35" fill={accent} fillOpacity="0.03" filter={`url(#f-${qty})`}/>

      {/* Bottles */}
      {centers.map((cx, i) => {
        const h = hList[i % hList.length];
        const w = wList[i % wList.length];
        const x = cx - w / 2;
        const bot = 172;
        const y = bot - h;
        const nW = w * 0.42;
        const nX = cx - nW / 2;
        return (
          <g key={i}>
            <ellipse cx={cx} cy={bot} rx={w * 0.42} ry={4} fill="#000" opacity="0.65" filter={`url(#fs-${qty})`}/>
            {/* body */}
            <rect x={x} y={y + h * 0.13} width={w} height={h * 0.87} rx={w * 0.2} fill={`url(#b-${qty}-${i})`} stroke={accent} strokeWidth="0.7" strokeOpacity="0.4"/>
            {/* neck */}
            <rect x={nX} y={y} width={nW} height={h * 0.16} rx={nW * 0.3} fill="#1a0800" stroke={accent} strokeWidth="0.7" strokeOpacity="0.35"/>
            {/* label */}
            <rect x={x + w * 0.14} y={y + h * 0.35} width={w * 0.72} height={h * 0.28} rx={2.5} fill={accent} fillOpacity="0.09" stroke={accent} strokeWidth="0.5" strokeOpacity="0.55"/>
            <text x={cx} y={y + h * 0.52} textAnchor="middle" fontSize="6.5" fill={accent} fillOpacity="0.8" fontFamily="Georgia,serif" fontWeight="bold">CS</text>
            {/* shine */}
            <rect x={x + 3} y={y + h * 0.14} width={w * 0.14} height={h * 0.38} rx={2} fill="white" fillOpacity="0.055"/>
            {/* neck ring */}
            <rect x={nX - 1} y={y + h * 0.13 - 2} width={nW + 2} height={3} rx={1} fill={accent} fillOpacity="0.45"/>
          </g>
        );
      })}

      {/* Glass tumbler */}
      <g>
        <path d="M61 160 L64 178 L99 178 L102 160 Z" fill={accent} fillOpacity="0.07" stroke={accent} strokeWidth="0.7" strokeOpacity="0.35"/>
        <rect x="65" y="163" width="33" height="11" rx="1.5" fill={accent} fillOpacity="0.09"/>
        {[69,76,84].map(x => <line key={x} x1={x} y1="163" x2={x} y2="174" stroke="white" strokeWidth="0.3" strokeOpacity="0.12"/>)}
      </g>

      {/* Floor reflection */}
      <rect x="0" y="176" width="160" height="14" fill={accent} fillOpacity="0.05"/>
    </svg>
  );
}

export function BundleDeals() {
  return (
    <section style={{ background: "#050505", padding: "64px 0 72px" }}>
      <style>{`
        .bdc-card {
          border-radius: 18px;
          overflow: hidden;
          display: flex;
          position: relative;
          transition: transform .28s ease, box-shadow .28s ease;
          min-height: 190px;
        }
        .bdc-card:hover { transform: translateY(-4px) scale(1.01); }
        .bdc-pct {
          font-weight: 900;
          line-height: 1;
          letter-spacing: -3px;
          display: block;
          font-size: clamp(58px, 16vw, 78px);
        }
        .bdc-badge-center {
          position: absolute;
          top: -15px; left: 50%;
          transform: translateX(-50%);
          padding: 5px 18px;
          border-radius: 99px;
          font-size: 11px; font-weight: 800;
          letter-spacing: 0.12em;
          white-space: nowrap;
          color: #000; z-index: 10;
        }
        .bdc-badge-corner {
          position: absolute;
          top: 12px; right: 12px;
          padding: 4px 12px;
          border-radius: 99px;
          font-size: 10px; font-weight: 800;
          letter-spacing: 0.10em;
          white-space: nowrap;
          color: #000; z-index: 10;
        }
        /* Desktop: 2-column side by side */
        @media (min-width: 640px) {
          .bdc-grid { display: grid !important; grid-template-columns: repeat(2,1fr); gap: 24px !important; flex-direction: unset !important; max-width: 900px !important; }
          .bdc-item { padding-top: 0 !important; }
          .bdc-card { min-height: 220px; }
          .bdc-pct { font-size: 82px !important; }
        }
      `}</style>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            background: "rgba(255,107,0,0.09)", border: "1px solid rgba(255,107,0,0.25)",
            borderRadius: 99, padding: "5px 16px", marginBottom: 14,
          }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M5.5 0.5L6.9 3.9L10.5 4.5L7.8 7.2L8.5 10.8L5.5 9.1L2.5 10.8L3.2 7.2L0.5 4.5L4.1 3.9Z" fill="#FF6B00"/>
            </svg>
            <span style={{ color: "#FF6B00", fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" }}>Bundle &amp; Save</span>
          </div>
          <h2 style={{ fontSize: "clamp(26px,8vw,42px)", fontWeight: 900, color: "#fff", margin: "0 0 10px", lineHeight: 1.1 }}>
            Buy More,{" "}
            <span style={{ color: "#FF6B00", textShadow: "0 0 20px rgba(255,107,0,0.7),0 0 48px rgba(255,107,0,0.3)" }}>
              Save More
            </span>
          </h2>
          <p style={{ color: "#666", fontSize: 13.5, margin: "0 auto", maxWidth: 390 }}>
            Mix and match any bottles — bundle discount applied automatically at checkout.
          </p>
        </div>

        {/* Cards */}
        <div className="bdc-grid" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {TIERS.map(({ qty, label, pct, features, badge, badgePos, accent, borderColor, glow, bottleImg, featured }) => (
            <div key={qty} className="bdc-item" style={{ paddingTop: badgePos === 'center' ? 15 : 0 }}>

              {badgePos === 'center' && badge && (
                <div className="bdc-badge-center" style={{
                  background: "linear-gradient(90deg,#FFC62A,#FF7A00)",
                  boxShadow: `0 0 20px ${glow}`,
                }}>
                  {badge}
                </div>
              )}

              <div
                className="bdc-card"
                style={{
                  background: "linear-gradient(150deg,#0d0d0d 0%,#160b00 100%)",
                  border: `1.5px solid ${borderColor}`,
                  boxShadow: featured
                    ? `0 0 40px ${glow}, 0 8px 44px rgba(0,0,0,0.75)`
                    : `0 0 20px ${glow}, 0 6px 28px rgba(0,0,0,0.65)`,
                }}
              >
                {badgePos === 'corner' && badge && (
                  <div className="bdc-badge-corner" style={{
                    background: "linear-gradient(90deg,#b38a00,#FFB800)",
                    boxShadow: `0 0 14px rgba(255,184,0,0.4)`,
                  }}>
                    {badge}
                  </div>
                )}

                {/* LEFT: text */}
                <div className="bdc-left" style={{ flex: 1, padding: "22px 12px 20px 20px", display: "flex", flexDirection: "column" }}>

                  {/* Bottle icons (max 6 shown) */}
                  <div style={{ display: "flex", gap: 3, marginBottom: 10, flexWrap: "wrap" }}>
                    {Array.from({ length: Math.min(qty, 6) }).map((_, i) => <MiniBottle key={i} color={accent} />)}
                  </div>

                  <div style={{ color: "#aaa", fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{label}</div>

                  <span
                    className="bdc-pct"
                    style={{
                      color: accent,
                      textShadow: `0 0 22px ${glow.replace('0.25','0.8').replace('0.32','0.9')}, 0 0 50px ${glow}`,
                    }}
                  >
                    {pct}%
                  </span>

                  <div style={{ color: "#777", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 14 }}>
                    {pct}% OFF
                  </div>

                  {/* Divider */}
                  <div style={{ height: 1, background: `linear-gradient(90deg,${accent}77,transparent)`, marginBottom: 12 }} />

                  {/* Features */}
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                    {features.map(f => (
                      <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 7, color: "#aaa", fontSize: 12, lineHeight: 1.45 }}>
                        <Check color={accent} />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* RIGHT: bottle imagery */}
                <div className="bdc-right" style={{ width: "46%", flexShrink: 0, position: "relative", overflow: "hidden" }}>
                  {bottleImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={bottleImg} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
                  ) : (
                    <BottlePlaceholder qty={qty} accent={accent} glow={glow} />
                  )}
                  {/* Left edge fade */}
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(90deg,#0d0d0d 0%,rgba(13,13,13,0.5) 25%,transparent 55%)",
                    pointerEvents: "none",
                  }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <p style={{ textAlign: "center", color: "#333", fontSize: 12, marginTop: 28 }}>
          Mix any categories · All bottle sizes · Combines with{" "}
          <span style={{ color: "#FF6B00" }}>FREE delivery</span>
        </p>
      </div>
    </section>
  );
}
