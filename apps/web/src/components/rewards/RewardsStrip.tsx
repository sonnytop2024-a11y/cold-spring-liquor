import Link from "next/link";
import { Star, Crown, Gift, Users } from "lucide-react";

const PERKS = [
  { icon: Star, label: "CS Rewards Club", sub: "Earn 10 pts per $1 spent", href: "/rewards", color: "#a855f7" },
  { icon: Crown, label: "VIP Tiers", sub: "Silver · Gold · Platinum", href: "/rewards", color: "#f59e0b" },
  { icon: Gift, label: "Birthday Reward", sub: "$15 credit on your birthday", href: "/account", color: "#ec4899" },
  { icon: Users, label: "Refer a Friend", sub: "Both get $10 off", href: "/rewards/referral", color: "#22c55e" },
];

export function RewardsStrip() {
  return (
    <section className="py-16" style={{ background: "#0a0a1a" }}>
      <div className="container-main">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#a855f7" }}>
            Loyalty Program
          </p>
          <h2 className="font-heading text-3xl md:text-4xl font-black text-white mb-2">
            CS Rewards Club
          </h2>
          <p className="text-sm text-gray-500">
            Join FREE · Earn on every order · Redeem for real discounts
          </p>
        </div>

        {/* Perks */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {PERKS.map(({ icon: Icon, label, sub, href, color }) => (
            <Link
              key={label}
              href={href}
              className="group rounded-2xl p-5 text-center transition-all duration-300 hover:-translate-y-1"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{ background: `${color}20` }}
              >
                <Icon size={22} style={{ color }} />
              </div>
              <p className="font-bold text-sm text-white mb-0.5">{label}</p>
              <p className="text-xs text-gray-500">{sub}</p>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/rewards"
            className="inline-flex items-center gap-2 font-bold px-8 py-3.5 rounded-xl text-white transition-all"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
              boxShadow: "0 6px 20px rgba(124,58,237,0.3)",
            }}
          >
            🏆 Join CS Rewards — It&apos;s Free →
          </Link>
        </div>
      </div>
    </section>
  );
}
