/** Minimal anime-style guide illustrations for portal entries */

export function TextGuide() {
  return (
    <svg className="anime-guide" viewBox="0 0 200 160" aria-hidden="true">
      <defs>
        <linearGradient id="textGuideBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fde6ef" />
          <stop offset="100%" stopColor="#f7a8c4" />
        </linearGradient>
      </defs>
      <rect width="200" height="160" rx="24" fill="url(#textGuideBg)" />
      <rect x="36" y="38" width="128" height="14" rx="7" fill="#fff" opacity="0.9" />
      <rect x="36" y="62" width="96" height="10" rx="5" fill="#fff" opacity="0.65" />
      <rect x="36" y="82" width="110" height="10" rx="5" fill="#fff" opacity="0.5" />
      <circle cx="148" cy="108" r="28" fill="#ef7fa8" />
      <circle cx="140" cy="102" r="5" fill="#2a2430" />
      <circle cx="156" cy="102" r="5" fill="#2a2430" />
      <path d="M138 116c8 10 20 10 28 0" stroke="#2a2430" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M52 118l12-8 8 6 14-18" stroke="#5fc49a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

export function UploadGuide() {
  return (
    <svg className="anime-guide" viewBox="0 0 200 160" aria-hidden="true">
      <defs>
        <linearGradient id="uploadGuideBg" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#e4f7ee" />
          <stop offset="100%" stopColor="#8ed9b8" />
        </linearGradient>
      </defs>
      <rect width="200" height="160" rx="24" fill="url(#uploadGuideBg)" />
      <rect x="48" y="32" width="104" height="96" rx="16" fill="#fff" opacity="0.92" stroke="#5fc49a" strokeWidth="2" strokeDasharray="6 4" />
      <path d="M100 52v36M82 70l18-18 18 18" stroke="#5fc49a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="72" cy="58" r="14" fill="#f7a8c4" opacity="0.85" />
      <rect x="108" y="108" width="44" height="28" rx="8" fill="#2a2430" opacity="0.08" />
    </svg>
  )
}

export function LibraryGuide() {
  return (
    <svg className="anime-guide" viewBox="0 0 200 160" aria-hidden="true">
      <defs>
        <linearGradient id="libGuideBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f7a8c4" />
          <stop offset="100%" stopColor="#8ed9b8" />
        </linearGradient>
      </defs>
      <rect width="200" height="160" rx="24" fill="url(#libGuideBg)" />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${28 + i * 52} 36)`}>
          <rect width="44" height="88" rx="12" fill="#fff" opacity={0.92 - i * 0.08} />
          <circle cx="22" cy="32" r="14" fill={i === 1 ? '#ef7fa8' : '#8ed9b8'} />
          <rect x="8" y="56" width="28" height="6" rx="3" fill="#2a2430" opacity="0.12" />
          <rect x="8" y="68" width="20" height="5" rx="2.5" fill="#2a2430" opacity="0.08" />
        </g>
      ))}
      <rect x="60" y="118" width="80" height="8" rx="4" fill="#fff" opacity="0.55" />
    </svg>
  )
}

export function CustomGuide() {
  return (
    <svg className="anime-guide" viewBox="0 0 200 160" aria-hidden="true">
      <rect width="200" height="160" rx="24" fill="#fff5f8" />
      <circle cx="100" cy="72" r="40" fill="#fde6ef" stroke="#f7a8c4" strokeWidth="2" />
      <ellipse cx="100" cy="58" rx="38" ry="28" fill="#ef7fa8" />
      <circle cx="86" cy="68" r="5" fill="#2a2430" />
      <circle cx="114" cy="68" r="5" fill="#2a2430" />
      <path d="M88 82c6 8 18 8 24 0" stroke="#2a2430" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={i}
          x={36 + i * 26}
          y={118}
          width="20"
          height="20"
          rx="6"
          fill={i === 2 ? '#8ed9b8' : '#fde6ef'}
          stroke={i === 2 ? '#5fc49a' : '#f7a8c4'}
          strokeWidth="1.5"
        />
      ))}
    </svg>
  )
}

export function ImportGuide() {
  return (
    <svg className="anime-guide" viewBox="0 0 200 160" aria-hidden="true">
      <rect width="200" height="160" rx="24" fill="#fde6ef" />
      <rect x="44" y="28" width="112" height="104" rx="14" fill="#fff" opacity="0.95" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x="58" y={44 + i * 16} width={90 - i * 8} height="8" rx="4" fill="#2a2430" opacity={0.14 - i * 0.02} />
      ))}
      <path d="M130 108l16 16" stroke="#ef7fa8" strokeWidth="4" strokeLinecap="round" />
      <circle cx="118" cy="96" r="18" fill="none" stroke="#ef7fa8" strokeWidth="3" />
    </svg>
  )
}

export function WriteGuide() {
  return (
    <svg className="anime-guide" viewBox="0 0 200 160" aria-hidden="true">
      <defs>
        <linearGradient id="writeGuideBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e4f7ee" />
          <stop offset="100%" stopColor="#8ed9b8" />
        </linearGradient>
      </defs>
      <rect width="200" height="160" rx="24" fill="url(#writeGuideBg)" />
      <rect x="40" y="36" width="120" height="88" rx="12" fill="#fff" opacity="0.94" />
      <path d="M56 58h72M56 78h56M56 98h64" stroke="#5fc49a" strokeWidth="3" strokeLinecap="round" />
      <path d="M128 100l20 16-10 4-4-10 20-20" fill="#ef7fa8" />
    </svg>
  )
}

export function PublicGuide() {
  return (
    <svg className="anime-guide" viewBox="0 0 200 160" aria-hidden="true">
      <rect width="200" height="160" rx="24" fill="url(#pubGrad)" />
      <defs>
        <linearGradient id="pubGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f7a8c4" />
          <stop offset="100%" stopColor="#c9b6ff" />
        </linearGradient>
      </defs>
      <circle cx="68" cy="72" r="22" fill="#fff" opacity="0.9" />
      <circle cx="100" cy="64" r="26" fill="#fff" />
      <circle cx="132" cy="72" r="22" fill="#fff" opacity="0.9" />
      <path d="M56 108h88" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
      <path d="M72 120l28-12 28 12" fill="#ef7fa8" opacity="0.85" />
    </svg>
  )
}
