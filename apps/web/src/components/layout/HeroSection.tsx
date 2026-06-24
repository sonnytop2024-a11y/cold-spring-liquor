import Link from "next/link";
import { HeroIllustration } from "./HeroIllustration";

export function HeroSection() {
  return (
    <section
      className="relative overflow-hidden text-white"
      style={{ background: "linear-gradient(135deg, #0d0d0d 0%, #1a1008 40%, #0f0a00 100%)" }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 70% 50%, rgba(249,115,22,0.12) 0%, transparent 70%)",
        }}
      />
      {/* Grain texture */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: "128px",
        }}
      />

      <div className="container-main relative z-10">
        <div className="grid lg:grid-cols-[1fr_420px] gap-10 lg:gap-16 items-center py-16 md:py-24">

          {/* ── Left: Content ─────────────────────────────────────── */}
          <div className="space-y-7">
            {/* Location pill */}
            <div className="inline-flex items-center gap-2 border border-white/15 bg-white/5 backdrop-blur-sm text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-pulse" />
              Leander · Cedar Park · Liberty Hill, TX
            </div>

            {/* Headline */}
            <div>
              <h1 className="font-heading text-5xl md:text-7xl font-black leading-[0.95] tracking-tight mb-4">
                Premium
                <br />
                <span style={{ color: "#f97316" }}>Liquor</span>
                <br />
                Delivered.
              </h1>
              <p
                className="text-xl md:text-2xl font-bold"
                style={{ color: "#f97316" }}
              >
                FREE Delivery. NO Tip. Ever.
              </p>
            </div>

            {/* Body */}
            <p className="text-gray-400 text-base md:text-lg leading-relaxed max-w-lg">
              The only liquor delivery in the area with{" "}
              <span className="text-white font-semibold">absolutely no extra charges</span> —
              no delivery fee, no tip, no hidden costs. Just premium spirits at your door in 10–30 minutes.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 font-bold px-8 py-4 rounded-xl text-base transition-all text-white shadow-lg"
                style={{
                  background: "linear-gradient(135deg, #f97316, #ea580c)",
                  boxShadow: "0 8px 24px rgba(249,115,22,0.35)",
                }}
              >
                Shop Now →
              </Link>
              <Link
                href="#delivery-check"
                className="inline-flex items-center gap-2 font-bold px-8 py-4 rounded-xl text-base border border-white/20 hover:border-white/50 hover:bg-white/5 transition-all text-white/90"
              >
                Check My Area
              </Link>
            </div>

            {/* Stats */}
            <div
              className="flex gap-6 pt-2 border-t"
              style={{ borderColor: "rgba(255,255,255,0.08)" }}
            >
              {[
                { value: "$0", label: "Delivery Fee" },
                { value: "$0", label: "Tip" },
                { value: "10–30", label: "Min Delivery" },
                { value: "500+", label: "Products" },
              ].map(({ value, label }, i) => (
                <div key={label} className={i > 0 ? "pl-6 border-l border-white/10" : ""}>
                  <p className="text-2xl md:text-3xl font-black text-white">{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Illustrated bottle showcase + delivery scene ── */}
          <div className="hidden lg:block relative h-[520px]">
            <HeroIllustration />
          </div>
        </div>
      </div>

      {/* ── Trust bar ─────────────────────────────────────────────── */}
      <div
        className="relative z-10"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)" }}
      >
        <div className="container-main py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: "🚚", label: "FREE Delivery", sub: "No minimum, every order" },
              { icon: "💰", label: "No Tip Required", sub: "We pay our drivers fairly" },
              { icon: "⚡", label: "10–30 Min", sub: "Fastest in Leander area" },
              { icon: "🔒", label: "Safe & Secure", sub: "Verified ID at delivery" },
            ].map(({ icon, label, sub }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-2xl">{icon}</span>
                <div>
                  <p className="font-bold text-sm text-white">{label}</p>
                  <p className="text-xs text-gray-500">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
