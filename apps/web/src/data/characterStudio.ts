export type CharacterMode = 'text' | 'upload' | 'library' | 'custom'

export const characterModes: { id: CharacterMode; label: string; hint: string }[] = [
  { id: 'text', label: '文本生成', hint: '一句话描述气质与外形' },
  { id: 'upload', label: '图片生成', hint: '上传参考图锁定形象' },
  { id: 'library', label: 'AI 演员库', hint: '选用可复用的角色资产' },
  { id: 'custom', label: '自定义形象', hint: '拼搭脸型五官与发型' },
]

export type ActorCard = {
  id: string
  name: string
  vibe: string
  tags: string[]
  tone: 'rose' | 'mint' | 'blend'
}

/** Placeholder library — source of assets to be researched later */
export const mockActors: ActorCard[] = [
  { id: 'a1', name: '桃桃', vibe: '软萌学园少女', tags: ['日系', '青春'], tone: 'rose' },
  { id: 'a2', name: '青禾', vibe: '清爽少年感', tags: ['校园', '阳光'], tone: 'mint' },
  { id: 'a3', name: '星野', vibe: '夜色偶像风', tags: ['舞台', '闪片'], tone: 'blend' },
  { id: 'a4', name: '阿柚', vibe: '治愈系短发', tags: ['日常', '温柔'], tone: 'rose' },
  { id: 'a5', name: '岚', vibe: '运动少年', tags: ['热血', '街头'], tone: 'mint' },
  { id: 'a6', name: '四月', vibe: '文艺插画风', tags: ['水彩', '安静'], tone: 'blend' },
]

export type PartCategory = 'face' | 'hair' | 'eyes' | 'nose' | 'mouth'

export const partLabels: Record<PartCategory, string> = {
  face: '脸型',
  hair: '发型',
  eyes: '眼睛',
  nose: '鼻子',
  mouth: '嘴巴',
}

export const partOptions: Record<PartCategory, { id: string; label: string }[]> = {
  face: [
    { id: 'face-round', label: '圆脸' },
    { id: 'face-oval', label: '鹅蛋脸' },
    { id: 'face-soft', label: '柔和方脸' },
  ],
  hair: [
    { id: 'hair-bob', label: '短波波' },
    { id: 'hair-long', label: '长直发' },
    { id: 'hair-twin', label: '双马尾' },
    { id: 'hair-messy', label: '凌乱短发' },
  ],
  eyes: [
    { id: 'eyes-round', label: '圆瞳' },
    { id: 'eyes-fox', label: '狐眼' },
    { id: 'eyes-soft', label: '垂眼' },
  ],
  nose: [
    { id: 'nose-tiny', label: '小巧' },
    { id: 'nose-straight', label: '挺直' },
    { id: 'nose-soft', label: '柔线' },
  ],
  mouth: [
    { id: 'mouth-smile', label: '浅笑' },
    { id: 'mouth-neutral', label: '自然' },
    { id: 'mouth-pout', label: '微嘟' },
  ],
}
