/**
 * Decorative animated wheel for the landing hero: the three-step cycle as a
 * slowly counter-rotating neon ring system with an amber "premium" dot
 * orbiting the outer ring. Pure SVG + CSS keyframes; honors
 * prefers-reduced-motion (falls back to a static figure).
 */
export function HeroWheel() {
  return (
    <div className="relative mx-auto h-72 w-72 sm:h-88 sm:w-88" aria-hidden>
      <svg viewBox="0 0 400 400" className="h-full w-full">
        {/* Outer ring: dashed, slow spin */}
        <g className="hw-spin">
          <circle
            cx="200"
            cy="200"
            r="168"
            fill="none"
            stroke="#00E5FF"
            strokeWidth="2"
            strokeDasharray="10 14"
            opacity="0.55"
          />
        </g>
        {/* Mid ring: solid, faint */}
        <circle cx="200" cy="200" r="132" fill="none" stroke="#1F1F24" strokeWidth="1.5" />
        {/* Inner ring: teal, reverse spin */}
        <g className="hw-spin-rev">
          <circle
            cx="200"
            cy="200"
            r="84"
            fill="none"
            stroke="#00D4AA"
            strokeWidth="1.5"
            strokeDasharray="4 10"
            opacity="0.5"
          />
        </g>

        {/* Orbiting premium dot on the outer ring */}
        <g className="hw-orbit">
          <circle cx="200" cy="32" r="7" fill="#FFB800">
            <title>premium</title>
          </circle>
          <circle cx="200" cy="32" r="13" fill="none" stroke="#FFB800" opacity="0.35" />
        </g>

        {/* Three cycle nodes on the mid ring (120° apart) with pulsing halos */}
        <g>
          <circle className="hw-pulse" cx="200" cy="68" r="6" fill="#00E5FF" />
          <circle cx="85.7" cy="266" r="6" fill="#00D4AA" className="hw-pulse hw-delay-1" />
          <circle cx="314.3" cy="266" r="6" fill="#FF2E9A" className="hw-pulse hw-delay-2" />
        </g>

        {/* Node labels (static so they stay readable) */}
        <g fill="#B8B8B8" fontSize="13" fontFamily="var(--font-geist-mono), monospace">
          <text x="200" y="100" textAnchor="middle">
            1 · sell put
          </text>
          <text x="78" y="296" textAnchor="middle">
            2 · assigned
          </text>
          <text x="318" y="296" textAnchor="middle">
            3 · called away
          </text>
        </g>

        {/* Hub */}
        <circle cx="200" cy="200" r="34" fill="none" stroke="#00E5FF" strokeWidth="2" opacity="0.8" />
        <text
          x="200"
          y="206"
          textAnchor="middle"
          fill="#F5F5F5"
          fontSize="15"
          fontWeight="600"
          fontFamily="var(--font-geist-mono), monospace"
        >
          Θ
        </text>
      </svg>
      {/* Soft neon glow behind the figure */}
      <div className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-cyan/5 blur-3xl" />
    </div>
  );
}
