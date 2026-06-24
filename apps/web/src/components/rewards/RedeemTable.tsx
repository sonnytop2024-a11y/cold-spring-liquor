export function RedeemTable() {
  const tiers = [
    { points: 100, reward: "$5 Off", color: "bg-green-50 border-green-200" },
    { points: 250, reward: "$15 Off", color: "bg-blue-50 border-blue-200" },
    { points: 500, reward: "$35 Off", color: "bg-purple-50 border-purple-200" },
    { points: 1000, reward: "$75 Off", color: "bg-amber-50 border-amber-200" },
  ];

  return (
    <section>
      <h2 className="font-heading text-3xl font-bold text-center mb-2">Redeem Your Points</h2>
      <p className="text-center text-gray-500 mb-8">
        Cash in your CS Points directly at checkout — no minimums, no hassle.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tiers.map(({ points, reward, color }) => (
          <div
            key={points}
            className={`${color} border-2 rounded-2xl p-5 text-center`}
          >
            <p className="text-3xl font-bold mb-1">{points}</p>
            <p className="text-sm text-gray-500 mb-3">CS Points</p>
            <div className="text-2xl font-heading font-bold text-gray-900">{reward}</div>
          </div>
        ))}
      </div>

      <p className="text-center text-sm text-gray-400 mt-4">
        Redeem at checkout · Combine with coupon codes · Points never expire
      </p>
    </section>
  );
}
