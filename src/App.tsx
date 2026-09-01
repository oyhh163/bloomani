import { motion, useReducedMotion } from 'framer-motion'
import './App.css'

const features = [
  {
    id: 'character',
    eyebrow: '01 · 角色设计',
    title: '定住角色，镜头里始终是同一个人',
    copy: '上传参考图或一句话描述，生成可复用的角色设定。发型、服装、表情气质一次锁定，后续每一镜都保持一致。',
    tone: 'rose' as const,
  },
  {
    id: 'story',
    eyebrow: '02 · 剧情设计',
    title: '把灵感铺成可拍的故事板',
    copy: '从一句话梗概到分镜大纲，自动梳理情绪节奏与场景转换。像导演一样改剧情，而不是反复重写提示词。',
    tone: 'mint' as const,
  },
  {
    id: 'generate',
    eyebrow: '03 · 内容生成',
    title: '一键出片，角色与剧情自然衔接',
    copy: '角色与剧情就绪后，交给生成管线完成镜头、节奏与成片。年轻创作者也能轻松做出完整动画短片。',
    tone: 'blend' as const,
  },
]

export default function App() {
  const reduceMotion = useReducedMotion()

  return (
    <div className="page">
      <div className="ambient" aria-hidden="true">
        <span className="blob blob-a" />
        <span className="blob blob-b" />
        <span className="blob blob-c" />
      </div>

      <header className="nav">
        <a className="brand" href="#top" aria-label="Bloomani 首页">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-text">Bloomani</span>
        </a>
        <nav className="nav-links" aria-label="主导航">
          <a href="#character">角色设计</a>
          <a href="#story">剧情设计</a>
          <a href="#generate">内容生成</a>
        </nav>
        <a className="nav-cta" href="#start">
          开始创作
        </a>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-stage" aria-hidden="true">
            <HeroArt />
          </div>

          <div className="hero-copy">
            <motion.p
              className="brand-hero"
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              Bloomani
            </motion.p>
            <motion.h1
              initial={reduceMotion ? false : { opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              年轻活力的 AI 动画创作台
            </motion.h1>
            <motion.p
              className="hero-lead"
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
            >
              角色、剧情、成片一气呵成，浏览轻松，开拍更快。
            </motion.p>
            <motion.div
              className="hero-actions"
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              <a className="btn btn-primary" href="#start" id="start">
                免费试试
              </a>
              <a className="btn btn-ghost" href="#character">
                看看怎么做
              </a>
            </motion.div>
          </div>
        </section>

        {features.map((feature, index) => (
          <FeatureSection key={feature.id} {...feature} reverse={index % 2 === 1} />
        ))}
      </main>

      <footer className="footer">
        <div className="footer-brand">
          <span className="brand-mark" aria-hidden="true" />
          <span>Bloomani</span>
        </div>
        <p>AI 动画创作工具 · 让故事轻轻开拍</p>
      </footer>
    </div>
  )
}

function FeatureSection({
  id,
  eyebrow,
  title,
  copy,
  tone,
  reverse,
}: {
  id: string
  eyebrow: string
  title: string
  copy: string
  tone: 'rose' | 'mint' | 'blend'
  reverse: boolean
}) {
  const reduceMotion = useReducedMotion()

  return (
    <section id={id} className={`feature feature-${tone} ${reverse ? 'is-reverse' : ''}`}>
      <motion.div
        className="feature-copy"
        initial={reduceMotion ? false : { opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="feature-eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p className="feature-lead">{copy}</p>
      </motion.div>
      <motion.div
        className="feature-visual"
        aria-hidden="true"
        initial={reduceMotion ? false : { opacity: 0, y: 36 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.65, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
      >
        {id === 'character' && <CharacterArt />}
        {id === 'story' && <StoryArt />}
        {id === 'generate' && <GenerateArt />}
      </motion.div>
    </section>
  )
}

function HeroArt() {
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

function CharacterArt() {
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

function StoryArt() {
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

function GenerateArt() {
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
