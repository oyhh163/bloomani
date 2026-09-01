/** AniME professional agents — virtual studio roles */

export type AgentRole =
  | 'director'
  | 'art_director'
  | 'scriptwriter'
  | 'character_designer'
  | 'scene_designer'
  | 'storyboarder'
  | 'animator'
  | 'post_editor'
  | 'audio_director'

export type AgentStatus = 'idle' | 'running' | 'waiting' | 'succeeded' | 'failed'

export interface AgentDescriptor {
  role: AgentRole
  name: string
  description: string
  /** Preferred model families for this role (router may override) */
  preferredModels: string[]
}

export interface AgentRunEvent {
  id: string
  projectId: string
  role: AgentRole
  status: AgentStatus
  message: string
  progress?: number
  createdAt: string
  meta?: Record<string, unknown>
}

export const ANIME_AGENTS: AgentDescriptor[] = [
  {
    role: 'director',
    name: '导演',
    description: '全局调度：拆解任务、编排流水线、协调各职能智能体',
    preferredModels: ['gpt-4o', 'claude-3.5-sonnet'],
  },
  {
    role: 'art_director',
    name: '艺术总监',
    description: '定调风格/色板/光影，并为每个镜头推荐渲染后端',
    preferredModels: ['gpt-4o', 'claude-3.5-sonnet'],
  },
  {
    role: 'scriptwriter',
    name: '编剧',
    description: '将创意扩展为结构化剧本（场、对白、动作、情绪弧）',
    preferredModels: ['claude-3.5-sonnet'],
  },
  {
    role: 'character_designer',
    name: '角色设计师',
    description: '生成多视角设定图并锁定角色身份特征，写入资产库',
    preferredModels: ['flux.1-dev', 'nano-banana-pro'],
  },
  {
    role: 'scene_designer',
    name: '场景设计师',
    description: '生成可复用场景资产与环境元数据',
    preferredModels: ['flux.1-dev', 'midjourney'],
  },
  {
    role: 'storyboarder',
    name: '分镜师',
    description: '将剧本拆成镜头规格：景别、运镜、时长、画面动作',
    preferredModels: ['gpt-4o', 'claude-3.5-sonnet'],
  },
  {
    role: 'animator',
    name: '动画师',
    description: '按镜头调用视频模型，注入角色/场景约束生成 clip',
    preferredModels: ['sora-2', 'veo-3.1', 'kling', 'seedance-2'],
  },
  {
    role: 'post_editor',
    name: '后期合成师',
    description: '剪辑拼接、转场、节奏回流时间线',
    preferredModels: ['ffmpeg'],
  },
  {
    role: 'audio_director',
    name: '音频总监',
    description: '配乐、音效、对白配音与混音',
    preferredModels: ['elevenlabs', 'gpt-sovits'],
  },
]
