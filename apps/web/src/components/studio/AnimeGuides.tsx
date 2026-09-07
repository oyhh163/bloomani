/** Minimal anime-style guide illustrations for portal entries */

const rose = 'var(--rose)'
const roseDeep = 'var(--rose-deep)'
const roseSoft = 'var(--rose-soft)'
const mint = 'var(--mint)'
const mintDeep = 'var(--mint-deep)'
const mintSoft = 'var(--mint-soft)'
const violet = 'var(--violet)'
const ink = 'var(--ink)'
const surface = 'var(--surface)'

export function TextGuide() {
  return (
    <svg className="anime-guide" viewBox="0 0 200 160" aria-hidden="true">
      <defs>
        <linearGradient id="textGuideBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" style={{ stopColor: roseSoft }} />
          <stop offset="100%" style={{ stopColor: rose }} />
        </linearGradient>
      </defs>
      <rect width="200" height="160" rx="24" fill="url(#textGuideBg)" />
      <rect x="36" y="38" width="128" height="14" rx="7" style={{ fill: surface }} opacity="0.9" />
      <rect x="36" y="62" width="96" height="10" rx="5" style={{ fill: surface }} opacity="0.65" />
      <rect x="36" y="82" width="110" height="10" rx="5" style={{ fill: surface }} opacity="0.5" />
      <circle cx="148" cy="108" r="28" style={{ fill: roseDeep }} />
      <circle cx="140" cy="102" r="5" style={{ fill: ink }} />
      <circle cx="156" cy="102" r="5" style={{ fill: ink }} />
      <path
        d="M138 116c8 10 20 10 28 0"
        style={{ stroke: ink }}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M52 118l12-8 8 6 14-18"
        style={{ stroke: mintDeep }}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

export function UploadGuide() {
  return (
    <svg className="anime-guide" viewBox="0 0 200 160" aria-hidden="true">
      <defs>
        <linearGradient id="uploadGuideBg" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" style={{ stopColor: mintSoft }} />
          <stop offset="100%" style={{ stopColor: mint }} />
        </linearGradient>
      </defs>
      <rect width="200" height="160" rx="24" fill="url(#uploadGuideBg)" />
      <rect
        x="48"
        y="32"
        width="104"
        height="96"
        rx="16"
        style={{ fill: surface, stroke: mintDeep }}
        opacity="0.92"
        strokeWidth="2"
        strokeDasharray="6 4"
      />
      <path
        d="M100 52v36M82 70l18-18 18 18"
        style={{ stroke: mintDeep }}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="72" cy="58" r="14" style={{ fill: rose }} opacity="0.85" />
      <rect x="108" y="108" width="44" height="28" rx="8" style={{ fill: ink }} opacity="0.08" />
    </svg>
  )
}

export function LibraryGuide() {
  return (
    <svg className="anime-guide" viewBox="0 0 200 160" aria-hidden="true">
      <defs>
        <linearGradient id="libGuideBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" style={{ stopColor: rose }} />
          <stop offset="100%" style={{ stopColor: mint }} />
        </linearGradient>
      </defs>
      <rect width="200" height="160" rx="24" fill="url(#libGuideBg)" />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${28 + i * 52} 36)`}>
          <rect width="44" height="88" rx="12" style={{ fill: surface }} opacity={0.92 - i * 0.08} />
          <circle cx="22" cy="32" r="14" style={{ fill: i === 1 ? roseDeep : mint }} />
          <rect x="8" y="56" width="28" height="6" rx="3" style={{ fill: ink }} opacity="0.12" />
          <rect x="8" y="68" width="20" height="5" rx="2.5" style={{ fill: ink }} opacity="0.08" />
        </g>
      ))}
      <rect x="60" y="118" width="80" height="8" rx="4" style={{ fill: surface }} opacity="0.55" />
    </svg>
  )
}

export function CustomGuide() {
  return (
    <svg className="anime-guide" viewBox="0 0 200 160" aria-hidden="true">
      <rect width="200" height="160" rx="24" style={{ fill: roseSoft }} />
      <circle cx="100" cy="72" r="40" style={{ fill: roseSoft, stroke: rose }} strokeWidth="2" />
      <ellipse cx="100" cy="58" rx="38" ry="28" style={{ fill: roseDeep }} />
      <circle cx="86" cy="68" r="5" style={{ fill: ink }} />
      <circle cx="114" cy="68" r="5" style={{ fill: ink }} />
      <path
        d="M88 82c6 8 18 8 24 0"
        style={{ stroke: ink }}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={i}
          x={36 + i * 26}
          y={118}
          width="20"
          height="20"
          rx="6"
          style={{ fill: i === 2 ? mint : roseSoft, stroke: i === 2 ? mintDeep : rose }}
          strokeWidth="1.5"
        />
      ))}
    </svg>
  )
}

export function ImportGuide() {
  return (
    <svg className="anime-guide" viewBox="0 0 200 160" aria-hidden="true">
      <rect width="200" height="160" rx="24" style={{ fill: roseSoft }} />
      <rect x="44" y="28" width="112" height="104" rx="14" style={{ fill: surface }} opacity="0.95" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={i}
          x="58"
          y={44 + i * 16}
          width={90 - i * 8}
          height="8"
          rx="4"
          style={{ fill: ink }}
          opacity={0.14 - i * 0.02}
        />
      ))}
      <path d="M130 108l16 16" style={{ stroke: roseDeep }} strokeWidth="4" strokeLinecap="round" />
      <circle cx="118" cy="96" r="18" fill="none" style={{ stroke: roseDeep }} strokeWidth="3" />
    </svg>
  )
}

export function WriteGuide() {
  return (
    <svg className="anime-guide" viewBox="0 0 200 160" aria-hidden="true">
      <defs>
        <linearGradient id="writeGuideBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: mintSoft }} />
          <stop offset="100%" style={{ stopColor: mint }} />
        </linearGradient>
      </defs>
      <rect width="200" height="160" rx="24" fill="url(#writeGuideBg)" />
      <rect x="40" y="36" width="120" height="88" rx="12" style={{ fill: surface }} opacity="0.94" />
      <path
        d="M56 58h72M56 78h56M56 98h64"
        style={{ stroke: mintDeep }}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M128 100l20 16-10 4-4-10 20-20" style={{ fill: roseDeep }} />
    </svg>
  )
}

/**
 * 多视图 / 风格定妆入口图（双卡片叠放示意）
 */
export function TurnaroundGuide() {
  return (
    <svg className="anime-guide" viewBox="0 0 200 160" aria-hidden="true">
      <defs>
        <linearGradient id="taBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" style={{ stopColor: rose }} />
          <stop offset="100%" style={{ stopColor: violet }} />
        </linearGradient>
      </defs>
      <rect width="200" height="160" rx="24" fill="url(#taBg)" />
      {/* 头像卡片 */}
      <rect x="20" y="30" width="60" height="100" rx="12" style={{ fill: surface }} opacity="0.95" />
      <circle cx="50" cy="60" r="18" style={{ fill: roseSoft, stroke: roseDeep }} strokeWidth="2" />
      <ellipse cx="50" cy="48" rx="20" ry="14" style={{ fill: roseDeep }} />
      <circle cx="44" cy="58" r="2" style={{ fill: ink }} />
      <circle cx="56" cy="58" r="2" style={{ fill: ink }} />
      <path
        d="M44 68c4 5 12 5 16 0"
        style={{ stroke: ink }}
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
      <rect x="28" y="92" width="44" height="6" rx="3" style={{ fill: ink }} opacity="0.12" />
      {/* 全身卡片 */}
      <rect x="92" y="22" width="86" height="116" rx="14" style={{ fill: surface }} opacity="0.95" />
      <ellipse cx="135" cy="44" rx="22" ry="16" style={{ fill: violet }} />
      <circle cx="135" cy="58" r="18" style={{ fill: roseSoft, stroke: roseDeep }} strokeWidth="2" />
      <circle cx="129" cy="56" r="2" style={{ fill: ink }} />
      <circle cx="141" cy="56" r="2" style={{ fill: ink }} />
      <path
        d="M129 66c4 5 12 5 16 0"
        style={{ stroke: ink }}
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M120 80c-2 16 -2 30 0 46M150 80c2 16 2 30 0 46"
        style={{ stroke: violet }}
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M132 76l3 14 3 -14" style={{ fill: roseDeep }} />
      {/* 小指示灯：4 视图 */}
      <g transform="translate(100 130)" fontFamily="sans-serif" fontSize="9" style={{ fill: surface }} opacity="0.85">
        <circle cx="6" cy="6" r="3" style={{ fill: surface }} />
        <circle cx="20" cy="6" r="3" style={{ fill: surface }} />
        <circle cx="34" cy="6" r="3" style={{ fill: surface }} />
        <circle cx="48" cy="6" r="3" style={{ fill: surface }} />
      </g>
    </svg>
  )
}

export function PublicGuide() {
  return (
    <svg className="anime-guide" viewBox="0 0 200 160" aria-hidden="true">
      <rect width="200" height="160" rx="24" fill="url(#pubGrad)" />
      <defs>
        <linearGradient id="pubGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" style={{ stopColor: rose }} />
          <stop offset="100%" style={{ stopColor: violet }} />
        </linearGradient>
      </defs>
      <circle cx="68" cy="72" r="22" style={{ fill: surface }} opacity="0.9" />
      <circle cx="100" cy="64" r="26" style={{ fill: surface }} />
      <circle cx="132" cy="72" r="22" style={{ fill: surface }} opacity="0.9" />
      <path d="M56 108h88" style={{ stroke: surface }} strokeWidth="4" strokeLinecap="round" opacity="0.7" />
      <path d="M72 120l28-12 28 12" style={{ fill: roseDeep }} opacity="0.85" />
    </svg>
  )
}
