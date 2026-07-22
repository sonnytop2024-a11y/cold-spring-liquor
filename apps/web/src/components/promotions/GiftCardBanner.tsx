import Link from "next/link";
import type { BonusTier } from "@/lib/db";

function Check() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
      <circle cx="8" cy="8" r="7" stroke="#FFB800" strokeWidth="1.2" strokeOpacity="0.7" />
      <path d="M5.5 8L7 9.8L10.5 5.8" stroke="#FFB800" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Same illustrative language (glow, bokeh, gradients) as BottlePlaceholder in
// BundleDeals — a stacked "digital card" instead of bottles. The bonus badge
// only renders while `tier` is set, so a promo that ends doesn't linger here.
function GiftCardArt({ tier }: { tier: BonusTier | null }) {
  const displayAmount = tier?.minAmount ?? 50;
  return (
    <svg viewBox="0 0 320 262" fill="none" style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <radialGradient id="gcb-glow1" cx="70%" cy="80%" r="60%">
          <stop offset="0%" stopColor="#FFB800" stopOpacity="0.30" />
          <stop offset="60%" stopColor="#FF6B00" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="gcb-cardBack" x1="10%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%" stopColor="#241704" />
          <stop offset="100%" stopColor="#120a00" />
        </linearGradient>
        <linearGradient id="gcb-cardFront" x1="6%" y1="0%" x2="94%" y2="100%">
          <stop offset="0%" stopColor="#2a1a02" />
          <stop offset="45%" stopColor="#1c1200" />
          <stop offset="100%" stopColor="#0d0800" />
        </linearGradient>
        <linearGradient id="gcb-sheen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.10" />
          <stop offset="35%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id="gcb-blur1"><feGaussianBlur stdDeviation="8" /></filter>
        <filter id="gcb-blur2"><feGaussianBlur stdDeviation="2.4" /></filter>
      </defs>

      <ellipse cx="170" cy="225" rx="120" ry="34" fill="url(#gcb-glow1)" filter="url(#gcb-blur1)" />

      {/* bokeh */}
      <circle cx="272" cy="34" r="3" fill="#FFB800" opacity="0.5" filter="url(#gcb-blur2)" />
      <circle cx="40" cy="60" r="2.2" fill="#FF6B00" opacity="0.4" filter="url(#gcb-blur2)" />
      <circle cx="300" cy="150" r="2.6" fill="#FFB800" opacity="0.35" filter="url(#gcb-blur2)" />
      <circle cx="18" cy="180" r="2" fill="#FFB800" opacity="0.3" filter="url(#gcb-blur2)" />

      {/* back card, tilted */}
      <g transform="rotate(-9 160 130)">
        <rect x="58" y="70" width="210" height="128" rx="16" fill="url(#gcb-cardBack)" stroke="#FFB800" strokeOpacity="0.18" strokeWidth="1" />
      </g>

      {/* front card */}
      <g transform="rotate(6 160 130)">
        <rect x="52" y="60" width="216" height="132" rx="18" fill="url(#gcb-cardFront)" stroke="#FFB800" strokeOpacity="0.55" strokeWidth="1.4" />
        <rect x="52" y="60" width="216" height="132" rx="18" fill="url(#gcb-sheen)" />

        <circle cx="82" cy="90" r="14" fill="none" stroke="#FFB800" strokeWidth="1.3" strokeOpacity="0.85" />
        <text x="82" y="95" textAnchor="middle" fontSize="11" fontWeight="700" fill="#FFB800" fontFamily="Georgia,serif">CS</text>

        <text x="106" y="86" fontSize="9" letterSpacing="1.5" fill="#FFB800" fillOpacity="0.75" fontWeight="700">COLD SPRING</text>
        <text x="106" y="98" fontSize="7.5" letterSpacing="3" fill="#8a7040" fontWeight="600">LIQUOR</text>

        <text x="220" y="178" textAnchor="end" fontSize="8.5" letterSpacing="2" fill="#8a7040" fontWeight="700">GIFT CARD</text>
        <text x="220" y="163" textAnchor="end" fontSize="28" fontWeight="900" fill="#FFD866" fontFamily="Georgia,serif">${displayAmount}</text>

        <rect x="70" y="118" width="26" height="19" rx="3.5" fill="#FFB800" fillOpacity="0.16" stroke="#FFB800" strokeOpacity="0.5" strokeWidth="0.8" />
        <line x1="70" y1="127.5" x2="96" y2="127.5" stroke="#FFB800" strokeOpacity="0.35" strokeWidth="0.6" />
      </g>

      {tier && (
        <g transform="rotate(-8 258 78)">
          <rect x="222" y="60" width="82" height="30" rx="15" fill="url(#gcb-cardFront)" stroke="#FFB800" strokeWidth="1.3" />
          <text x="263" y="80" textAnchor="middle" fontSize="11.5" fontWeight="800" fill="#FFD866">
            +${tier.bonusAmount}
          </text>
        </g>
      )}
    </svg>
  );
}

export function GiftCardBanner({ bonusTiers }: { bonusTiers: BonusTier[] }) {
  // Lowest threshold among active tiers — the easiest one to headline. If the
  // promo ever ends (admin deactivates every tier), this is null and the
  // banner quietly drops back to its evergreen form instead of lying.
  const tier = bonusTiers.length > 0
    ? bonusTiers.reduce((lowest, t) => (t.minAmount < lowest.minAmount ? t : lowest))
    : null;

  return (
    <section style={{ background: "#0a0a0a", padding: "60px 0 68px", position: "relative", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background:
            "radial-gradient(ellipse 55% 45% at 85% 15%, rgba(255,184,0,0.07), transparent 60%)," +
            "radial-gradient(ellipse 45% 40% at 8% 90%, rgba(255,107,0,0.06), transparent 60%)",
        }}
      />

      <div className="container-main" style={{ position: "relative" }}>
        <style>{`
          .gcb-card { display: flex; align-items: center; gap: 44px; flex-direction: column; }
          .gcb-left { text-align: center; }
          .gcb-eyebrow, .gcb-bonus-chip, .gcb-sub, .gcb-features { margin-left: auto; margin-right: auto; }
          .gcb-features li { text-align: left; }
          .gcb-right { width: 78%; max-width: 300px; }
          @media (min-width: 860px) {
            .gcb-card { flex-direction: row; align-items: center; padding: 40px 36px !important; }
            .gcb-left { text-align: left; flex: 1 1 54%; min-width: 0; }
            .gcb-eyebrow, .gcb-bonus-chip, .gcb-sub { margin-left: 0; margin-right: 0; }
            .gcb-right { flex: 0 0 auto; width: 42%; max-width: 340px; }
          }
        `}</style>

        <div
          className="gcb-card"
          style={{
            position: "relative",
            borderRadius: 22,
            border: "1.5px solid rgba(255,184,0,0.35)",
            background: "linear-gradient(150deg,#120a00 0%,#1e1400 60%,#0d0800 100%)",
            boxShadow: "0 0 46px rgba(255,184,0,0.14), 0 10px 50px rgba(0,0,0,0.75)",
            padding: "32px 22px 34px",
            overflow: "hidden",
          }}
        >
          <div className="gcb-left" style={{ position: "relative", zIndex: 2 }}>
            <div
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                background: "rgba(255,184,0,0.09)", border: "1px solid rgba(255,184,0,0.28)",
                borderRadius: 99, padding: "5px 15px", marginBottom: 16,
              }}
              className="gcb-eyebrow"
            >
              <span style={{ color: "#FFB800", fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                🎁 Digital Gift Cards
              </span>
            </div>

            <h2 style={{ fontSize: "clamp(26px,4.6vw,40px)", fontWeight: 900, lineHeight: 1.08, margin: "0 0 12px", color: "#fff" }}>
              Give the Gift of{" "}
              <span style={{ color: "#FFB800", textShadow: "0 0 22px rgba(255,184,0,0.75), 0 0 48px rgba(255,184,0,0.3)" }}>
                Great Drinks
              </span>
            </h2>

            <p className="gcb-sub" style={{ color: "#888", fontSize: 14.5, lineHeight: 1.55, maxWidth: 440, margin: "0 0 20px" }}>
              Any amount, any occasion — delivered straight to their inbox in seconds. No shipping, no waiting.
            </p>

            {tier && (
              <div
                className="gcb-bonus-chip"
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: "linear-gradient(90deg, rgba(255,184,0,0.14), rgba(255,107,0,0.06))",
                  border: "1px solid rgba(255,184,0,0.4)", borderRadius: 12,
                  padding: "11px 15px", marginBottom: 22, maxWidth: 460,
                }}
              >
                <div
                  style={{
                    flexShrink: 0, width: 26, height: 26, borderRadius: "50%",
                    background: "radial-gradient(circle,#FFB800,#FF6B00)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
                    boxShadow: "0 0 14px rgba(255,184,0,0.6)",
                  }}
                >
                  ✨
                </div>
                <p style={{ margin: 0, fontSize: 12.5, color: "#f0d9a0", lineHeight: 1.4 }}>
                  <strong style={{ color: "#fff", fontWeight: 800 }}>New:</strong> Spend ${tier.minAmount}+ and get a ${tier.bonusAmount} Bonus
                  Card automatically — no code needed.
                </p>
              </div>
            )}

            <ul className="gcb-features" style={{ listStyle: "none", margin: "0 0 26px", padding: 0, display: "flex", flexDirection: "column", gap: 9, maxWidth: 440 }}>
              <li style={{ display: "flex", alignItems: "flex-start", gap: 8, color: "#aaa", fontSize: 13, lineHeight: 1.5 }}>
                <Check /> Any amount from $5–$500
              </li>
              <li style={{ display: "flex", alignItems: "flex-start", gap: 8, color: "#aaa", fontSize: 13, lineHeight: 1.5 }}>
                <Check /> Delivered by email — usually within seconds
              </li>
              <li style={{ display: "flex", alignItems: "flex-start", gap: 8, color: "#aaa", fontSize: 13, lineHeight: 1.5 }}>
                <Check /> Redeemable on any purchase, never expires
              </li>
            </ul>

            <Link
              href="/gift-cards"
              style={{
                display: "inline-flex", alignItems: "center", gap: 9,
                background: "linear-gradient(90deg,#FFC62A,#FF7A00)",
                color: "#1a1108", fontWeight: 800, fontSize: 14.5,
                padding: "14px 28px", borderRadius: 12, textDecoration: "none",
                boxShadow: "0 10px 28px rgba(255,140,0,0.32)",
              }}
            >
              Send a Gift Card <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="gcb-right" style={{ position: "relative", zIndex: 2, aspectRatio: "1/0.82" }}>
            <GiftCardArt tier={tier} />
          </div>
        </div>
      </div>
    </section>
  );
}
