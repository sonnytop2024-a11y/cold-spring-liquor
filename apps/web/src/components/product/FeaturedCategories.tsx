import Link from "next/link";

const CATEGORIES = [
  { name: "Whiskey", slug: "whiskey", emoji: "🥃", gradient: "from-amber-950 to-amber-800", accent: "#f59e0b" },
  { name: "Wine", slug: "wine", emoji: "🍷", gradient: "from-rose-950 to-rose-800", accent: "#f43f5e" },
  { name: "Beer", slug: "beer", emoji: "🍺", gradient: "from-yellow-950 to-yellow-800", accent: "#eab308" },
  { name: "Tequila", slug: "tequila", emoji: "🌵", gradient: "from-lime-950 to-emerald-800", accent: "#22c55e" },
  { name: "Vodka", slug: "vodka", emoji: "🍸", gradient: "from-sky-950 to-blue-800", accent: "#38bdf8" },
  { name: "Rum", slug: "rum", emoji: "🍹", gradient: "from-orange-950 to-orange-700", accent: "#fb923c" },
  { name: "Gin", slug: "gin", emoji: "🌿", gradient: "from-teal-950 to-teal-700", accent: "#2dd4bf" },
  { name: "Champagne", slug: "champagne", emoji: "🥂", gradient: "from-yellow-900 to-amber-600", accent: "#fbbf24" },
  { name: "Cognac", slug: "cognac", emoji: "🍶", gradient: "from-red-950 to-red-800", accent: "#ef4444" },
  { name: "Ready-to-Drink", slug: "rtd", emoji: "🧃", gradient: "from-purple-950 to-purple-700", accent: "#a855f7" },
];

export function FeaturedCategories() {
  return (
    <section className="py-16" style={{ background: "#0d0d0d" }}>
      <div className="container-main">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#f97316" }}>
              Browse
            </p>
            <h2 className="font-heading text-3xl md:text-4xl font-black text-white">Shop By Category</h2>
          </div>
          <Link
            href="/products"
            className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold transition-colors"
            style={{ color: "#f97316" }}
          >
            View All Categories →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/products?category=${cat.slug}`}
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${cat.gradient} p-5 flex flex-col items-center gap-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
            >
              {/* Glow on hover */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-2xl"
                style={{ background: cat.accent }}
              />
              <span className="text-5xl group-hover:scale-110 transition-transform duration-300 relative z-10" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.4))" }}>
                {cat.emoji}
              </span>
              <div className="relative z-10 text-center">
                <p className="font-bold text-sm text-white">{cat.name}</p>
                <p
                  className="text-xs font-semibold mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ color: cat.accent }}
                >
                  Shop Now →
                </p>
              </div>
            </Link>
          ))}
        </div>

        <Link href="/products" className="sm:hidden block text-center mt-5 text-sm font-semibold" style={{ color: "#f97316" }}>
          View All Categories →
        </Link>
      </div>
    </section>
  );
}
