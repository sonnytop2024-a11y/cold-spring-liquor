import { Trophy, Crown, Gem } from "lucide-react";

const TIERS = [
  {
    name: "Silver",
    icon: Trophy,
    threshold: "$500",
    color: "from-gray-300 to-gray-400",
    textColor: "text-gray-700",
    bg: "bg-gray-50",
    border: "border-gray-300",
    benefits: [
      "Early access to sales",
      "Double reward points days",
      "Exclusive member newsletter",
    ],
  },
  {
    name: "Gold",
    icon: Crown,
    threshold: "$1,500",
    color: "from-amber-400 to-yellow-500",
    textColor: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-300",
    benefits: [
      "All Silver benefits",
      "Exclusive discounts (5–10%)",
      "Priority delivery",
      "Monthly bonus points",
    ],
    featured: true,
  },
  {
    name: "Platinum",
    icon: Gem,
    threshold: "$3,000",
    color: "from-violet-500 to-purple-600",
    textColor: "text-purple-700",
    bg: "bg-purple-50",
    border: "border-purple-300",
    benefits: [
      "All Gold benefits",
      "VIP pricing on select products",
      "Exclusive product releases first",
      "Birthday reward: $25 credit",
      "Dedicated customer support",
    ],
  },
];

export function VipTiers() {
  return (
    <section>
      <h2 className="font-heading text-3xl font-bold text-center mb-2">VIP Membership</h2>
      <p className="text-center text-gray-500 mb-8">
        Spend more, unlock more. VIP status is automatic based on your total spend.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {TIERS.map(({ name, icon: Icon, threshold, color, textColor, bg, border, benefits, featured }) => (
          <div
            key={name}
            className={`${bg} border-2 ${border} rounded-2xl p-6 relative ${
              featured ? "ring-2 ring-amber-400 shadow-lg scale-105" : ""
            }`}
          >
            {featured && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-white text-xs font-bold px-3 py-1 rounded-full">
                MOST POPULAR
              </div>
            )}
            <div
              className={`w-14 h-14 rounded-full bg-gradient-to-br ${color} flex items-center justify-center mx-auto mb-4`}
            >
              <Icon size={24} className="text-white" />
            </div>
            <h3 className={`font-heading text-2xl font-bold text-center mb-1 ${textColor}`}>
              {name} Member
            </h3>
            <p className="text-center text-sm text-gray-500 mb-4">
              Spend <strong>{threshold}+</strong> total
            </p>
            <ul className="space-y-2">
              {benefits.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm">
                  <span className={`font-bold ${textColor} shrink-0`}>✓</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Birthday rewards */}
      <div className="mt-8 bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-200 rounded-2xl p-6 text-center">
        <p className="text-3xl mb-3">🎂</p>
        <h3 className="font-heading text-2xl font-bold mb-2">Birthday Reward</h3>
        <p className="text-gray-600 mb-1">
          Add your birthday to your account and receive a{" "}
          <strong className="text-pink-600">$15 Birthday Credit</strong> every year.
        </p>
        <p className="text-sm text-gray-400">
          Valid for 30 days · Platinum members receive $25 birthday credit
        </p>
      </div>
    </section>
  );
}
