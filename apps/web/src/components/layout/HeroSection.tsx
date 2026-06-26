import Link from "next/link";

export function HeroSection() {
  return (
    <>
      <style>{`
        @media (min-width: 1024px) {
          .csl-hero-bg {
            background-size: 70% auto !important;
            background-position: right center !important;
            background-repeat: no-repeat !important;
          }
          .csl-hero-overlay {
            background:
              linear-gradient(to right, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.65) 45%, rgba(0,0,0,0.18) 72%, transparent 100%),
              linear-gradient(to top, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.05) 100%) !important;
          }
        }
      `}</style>

      <section
        className="relative overflow-hidden text-white"
        style={{ background: "#0d0d0d" }}
      >
        {/* Background photo */}
        <div
          className="csl-hero-bg absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=1400&q=85')",
            backgroundSize: "cover",
            backgroundPosition: "center 25%",
            filter: "brightness(0.52) saturate(1.1)",
          }}
        />
        {/* Dark overlay */}
        <div
          className="csl-hero-overlay absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.65) 40%, rgba(0,0,0,0.22) 70%, rgba(0,0,0,0.06) 100%)",
          }}
        />
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
          <div className="py-10 xs:py-12 sm:py-16 md:py-20 lg:py-28 max-w-2xl">
            <div className="space-y-4 xs:space-y-5 sm:space-y-7">

              {/* Location pill */}
              <div className="inline-flex items-center gap-1.5 border border-white/15 bg-white/5 backdrop-blur-sm text-[10px] xs:text-xs font-bold uppercase tracking-widest px-3 xs:px-4 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-pulse flex-shrink-0" />
                <span className="truncate">Leander · Cedar Park · TX Area</span>
              </div>

              {/* Headline */}
              <div>
                <h1 className="font-heading text-4xl xs:text-5xl md:text-7xl font-black leading-[1.02] tracking-tight mb-3 xs:mb-4" style={{ letterSpacing: "-1px" }}>
                  Premium
                  <br />
                  <span style={{ color: "#f97316" }}>Liquor</span>
                  <br />
                  Delivered.
                </h1>
                <p
                  className="text-base xs:text-xl md:text-2xl font-bold"
                  style={{ color: "#f97316" }}
                >
                  FREE Delivery. NO Tip. Ever.
                </p>
              </div>

              {/* Body — hidden on fold, visible on phones+ */}
              <p className="hidden xs:block text-gray-400 text-sm sm:text-base md:text-lg leading-relaxed max-w-lg">
                The only liquor delivery in the area with{" "}
                <span className="text-white font-semibold">absolutely no extra charges</span> —
                no delivery fee, no tip, no hidden costs. Just premium spirits at your door in 10–30 minutes.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-2 xs:gap-3 pt-1">
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 font-bold px-5 xs:px-8 py-3 xs:py-4 rounded-xl text-sm xs:text-base transition-all text-white shadow-lg"
                  style={{
                    background: "linear-gradient(135deg, #f97316, #ea580c)",
                    boxShadow: "0 8px 24px rgba(249,115,22,0.35)",
                  }}
                >
                  Shop Now →
                </Link>
                <Link
                  href="#delivery-check"
                  className="inline-flex items-center gap-2 font-bold px-5 xs:px-8 py-3 xs:py-4 rounded-xl text-sm xs:text-base border border-white/20 hover:border-white/50 hover:bg-white/5 transition-all text-white/90"
                >
                  Check My Area
                </Link>
              </div>

              {/* Stats — 2×2 grid on fold, row on phones+ */}
              <div
                className="grid grid-cols-2 gap-x-4 gap-y-3 pt-3 border-t xs:flex xs:gap-6 xs:pt-2"
                style={{ borderColor: "rgba(255,255,255,0.08)" }}
              >
                {[
                  { value: "$0", label: "Delivery Fee" },
                  { value: "$0", label: "Tip" },
                  { value: "10–30", label: "Min Delivery" },
                  { value: "500+", label: "Products" },
                ].map(({ value, label }, i) => (
                  <div key={label} className={i > 0 ? "xs:pl-6 xs:border-l xs:border-white/10" : ""}>
                    <p className="text-xl xs:text-2xl md:text-3xl font-black text-white whitespace-nowrap">{value}</p>
                    <p className="text-[10px] xs:text-xs text-gray-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Trust bar ─────────────────────────────────────────────── */}
        <div
          className="relative z-10"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)" }}
        >
          <div className="container-main py-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 xs:gap-4">
              {[
                { icon: "🚚", label: "FREE Delivery", sub: "No minimum, every order" },
                { icon: "💰", label: "No Tip Required", sub: "We pay our drivers fairly" },
                { icon: "⚡", label: "10–30 Min", sub: "Fastest in Leander area" },
                { icon: "🔒", label: "Safe & Secure", sub: "Verified ID at delivery" },
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
      </section>
    </>
  );
}
