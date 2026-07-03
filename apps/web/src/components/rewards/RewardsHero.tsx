import Link from "next/link";
import { Star, Gift, Trophy } from "lucide-react";

export function RewardsHero() {
  return (
    <section className="bg-gradient-to-br from-purple-900 via-dark-900 to-brand-900 text-white py-16">
      <div className="container-main text-center">
        <div className="inline-flex items-center gap-2 bg-brand-500/20 border border-brand-500/40 text-brand-300 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-5">
          <Star size={12} className="fill-brand-400 text-brand-400" />
          CS Rewards Club
        </div>
        <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">
          Earn Rewards On Every Order
        </h1>
        <p className="text-gray-300 text-lg max-w-xl mx-auto mb-3">
          Join FREE. Earn <strong className="text-white">1 point per $1 spent</strong>.
          Redeem for discounts, free products, and exclusive VIP perks.
        </p>
        <p className="text-brand-400 font-semibold mb-8">
          🎁 New member bonus: $10 OFF your first order over $50 — use code{" "}
          <span className="bg-brand-500/30 px-2 py-0.5 rounded font-mono">WELCOME10</span>
        </p>

        <div className="flex flex-wrap justify-center gap-8 mb-10">
          {[
            { icon: Star, label: "Earn Points", desc: "$1 spent = 1 point" },
            { icon: Gift, label: "Redeem Rewards", desc: "250 pts = $5 off" },
            { icon: Trophy, label: "Unlock VIP", desc: "Silver, Gold & Platinum" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="text-center">
              <div className="w-14 h-14 bg-brand-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <Icon size={24} className="text-brand-400" />
              </div>
              <p className="font-bold">{label}</p>
              <p className="text-sm text-gray-400">{desc}</p>
            </div>
          ))}
        </div>

        <Link
          href="/account"
          className="bg-brand-500 hover:bg-brand-400 text-white font-bold px-8 py-3.5 rounded-xl text-lg transition-colors"
        >
          Join CS Rewards Club — FREE
        </Link>
      </div>
    </section>
  );
}
