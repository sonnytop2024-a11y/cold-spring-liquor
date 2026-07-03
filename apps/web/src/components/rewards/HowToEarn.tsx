export function HowToEarn() {
  const examples = [
    { spend: "$50", points: "50", value: null },
    { spend: "$100", points: "100", value: null },
    { spend: "$250", points: "250", value: "$5 Off" },
    { spend: "$500", points: "500", value: "$10 Off" },
    { spend: "$1,000", points: "1,000", value: "$20 Off" },
  ];

  return (
    <section>
      <h2 className="font-heading text-3xl font-bold text-center mb-2">How to Earn Points</h2>
      <p className="text-center text-gray-500 mb-8">
        Every dollar you spend earns 1 EP Point — automatically applied to your account.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div className="bg-brand-50 border border-brand-200 rounded-2xl p-6">
          <h3 className="font-bold text-xl mb-4 text-brand-700">Earning Is Simple</h3>
          <div className="space-y-4">
            {[
              ["Shop", "Place any order on our website"],
              ["Earn", "1 EP Point for every $1 spent"],
              ["Stack", "Points never expire while account is active"],
              ["Bonus", "Double points on VIP days & special events"],
            ].map(([step, desc]) => (
              <div key={step} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-brand-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                  {step[0]}
                </div>
                <div>
                  <p className="font-semibold text-brand-800">{step}</p>
                  <p className="text-sm text-brand-600">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-bold text-xl mb-4">Points Earning Examples</h3>
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Purchase</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Points Earned</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">Reward Value</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {examples.map((row) => (
                  <tr key={row.spend} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{row.spend}</td>
                    <td className="px-4 py-3 text-center text-brand-600 font-bold">
                      {row.points} pts
                    </td>
                    <td className="px-4 py-3 text-right text-green-600 font-semibold">
                      {row.value ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
