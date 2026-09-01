import type { LandingContent } from '@bloomani/shared'

/** Landing page copy — later replace with CMS / DB */
export const landingContent: LandingContent = {
  brand: 'Bloomani',
  navLinks: [
    { href: '/character', label: '角色设计' },
    { href: '/story', label: '剧情设计' },
    { href: '/generate', label: '内容生成' },
  ],
  navCta: '开始创作',
  hero: {
    brand: 'Bloomani',
    headline: '年轻活力的 AI 动画创作台',
    lead: '角色、剧情、成片一气呵成，浏览轻松，开拍更快。',
    primaryCta: '免费试试',
    secondaryCta: '看看怎么做',
  },
  features: [
    {
      id: 'character',
      eyebrow: '01 · 角色设计',
      title: '定住角色，镜头里始终是同一个人',
      copy: '上传参考图或一句话描述，生成可复用的角色设定。发型、服装、表情气质一次锁定，后续每一镜都保持一致。',
      tone: 'rose',
    },
    {
      id: 'story',
      eyebrow: '02 · 剧情设计',
      title: '把灵感铺成可拍的故事板',
      copy: '从一句话梗概到分镜大纲，自动梳理情绪节奏与场景转换。像导演一样改剧情，而不是反复重写提示词。',
      tone: 'mint',
    },
    {
      id: 'generate',
      eyebrow: '03 · 内容生成',
      title: '一键出片，角色与剧情自然衔接',
      copy: '角色与剧情就绪后，交给生成管线完成镜头、节奏与成片。年轻创作者也能轻松做出完整动画短片。',
      tone: 'blend',
    },
  ],
  footerTagline: 'AI 动画创作工具 · 让故事轻轻开拍',
}
