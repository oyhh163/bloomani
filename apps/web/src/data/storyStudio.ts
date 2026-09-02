export type StoryMode = 'import' | 'write' | 'public'

export const storyModes: { id: StoryMode; label: string; hint: string }[] = [
  { id: 'import', label: '导入小说', hint: '粘贴或上传文本，拆成可拍剧本' },
  { id: 'write', label: '自写剧本', hint: '边写边保存，随时继续改' },
  { id: 'public', label: '公开故事', hint: '选用社区公开的故事生成视频' },
]

export type PublicStory = {
  id: string
  title: string
  author: string
  summary: string
  durationLabel: string
  tags: string[]
  likes: number
}

export const mockPublicStories: PublicStory[] = [
  {
    id: 's1',
    title: '便利店深夜的星星糖',
    author: '阿梨',
    summary: '兼职少年遇见会发光的小猫，决定陪它走完这座城的一夜。',
    durationLabel: '45 秒',
    tags: ['治愈', '都市'],
    likes: 128,
  },
  {
    id: 's2',
    title: '雨停之前的告白',
    author: '木子',
    summary: '天桥上的两人共用一把伞，直到雨停才敢说出那句话。',
    durationLabel: '60 秒',
    tags: ['青春', '情感'],
    likes: 96,
  },
  {
    id: 's3',
    title: '像素小岛救援队',
    author: 'PixelKid',
    summary: '三位小怪物组队修好灯塔，把迷航的船带回港口。',
    durationLabel: '30 秒',
    tags: ['冒险', 'Q萌'],
    likes: 210,
  },
  {
    id: 's4',
    title: '旧书店的时间折叠',
    author: '晚风',
    summary: '推开木门会进入昨天，女主用一封未寄出的信改写结局。',
    durationLabel: '90 秒',
    tags: ['奇幻', '悬念'],
    likes: 74,
  },
]

/** @deprecated Drafts are persisted via `/api/story-drafts` */
export const SCRIPT_STORAGE_KEY = 'bloomani.story.drafts'
