import Link from "next/link";

const PERKS = [
  {
    emoji: "🚚",
    label: "FREE Delivery",
    desc: "On every order, always. No minimum, no exceptions.",
    href: null,
    color: "#22c55e",
  },
  {
    emoji: "💰",
    label: "NO Tip Required",
    desc: "We pay our drivers fairly. Keep your money.",
    href: null,
    color: "#3b82f6",
  },
  {
    emoji: "⚡",
    label: "10–30 Min Delivery",
    desc: "Fastest liquor delivery in Leander, Cedar Park & Liberty Hill.",
    href: null,
    color: "#eab308",
  },
  {
    emoji: "🏆",
    label: "Rewards Program",
    desc: "Earn 10 CS Points per $1 spent. Redeem for real discounts.",
    href: "/rewards",
    color: "#a855f7",
  },
  {
    emoji: "🎟️",
    label: "Promo Codes",
    desc: "WELCOME10, SUMMER15, PARTY25 & more at checkout.",
    href: "/checkout",
    color: "#f97316",
  },
  {
    emoji: "🎁",
    label: "Gift Cards",
    desc: "$25 · $50 · $100 · $250 denominations available.",
    href: "/gift-cards",
    color: "#ec4899",
  },
];

export function MarketingHighlights() {
  return (
    <section className="py-20" style={{ background: "#111111" }}>
      <div className="container-main">
        {/* Section header */}
        <div className="text-center mb-12">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#f97316" }}>
            Why Choose Us
          </p>
          <h2 className="font-heading text-3xl md:text-5xl font-black text-white mb-4">
            Why Cold Spring Liquor?
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-base">
            The only liquor delivery in the area with{" "}
            <span className="text-white font-semibold">zero extra charges</span> — ever.
          </p>
        </div>

        {/* Perks grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {PERKS.map(({ emoji, label, desc, href, color }) => {
            const card = (
              <div
                className={`group relative rounded-2xl p-6 transition-all duration-300 ${href ? "hover:-translate-y-1 cursor-pointer" : ""}`}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                {href && (
                  <div
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: `radial-gradient(ellipse 80% 60% at 30% 40%, ${color}15, transparent)` }}
                  />
                )}
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{emoji}</span>
                    <div className="w-px h-6" style={{ background: "rgba(255,255,255,0.1)" }} />
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color }}>
                      {href ? "Learn more" : "Included"}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-white mb-1.5">{label}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                  {href && (
                    <p className="text-xs font-bold mt-3 flex items-center gap-1" style={{ color }}>
                      Explore {label} →
                    </p>
                  )}
                </div>
              </div>
            );

            return href ? (
              <Link key={label} href={href}>{card}</Link>
            ) : (
              <div key={label}>{card}</div>
            );
          })}
        </div>

        {/* First-time promo callout */}
        <div
          className="relative overflow-hidden rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-5"
          style={{ background: "linear-gradient(135deg, #f97316 0%, #ea580c 50%, #c2410c 100%)" }}
        >
          <div
            className="absolute inset-0 pointer-events-none opacity-10"
            style={{
              backgroundImage: "repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)",
              backgroundSize: "20px 20px",
            }}
          />
          <div className="relative z-10">
            <p className="font-black text-xl text-white">🎉 First time ordering?</p>
            <p className="text-orange-100 text-sm mt-1">
              Use code{" "}
              <code className="bg-black/20 px-2 py-0.5 rounded-lg font-mono font-black">WELCOME10</code>{" "}
              at checkout for <strong>$10 OFF</strong> your first order (min. $50)
            </p>
          </div>
          <Link
            href="/products"
            className="relative z-10 shrink-0 bg-white text-orange-600 hover:bg-orange-50 font-black px-7 py-3.5 rounded-xl transition-colors text-sm shadow-lg"
          >
            Shop Now →
          </Link>
        </div>
      </div>
    </section>
  );
}
