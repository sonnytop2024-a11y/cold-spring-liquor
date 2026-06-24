import Link from "next/link";

const PROMOS = [
  {
    emoji: "⚡",
    tag: "Limited Time",
    title: "Flash Sale",
    subtitle: "Up to 30% off select spirits — today only",
    href: "/products?sale=flash",
    gradient: "from-red-900 via-red-800 to-rose-900",
    accent: "#ef4444",
    cta: "Shop Sale →",
  },
  {
    emoji: "🎁",
    tag: "Every Week",
    title: "Weekly Deals",
    subtitle: "Fresh deals every Monday — curated just for you",
    href: "/products?sale=weekly",
    gradient: "from-brand-900 via-brand-800 to-orange-900",
    accent: "#f97316",
    cta: "See Deals →",
  },
  {
    emoji: "📦",
    tag: "Best Value",
    title: "Bundle & Save",
    subtitle: "Mix & match · 2 items = 5%, 6+ items = 15% off",
    href: "/products?sale=bundle",
    gradient: "from-purple-900 via-violet-800 to-purple-900",
    accent: "#a855f7",
    cta: "Build Bundle →",
  },
];

export function PromotionBanners() {
  return (
    <section className="py-16" style={{ background: "#0d0d0d" }}>
      <div className="container-main">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#f97316" }}>
              Save More
            </p>
            <h2 className="font-heading text-3xl md:text-4xl font-black text-white">Current Promotions</h2>
          </div>
          <Link href="/products?sale=true" className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold" style={{ color: "#f97316" }}>
            View All Deals →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PROMOS.map((promo) => (
            <Link
              key={promo.title}
              href={promo.href}
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${promo.gradient} p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl`}
              style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}
            >
              {/* Hover glow */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300"
                style={{ background: promo.accent }}
              />

              {/* Tag */}
              <div className="relative z-10">
                <div
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-4"
                  style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)" }}
                >
                  <span
                    className="w-1 h-1 rounded-full"
                    style={{ background: promo.accent }}
                  />
                  {promo.tag}
                </div>

                <div className="text-5xl mb-3" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))" }}>
                  {promo.emoji}
                </div>

                <h3 className="font-heading text-2xl font-black text-white mb-1.5">{promo.title}</h3>
                <p className="text-sm text-white/60 leading-relaxed mb-5">{promo.subtitle}</p>

                <span
                  className="inline-flex items-center gap-1 text-sm font-black px-4 py-2 rounded-xl transition-all group-hover:gap-2"
                  style={{ background: "rgba(255,255,255,0.15)", color: "white" }}
                >
                  {promo.cta}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
