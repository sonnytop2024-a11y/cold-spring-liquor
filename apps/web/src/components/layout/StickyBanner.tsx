const ITEMS = [
  "🚚 FREE DELIVERY on every order",
  "💰 NO TIP REQUIRED — ever",
  "⚡ 10–30 Min Delivery",
  "🏆 CS REWARDS — earn points every order",
  "🎟️ Use code WELCOME10 for $10 off",
  "🎁 GIFT CARDS available now",
  "⭐ Premium selection · 500+ products",
  "📍 Leander · Cedar Park · Liberty Hill, TX",
];

export function StickyBanner() {
  const repeated = [...ITEMS, ...ITEMS];

  return (
    <div className="bg-brand-600 text-white py-2 overflow-hidden relative z-50">
      <div
        className="flex items-center gap-8 whitespace-nowrap"
        style={{
          animation: "marquee 40s linear infinite",
          width: "max-content",
        }}
      >
        {repeated.map((item, i) => (
          <span key={i} className="text-xs sm:text-sm font-semibold flex items-center gap-8">
            {item}
            <span className="text-white/30 mx-1">·</span>
          </span>
        ))}
      </div>
      <style>{`@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
    </div>
  );
}
