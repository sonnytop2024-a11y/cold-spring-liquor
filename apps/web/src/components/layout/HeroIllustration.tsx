export function HeroIllustration() {
  return (
    <div className="relative w-full h-full flex items-center justify-center select-none">
      <svg
        viewBox="0 0 440 540"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full max-w-[440px] max-h-[540px]"
        aria-hidden="true"
      >
        <defs>
          {/* Wine bottle — dark forest green */}
          <linearGradient id="wineG" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0d2b0f" />
            <stop offset="35%" stopColor="#1e4d22" />
            <stop offset="70%" stopColor="#163619" />
            <stop offset="100%" stopColor="#0a200c" />
          </linearGradient>

          {/* Whiskey bottle — rich amber copper */}
          <linearGradient id="whiskeyG" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7a4a00" />
            <stop offset="30%" stopColor="#c87d10" />
            <stop offset="60%" stopColor="#e8a020" />
            <stop offset="100%" stopColor="#8b5c00" />
          </linearGradient>
          <linearGradient id="whiskeyGv" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d49020" />
            <stop offset="100%" stopColor="#6a3e00" />
          </linearGradient>

          {/* Champagne — dark olive gold */}
          <linearGradient id="champG" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2a2000" />
            <stop offset="35%" stopColor="#5a4800" />
            <stop offset="70%" stopColor="#4a3c00" />
            <stop offset="100%" stopColor="#221a00" />
          </linearGradient>

          {/* Shelf wood */}
          <linearGradient id="shelfG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3d2800" />
            <stop offset="100%" stopColor="#1e1400" />
          </linearGradient>

          {/* Background glow */}
          <radialGradient id="bgGlow" cx="50%" cy="55%" r="50%">
            <stop offset="0%" stopColor="rgba(249,115,22,0.22)" />
            <stop offset="60%" stopColor="rgba(249,115,22,0.04)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>

          {/* Bottle glass highlight */}
          <linearGradient id="hlG" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
            <stop offset="40%" stopColor="rgba(255,255,255,0.06)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>

          {/* Floor reflection */}
          <linearGradient id="floorG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(249,115,22,0.08)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </linearGradient>

          {/* Label cream */}
          <linearGradient id="labelCreamy" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f8f0d8" />
            <stop offset="100%" stopColor="#e8d8b8" />
          </linearGradient>

          {/* Gold foil */}
          <linearGradient id="goldG" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#a07010" />
            <stop offset="40%" stopColor="#d4af37" />
            <stop offset="70%" stopColor="#f0d060" />
            <stop offset="100%" stopColor="#b08820" />
          </linearGradient>

          {/* Cork */}
          <linearGradient id="corkG" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8b6340" />
            <stop offset="50%" stopColor="#c09060" />
            <stop offset="100%" stopColor="#7a5530" />
          </linearGradient>

          {/* Shadow under bottle */}
          <radialGradient id="shadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0,0,0,0.6)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>

          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ── Background glow ───────────────────────────────────── */}
        <ellipse cx="220" cy="300" rx="200" ry="220" fill="url(#bgGlow)" />

        {/* ══════════════════════════════════════════════════════════
            WINE BOTTLE — left (Bordeaux style)
            Base: x=75, y=390 | Total h=310
        ══════════════════════════════════════════════════════════ */}
        {/* Cork */}
        <rect x="69" y="78" width="12" height="22" rx="3" fill="url(#corkG)" />
        {/* Neck */}
        <rect x="69" y="100" width="12" height="100" fill="url(#wineG)" />
        {/* Neck highlight */}
        <rect x="70" y="100" width="3" height="100" fill="rgba(255,255,255,0.12)" rx="1" />
        {/* Shoulder */}
        <path d="M 69,200 Q 60,215 55,230 L 95,230 Q 90,215 81,200 Z" fill="url(#wineG)" />
        {/* Body */}
        <rect x="55" y="228" width="40" height="160" rx="5" fill="url(#wineG)" />
        {/* Body highlight streak */}
        <rect x="57" y="230" width="4" height="155" rx="2" fill="url(#hlG)" />
        {/* Label */}
        <rect x="60" y="258" width="30" height="78" rx="3" fill="url(#labelCreamy)" />
        <rect x="63" y="262" width="24" height="70" rx="2" fill="none" stroke="#8B6914" strokeWidth="0.5" />
        <rect x="65" y="270" width="20" height="3" rx="1" fill="#8B0000" opacity="0.6" />
        <rect x="65" y="277" width="20" height="5" rx="1" fill="#1a0a00" opacity="0.7" />
        <rect x="65" y="286" width="20" height="2" rx="1" fill="#8B0000" opacity="0.4" />
        <rect x="65" y="292" width="20" height="2" rx="1" fill="#555" opacity="0.3" />
        <rect x="65" y="298" width="20" height="2" rx="1" fill="#555" opacity="0.3" />
        <rect x="65" y="310" width="20" height="8" rx="1" fill="#8B0000" opacity="0.15" />
        {/* Punt (bottom indent glass) */}
        <ellipse cx="75" cy="386" rx="10" ry="3" fill="rgba(0,0,0,0.35)" />
        {/* Bottom edge */}
        <rect x="55" y="382" width="40" height="6" rx="3" fill="#0a200c" opacity="0.8" />
        {/* Shadow */}
        <ellipse cx="75" cy="397" rx="26" ry="5" fill="url(#shadow)" />

        {/* ══════════════════════════════════════════════════════════
            WHISKEY BOTTLE — center front (American Bourbon style)
            Base: x=200, y=390 | Total h=305 | Width=80
        ══════════════════════════════════════════════════════════ */}
        {/* Wax seal cap */}
        <rect x="180" y="82" width="40" height="8" rx="2" fill="#111" />
        <ellipse cx="200" cy="82" rx="21" ry="7" fill="#1a1a1a" />
        <ellipse cx="200" cy="80" rx="21" ry="7" fill="#222" />
        <ellipse cx="200" cy="78" rx="20" ry="6" fill="#2d2d2d" />
        {/* Gold ring on cap */}
        <rect x="179" y="90" width="42" height="3" rx="1" fill="#C8A000" />
        {/* Neck */}
        <rect x="183" y="93" width="34" height="55" fill="url(#whiskeyG)" />
        <rect x="185" y="93" width="6" height="55" rx="2" fill="rgba(255,255,255,0.1)" />
        {/* Shoulder — distinctive bourbon angle */}
        <path d="M 183,148 L 156,180 L 244,180 L 217,148 Z" fill="url(#whiskeyGv)" />
        {/* Main body */}
        <rect x="156" y="178" width="88" height="210" rx="7" fill="url(#whiskeyGv)" />
        {/* Body highlight */}
        <rect x="159" y="180" width="8" height="206" rx="3" fill="rgba(255,255,255,0.09)" />
        <rect x="236" y="180" width="5" height="206" rx="2" fill="rgba(0,0,0,0.2)" />

        {/* Main label — dark parchment style */}
        <rect x="163" y="203" width="74" height="108" rx="5" fill="#18100a" />
        <rect x="166" y="206" width="68" height="102" rx="4" fill="none" stroke="#C8A000" strokeWidth="0.8" />
        {/* Label: brand name lines */}
        <rect x="170" y="214" width="60" height="3" rx="1" fill="rgba(200,160,0,0.7)" />
        <rect x="168" y="222" width="64" height="9" rx="2" fill="rgba(240,200,80,0.85)" />
        <rect x="170" y="236" width="60" height="2" rx="1" fill="rgba(200,160,0,0.5)" />
        <rect x="170" y="243" width="60" height="2" rx="1" fill="rgba(255,255,255,0.15)" />
        <rect x="172" y="250" width="56" height="2" rx="1" fill="rgba(255,255,255,0.12)" />
        <rect x="172" y="257" width="56" height="2" rx="1" fill="rgba(255,255,255,0.12)" />
        <rect x="170" y="267" width="60" height="3" rx="1" fill="rgba(200,160,0,0.4)" />
        <rect x="172" y="275" width="56" height="2" rx="1" fill="rgba(255,255,255,0.1)" />
        <rect x="172" y="282" width="56" height="2" rx="1" fill="rgba(255,255,255,0.1)" />
        <rect x="170" y="290" width="60" height="3" rx="1" fill="rgba(200,160,0,0.5)" />
        <rect x="172" y="298" width="56" height="8" rx="2" fill="rgba(180,120,0,0.3)" />

        {/* Secondary neck label */}
        <rect x="168" y="327" width="64" height="40" rx="4" fill="#C8A000" opacity="0.12" />
        <rect x="170" y="330" width="60" height="2" rx="1" fill="rgba(200,160,0,0.5)" />
        <rect x="172" y="337" width="56" height="2" rx="1" fill="rgba(255,255,255,0.15)" />
        <rect x="172" y="344" width="56" height="2" rx="1" fill="rgba(255,255,255,0.1)" />
        <rect x="170" y="360" width="60" height="3" rx="1" fill="rgba(200,160,0,0.4)" />

        {/* Bottom */}
        <rect x="156" y="382" width="88" height="6" rx="4" fill="#4a2800" />
        {/* Shadow */}
        <ellipse cx="200" cy="397" rx="50" ry="7" fill="url(#shadow)" />

        {/* ══════════════════════════════════════════════════════════
            CHAMPAGNE BOTTLE — right (Prosecco style)
            Base: x=335, y=390 | Total h=295 | Width=54
        ══════════════════════════════════════════════════════════ */}
        {/* Gold foil cage + cap */}
        <rect x="321" y="82" width="28" height="8" rx="2" fill="url(#goldG)" />
        <ellipse cx="335" cy="82" rx="15" ry="6" fill="#c8a000" />
        <ellipse cx="335" cy="79" rx="15" ry="5" fill="#d4af37" />
        <ellipse cx="335" cy="77" rx="14" ry="4" fill="#e8c840" />
        {/* Cage wires */}
        <line x1="322" y1="88" x2="348" y2="88" stroke="#8B7000" strokeWidth="1" opacity="0.6" />
        <line x1="322" y1="93" x2="348" y2="93" stroke="#8B7000" strokeWidth="1" opacity="0.5" />
        <line x1="328" y1="82" x2="328" y2="97" stroke="#8B7000" strokeWidth="0.7" opacity="0.4" />
        <line x1="335" y1="82" x2="335" y2="97" stroke="#8B7000" strokeWidth="0.7" opacity="0.4" />
        <line x1="342" y1="82" x2="342" y2="97" stroke="#8B7000" strokeWidth="0.7" opacity="0.4" />
        {/* Neck  */}
        <rect x="328" y="97" width="14" height="75" fill="url(#champG)" />
        <rect x="329" y="97" width="3" height="75" rx="1" fill="rgba(255,255,255,0.1)" />
        {/* Shoulder — wider prosecco style */}
        <path d="M 328,172 Q 316,190 311,205 L 359,205 Q 354,190 342,172 Z" fill="url(#champG)" />
        {/* Body */}
        <rect x="311" y="203" width="48" height="182" rx="6" fill="url(#champG)" />
        <rect x="313" y="205" width="5" height="178" rx="2" fill="rgba(255,255,255,0.08)" />
        {/* Gold label */}
        <rect x="316" y="235" width="38" height="80" rx="4" fill="#1a1400" />
        <rect x="318" y="238" width="34" height="74" rx="3" fill="none" stroke="#d4af37" strokeWidth="0.7" />
        <rect x="320" y="244" width="30" height="3" rx="1" fill="rgba(212,175,55,0.8)" />
        <rect x="321" y="252" width="28" height="7" rx="2" fill="rgba(240,200,60,0.7)" />
        <rect x="320" y="264" width="30" height="2" rx="1" fill="rgba(212,175,55,0.5)" />
        <rect x="321" y="271" width="28" height="2" rx="1" fill="rgba(255,255,255,0.15)" />
        <rect x="321" y="278" width="28" height="2" rx="1" fill="rgba(255,255,255,0.12)" />
        <rect x="320" y="286" width="30" height="2" rx="1" fill="rgba(212,175,55,0.4)" />
        <rect x="321" y="296" width="28" height="8" rx="2" fill="rgba(180,140,0,0.25)" />
        {/* Punt */}
        <ellipse cx="335" cy="383" rx="13" ry="4" fill="rgba(0,0,0,0.35)" />
        <rect x="311" y="379" width="48" height="7" rx="4" fill="#1a1200" />
        {/* Shadow */}
        <ellipse cx="335" cy="397" rx="30" ry="5" fill="url(#shadow)" />

        {/* ── Wooden shelf ──────────────────────────────────────── */}
        <rect x="28" y="390" width="384" height="10" rx="3" fill="url(#shelfG)" />
        <rect x="28" y="390" width="384" height="2" rx="1" fill="rgba(255,255,255,0.08)" />
        {/* Floor reflection */}
        <rect x="28" y="400" width="384" height="50" fill="url(#floorG)" />

        {/* ══════════════════════════════════════════════════════════
            DELIVERY SCENE — subtle silhouette at bottom
        ══════════════════════════════════════════════════════════ */}
        {/* Road/driveway */}
        <rect x="28" y="468" width="384" height="3" rx="1" fill="rgba(255,255,255,0.06)" />

        {/* House (right side) */}
        <g opacity="0.55">
          {/* Wall */}
          <rect x="295" y="438" width="55" height="32" rx="2" fill="rgba(255,255,255,0.12)" />
          {/* Roof */}
          <polygon points="290,438 322,418 360,438" fill="rgba(255,255,255,0.18)" />
          {/* Door */}
          <rect x="315" y="449" width="14" height="20" rx="2" fill="rgba(255,150,30,0.5)" />
          {/* Windows lit up */}
          <rect x="299" y="443" width="11" height="9" rx="1" fill="rgba(255,220,60,0.6)" />
          <rect x="339" y="443" width="11" height="9" rx="1" fill="rgba(255,220,60,0.6)" />
          {/* Path to door */}
          <rect x="319" y="468" width="6" height="4" fill="rgba(255,255,255,0.12)" />
        </g>

        {/* Trees */}
        <g opacity="0.3">
          <rect x="365" y="444" width="4" height="24" fill="rgba(255,255,255,0.4)" />
          <ellipse cx="367" cy="440" rx="8" ry="10" fill="rgba(34,197,94,0.5)" />
          <rect x="379" y="450" width="3" height="18" fill="rgba(255,255,255,0.4)" />
          <ellipse cx="380" cy="447" rx="6" ry="7" fill="rgba(34,197,94,0.4)" />
        </g>

        {/* Delivery person (stylized) */}
        <g opacity="0.85">
          {/* Cap/hat */}
          <ellipse cx="135" cy="430" rx="11" ry="4" fill="#f97316" />
          <rect x="128" y="430" width="14" height="3" rx="1" fill="#f97316" />
          {/* Visor */}
          <rect x="124" y="432" width="8" height="2" rx="1" fill="#ea580c" />
          {/* Head */}
          <circle cx="135" cy="438" r="8" fill="#c8854a" />
          {/* Torso - uniform orange */}
          <rect x="127" y="446" width="16" height="18" rx="4" fill="#f97316" />
          {/* Logo on shirt */}
          <rect x="131" y="450" width="8" height="4" rx="1" fill="rgba(255,255,255,0.6)" />
          {/* Arm holding package */}
          <rect x="143" y="448" width="4" height="12" rx="2" fill="#f97316" />
          {/* Package/box */}
          <rect x="143" y="452" width="20" height="16" rx="3" fill="#e8e0d0" />
          <rect x="143" y="452" width="20" height="16" rx="3" fill="none" stroke="#c0b090" strokeWidth="0.8" />
          {/* Tape on box */}
          <rect x="150" y="452" width="2" height="16" fill="rgba(150,120,0,0.3)" />
          <rect x="143" y="458" width="20" height="2" fill="rgba(150,120,0,0.3)" />
          {/* CSL label on box */}
          <rect x="145" y="454" width="14" height="6" rx="1" fill="#f97316" opacity="0.8" />
          {/* Left arm */}
          <rect x="123" y="448" width="4" height="12" rx="2" fill="#f97316" />
          {/* Legs */}
          <rect x="129" y="464" width="6" height="10" rx="2" fill="#1a1a2e" />
          <rect x="137" y="464" width="6" height="10" rx="2" fill="#1a1a2e" />
          {/* Shoes */}
          <rect x="127" y="472" width="9" height="4" rx="2" fill="#111" />
          <rect x="135" y="472" width="9" height="4" rx="2" fill="#111" />
        </g>

        {/* Delivery bag/thermal */}
        <g opacity="0.7">
          <rect x="105" y="450" width="18" height="24" rx="4" fill="#1a1a1a" />
          <rect x="107" y="452" width="14" height="20" rx="3" fill="#f97316" opacity="0.3" />
          {/* Handle */}
          <path d="M 110,450 Q 114,444 118,450" fill="none" stroke="#555" strokeWidth="2" />
          {/* CSL logo on bag */}
          <rect x="109" y="458" width="10" height="6" rx="1" fill="rgba(255,255,255,0.15)" />
        </g>

        {/* Motion lines (movement feel) */}
        <g opacity="0.15">
          <line x1="82" y1="445" x2="100" y2="445" stroke="white" strokeWidth="1.5" strokeDasharray="3,2" />
          <line x1="82" y1="451" x2="96" y2="451" stroke="white" strokeWidth="1" strokeDasharray="2,3" />
          <line x1="82" y1="457" x2="99" y2="457" stroke="white" strokeWidth="1" strokeDasharray="4,2" />
        </g>

        {/* ── Sparkle/star accents ──────────────────────────────── */}
        <g fill="rgba(249,115,22,0.6)">
          <polygon points="108,88 110,82 112,88 118,90 112,92 110,98 108,92 102,90" />
        </g>
        <g fill="rgba(212,175,55,0.5)">
          <polygon points="268,95 269.5,90 271,95 276,96.5 271,98 269.5,103 268,98 263,96.5" />
        </g>
        <g fill="rgba(255,255,255,0.25)">
          <polygon points="40,168 41,164 42,168 46,169 42,170 41,174 40,170 36,169" />
          <polygon points="395,220 396,217 397,220 400,221 397,222 396,225 395,222 392,221" />
        </g>
      </svg>

      {/* Floating delivery ETA badge */}
      <div
        className="absolute top-4 right-2 rounded-2xl px-3.5 py-3 text-center min-w-[110px]"
        style={{
          background: "rgba(13,13,13,0.85)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(249,115,22,0.3)",
          boxShadow: "0 4px 24px rgba(249,115,22,0.15)",
        }}
      >
        <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: "#f97316" }}>⚡ Fast Delivery</p>
        <p className="text-2xl font-black text-white mt-0.5 leading-none">10–30</p>
        <p className="text-[10px] text-gray-400 mt-0.5">minutes</p>
        <div className="mt-2 flex items-center justify-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[9px] text-green-400 font-bold">ONLINE NOW</span>
        </div>
      </div>

      {/* FREE delivery tag */}
      <div
        className="absolute bottom-[155px] left-0 rounded-r-full pl-1 pr-4 py-1.5 flex items-center gap-2"
        style={{
          background: "linear-gradient(135deg, rgba(34,197,94,0.25), rgba(34,197,94,0.1))",
          border: "1px solid rgba(34,197,94,0.2)",
          borderLeft: "none",
        }}
      >
        <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-[9px] font-black text-white">✓</span>
        <span className="text-[10px] font-black text-green-400 uppercase tracking-wider">FREE Delivery</span>
      </div>

      {/* CS Rewards floating */}
      <div
        className="absolute bottom-[88px] right-1 rounded-xl px-3 py-2"
        style={{
          background: "rgba(124,58,237,0.15)",
          border: "1px solid rgba(124,58,237,0.25)",
          backdropFilter: "blur(8px)",
        }}
      >
        <p className="text-[10px] font-bold text-white">🏆 CS Rewards</p>
        <p className="text-[9px] text-purple-400">Earn 10 pts per $1</p>
      </div>
    </div>
  );
}
