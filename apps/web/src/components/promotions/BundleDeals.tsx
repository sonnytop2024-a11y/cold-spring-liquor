import { Package } from "lucide-react";

const BUNDLES = [
  {
    qty: "2 Bottles",
    discount: "5% Off",
    pct: 5,
    desc: "Mix & Match any 2 bottles",
    color: "from-blue-500 to-blue-600",
    emoji: "🍶🍶",
  },
  {
    qty: "3 Bottles",
    discount: "10% Off",
    pct: 10,
    desc: "Great for a gathering",
    color: "from-purple-500 to-purple-600",
    emoji: "🍶🍶🍶",
    featured: true,
  },
  {
    qty: "6 Bottles",
    discount: "15% Off",
    pct: 15,
    desc: "Best value — stock up!",
    color: "from-brand-500 to-brand-700",
    emoji: "🍾🍾🍾🍾🍾🍾",
  },
];

export function BundleDeals() {
  return (
    <section className="py-12 bg-gray-50">
      <div className="container-main">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-3">
            <Package size={12} />
            Bundle & Save
          </div>
          <h2 className="font-heading text-3xl font-bold mb-2">Buy More, Save More</h2>
          <p className="text-gray-500">
            Mix and match any bottles — bundle discount applied automatically at checkout.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {BUNDLES.map(({ qty, discount, pct, desc, color, emoji, featured }) => (
            <div
              key={qty}
              className={`rounded-2xl p-6 text-center text-white bg-gradient-to-br ${color} relative ${
                featured ? "ring-4 ring-purple-300 shadow-xl scale-105" : "shadow-md"
              }`}
            >
              {featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-purple-600 text-xs font-bold px-3 py-1 rounded-full">
                  MOST POPULAR
                </div>
              )}
              <div className="text-4xl mb-3 tracking-wider">{emoji.slice(0, 6)}</div>
              <h3 className="font-heading text-2xl font-bold">{qty}</h3>
              <p className="text-5xl font-black my-3">{pct}%</p>
              <p className="text-white/90 font-semibold text-lg mb-1">{discount}</p>
              <p className="text-white/70 text-sm">{desc}</p>
              <p className="mt-4 text-xs text-white/60">Automatically applied at checkout</p>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          Mix any categories · Applies to all bottle sizes · Combines with FREE delivery
        </p>
      </div>
    </section>
  );
}
