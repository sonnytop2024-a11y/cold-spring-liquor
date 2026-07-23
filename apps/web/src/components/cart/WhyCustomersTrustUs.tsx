// "Why customers trust us" — static trust card shown on every payment review
// screen (Stripe, PayPal, $0 gift-card order), right after the confirm/back
// buttons and before the encrypted-payment disclaimer. Content is fixed text;
// only the ID line adapts to pickup vs delivery, matching how the disclaimer
// below it already words that difference.
export function WhyCustomersTrustUs({ context = "delivery" }: { context?: "delivery" | "pickup" }) {
  const check = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[#E8590C]">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12l3 3 5-6" />
    </svg>
  );

  return (
    <div className="rounded-2xl border border-[#f0dcb8] px-[18px] py-4" style={{ background: "linear-gradient(180deg,#FFF8EE,#FFF2E0)" }}>
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-11 h-11 mt-0.5 text-[#E8590C]">
          <svg width="44" height="44" viewBox="0 0 64 64" fill="none">
            <circle cx="26" cy="26" r="22" stroke="currentColor" strokeWidth="2" />
            <path d="M26 15l9 3v8c0 6-4 10-9 13-5-3-9-7-9-13v-8z" stroke="currentColor" strokeWidth="1.6" fill="none" />
            <path d="M22 26l3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="46" cy="44" r="11" fill="#fff" stroke="currentColor" strokeWidth="2" />
            <path d="M42 44l3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[17px] text-[#1a1a1a] mb-2 tracking-wide" style={{ fontFamily: "Georgia,'Times New Roman',serif" }}>
            Why customers trust us
          </p>
          <ul className="space-y-1.5">
            <li className="flex items-center gap-2 text-[12.5px] leading-tight text-[#3a3a3a]">{check}Delivered by our own staff</li>
            <li className="flex items-center gap-2 text-[12.5px] leading-tight text-[#3a3a3a]">{check}No third-party drivers</li>
            <li className="flex items-center gap-2 text-[12.5px] leading-tight text-[#3a3a3a]">{check}Private &amp; secure information</li>
            <li className="flex items-center gap-2 text-[12.5px] leading-tight text-[#3a3a3a]">{check}ID verified upon {context}</li>
          </ul>
        </div>
        <div className="shrink-0 w-[50px] h-[50px] ml-auto self-center text-[#E8590C]">
          <svg width="50" height="50" viewBox="0 0 74 74" fill="none">
            <path d="M37 10 L60 22 V48 L37 60 L14 48 V22 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <path d="M14 22 L37 34 L60 22 M37 34 V60" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <circle cx="56" cy="52" r="11" fill="#FFF8EE" stroke="currentColor" strokeWidth="2" />
            <path d="M52 52l3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6 8l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" fill="currentColor" opacity=".7" />
            <path d="M64 6l1.4 2.8L68 10l-2.6 1.2L64 14l-1.4-2.8L60 10l2.6-1.2z" fill="currentColor" opacity=".5" />
          </svg>
        </div>
      </div>
      <p className="text-center text-[11px] text-[#9c9080] mt-3 leading-relaxed">
        Your information is used only to process your order and {context}.
      </p>
    </div>
  );
}
