export function HeroArt() {
  return (
    <svg className="hero-art" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="heroWash" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f7a8c4" />
          <stop offset="48%" stopColor="#f6d0dc" />
          <stop offset="100%" stopColor="#8ed9b8" />
        </linearGradient>
        <linearGradient id="panel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#fff5f8" stopOpacity="0.78" />
        </linearGradient>
      </defs>
      <rect width="1440" height="900" fill="url(#heroWash)" />
      <g className="float-slow" opacity="0.95">
        <rect x="180" y="210" width="280" height="360" rx="36" fill="url(#panel)" />
        <circle cx="320" cy="340" r="72" fill="#f7a8c4" />
        <circle cx="296" cy="328" r="10" fill="#2a2430" />
        <circle cx="344" cy="328" r="10" fill="#2a2430" />
        <path d="M292 372c16 18 40 18 56 0" stroke="#2a2430" strokeWidth="6" strokeLinecap="round" fill="none" />
        <rect x="230" y="450" width="180" height="18" rx="9" fill="#8ed9b8" opacity="0.9" />
        <rect x="250" y="490" width="140" height="14" rx="7" fill="#ef7fa8" opacity="0.45" />
      </g>
      <g className="float-mid">
        <rect x="560" y="240" width="320" height="190" rx="28" fill="url(#panel)" />
        <rect x="592" y="278" width="112" height="76" rx="16" fill="#fde6ef" />
        <rect x="724" y="278" width="112" height="76" rx="16" fill="#e4f7ee" />
        <rect x="592" y="376" width="244" height="20" rx="10" fill="#f7a8c4" opacity="0.55" />
      </g>
      <g className="float-fast">
        <rect x="920" y="300" width="300" height="210" rx="28" fill="url(#panel)" />
        <rect x="952" y="338" width="236" height="110" rx="20" fill="#2a2430" opacity="0.08" />
        <polygon points="1048,364 1098,392 1048,420" fill="#ef7fa8" />
        <rect x="952" y="470" width="140" height="12" rx="6" fill="#8ed9b8" />
      </g>
    </svg>
  )
}

export function CharacterArt() {
  return (
    <svg className="art" viewBox="0 0 560 420" role="img">
      <defs>
        <linearGradient id="charBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fde6ef" />
          <stop offset="100%" stopColor="#f7a8c4" />
        </linearGradient>
      </defs>
      <rect width="560" height="420" rx="36" fill="url(#charBg)" />
      <circle cx="210" cy="190" r="88" fill="#fff" />
      <circle cx="210" cy="176" r="58" fill="#f7a8c4" />
      <circle cx="190" cy="168" r="7" fill="#2a2430" />
      <circle cx="230" cy="168" r="7" fill="#2a2430" />
      <path d="M188 198c14 16 30 16 44 0" stroke="#2a2430" strokeWidth="5" strokeLinecap="round" fill="none" />
      <rect x="340" y="110" width="150" height="200" rx="22" fill="#fff" opacity="0.92" />
      <rect x="360" y="138" width="110" height="14" rx="7" fill="#ef7fa8" opacity="0.7" />
      <rect x="360" y="170" width="88" height="10" rx="5" fill="#2a2430" opacity="0.18" />
      <rect x="360" y="194" width="96" height="10" rx="5" fill="#2a2430" opacity="0.14" />
      <rect x="360" y="218" width="74" height="10" rx="5" fill="#2a2430" opacity="0.12" />
      <rect x="360" y="254" width="110" height="28" rx="14" fill="#8ed9b8" />
    </svg>
  )
}

export function StoryArt() {
  return (
    <svg className="art" viewBox="0 0 560 420" role="img">
      <defs>
        <linearGradient id="storyBg" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#e4f7ee" />
          <stop offset="100%" stopColor="#8ed9b8" />
        </linearGradient>
      </defs>
      <rect width="560" height="420" rx="36" fill="url(#storyBg)" />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${48 + i * 160} 110)`}>
          <rect width="140" height="200" rx="20" fill="#fff" opacity="0.94" />
          <rect x="16" y="22" width="108" height="72" rx="14" fill={i === 1 ? '#f7a8c4' : '#e4f7ee'} />
          <rect x="22" y="114" width="96" height="10" rx="5" fill="#2a2430" opacity="0.16" />
          <rect x="22" y="136" width="72" height="10" rx="5" fill="#2a2430" opacity="0.12" />
          <circle cx="28" cy="176" r="8" fill="#5fc49a" />
          <text x="46" y="181" fontSize="16" fill="#6a6170" fontFamily="Quicksand, sans-serif">
            {`镜 ${i + 1}`}
          </text>
        </g>
      ))}
    </svg>
  )
}

export function GenerateArt() {
  return (
    <svg className="art" viewBox="0 0 560 420" role="img">
      <defs>
        <linearGradient id="genBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f7a8c4" />
          <stop offset="100%" stopColor="#8ed9b8" />
        </linearGradient>
      </defs>
      <rect width="560" height="420" rx="36" fill="url(#genBg)" />
      <rect x="70" y="86" width="420" height="248" rx="28" fill="#fff" opacity="0.94" />
      <rect x="98" y="118" width="364" height="160" rx="20" fill="#2a2430" opacity="0.08" />
      <circle cx="280" cy="198" r="36" fill="#ef7fa8" />
      <polygon points="270,178 304,198 270,218" fill="#fff" />
      <rect x="120" y="300" width="180" height="12" rx="6" fill="#8ed9b8" />
      <rect x="320" y="300" width="120" height="12" rx="6" fill="#f7a8c4" opacity="0.7" />
    </svg>
  )
}
