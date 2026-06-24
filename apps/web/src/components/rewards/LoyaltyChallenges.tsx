import { Target, TrendingUp, Layers } from "lucide-react";

const CHALLENGES = [
  {
    icon: Target,
    title: "5 Orders Challenge",
    desc: "Place 5 orders in a month",
    reward: "$10 Credit",
    progress: 0,
    goal: 5,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  {
    icon: TrendingUp,
    title: "Big Spender",
    desc: "Spend $300 this month",
    reward: "500 Bonus Points",
    progress: 0,
    goal: 300,
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
    isAmount: true,
  },
  {
    icon: Layers,
    title: "Category Explorer",
    desc: "Buy from 3 different categories",
    reward: "Special Coupon",
    progress: 0,
    goal: 3,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
  },
];

export function LoyaltyChallenges() {
  return (
    <section>
      <h2 className="font-heading text-3xl font-bold text-center mb-2">Loyalty Challenges</h2>
      <p className="text-center text-gray-500 mb-8">
        Complete challenges to earn bonus rewards. New challenges launch every month.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {CHALLENGES.map(({ icon: Icon, title, desc, reward, progress, goal, color, bg, border, isAmount }) => (
          <div key={title} className={`${bg} border-2 ${border} rounded-2xl p-5`}>
            <div className={`${color} mb-4`}>
              <Icon size={28} />
            </div>
            <h3 className="font-bold text-lg mb-1">{title}</h3>
            <p className="text-sm text-gray-500 mb-2">{desc}</p>
            <div className={`font-bold ${color} mb-4`}>Reward: {reward}</div>

            {/* Progress bar */}
            <div className="bg-white/60 rounded-full h-2 mb-1">
              <div
                className={`h-2 rounded-full bg-current ${color}`}
                style={{ width: `${Math.min((progress / goal) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">
              {isAmount ? `$${progress} / $${goal}` : `${progress} / ${goal}`}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
