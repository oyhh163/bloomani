import type {
  CreateFromIdeaInput,
  ImportScriptInput,
  Screenplay,
  ScreenplayScene,
  ShotSpec,
} from '@bloomani/shared'
import { routeModel } from './modelRouter.js'
import { db, id, nowIso } from '../store/memory.js'

/**
 * Scriptwriter + Storyboarder skeleton.
 * Real impl: LLM structured output (Claude) + PenShot-like duration planning.
 */
export function buildScreenplayFromIdea(
  projectId: string,
  input: CreateFromIdeaInput,
): Screenplay {
  const duration = input.targetDurationSec ?? 45
  const scenes = inventScenes(input.idea)
  const shots = inventShots(scenes, duration, input.styleHints)

  const screenplay: Screenplay = {
    id: id('sp'),
    projectId,
    logline: input.idea.trim(),
    synopsis: `基于创意「${input.idea.trim()}」扩展的结构化短片大纲（骨架）。`,
    targetDurationSec: duration,
    beats: [
      { id: id('beat'), act: 1, summary: '铺垫：建立角色与世界', emotion: 'curious' },
      { id: id('beat'), act: 2, summary: '冲突：遇到阻碍或转折', emotion: 'tense' },
      { id: id('beat'), act: 3, summary: '收束：情绪落地与余韵', emotion: 'warm' },
    ],
    scenes,
    shots,
    updatedAt: nowIso(),
  }

  db.screenplays.set(screenplay.id, screenplay)
  return screenplay
}

export function buildScreenplayFromScript(
  projectId: string,
  input: ImportScriptInput,
): Screenplay {
  return buildScreenplayFromIdea(projectId, {
    idea: input.script.slice(0, 200),
    targetDurationSec: input.targetDurationSec,
    language: input.language,
    aspectRatio: input.aspectRatio,
    styleHints: input.styleHints,
    mode: input.mode,
  })
}

export function getScreenplay(screenplayId: string): Screenplay | undefined {
  return db.screenplays.get(screenplayId)
}

function inventScenes(idea: string): ScreenplayScene[] {
  return [
    {
      id: id('sc'),
      index: 1,
      title: '开场',
      location: '主场景 A',
      timeOfDay: 'day',
      summary: `引入故事：${idea}`,
      characterIds: [],
    },
    {
      id: id('sc'),
      index: 2,
      title: '发展',
      location: '主场景 B',
      timeOfDay: 'day',
      summary: '冲突与推进',
      characterIds: [],
    },
    {
      id: id('sc'),
      index: 3,
      title: '收束',
      location: '主场景 A',
      timeOfDay: 'golden_hour',
      summary: '情绪收束与余韵',
      characterIds: [],
    },
  ]
}

function inventShots(
  scenes: ScreenplayScene[],
  totalDuration: number,
  styleHints?: string[],
): ShotSpec[] {
  const perShot = Math.max(4, Math.min(8, Math.round(totalDuration / (scenes.length * 2))))
  const shots: ShotSpec[] = []
  let index = 1

  for (const scene of scenes) {
    for (const [offset, size] of [
      [0, 'wide'],
      [1, 'medium'],
    ] as const) {
      const route = routeModel({
        capability: 'text_to_video',
        styleHints,
        cinematic: true,
      })

      shots.push({
        id: id('shot'),
        index: index++,
        sceneId: scene.id,
        title: `${scene.title} · 镜${offset + 1}`,
        durationSec: perShot,
        camera: {
          size,
          move: offset === 0 ? 'dolly' : 'static',
          notes: 'skeleton camera plan',
        },
        characterIds: [],
        action: scene.summary,
        dialogue: [],
        emotion: scene.index === 2 ? 'tense' : 'warm',
        continuityNotes: offset === 1 ? '承接上一镜运动方向' : undefined,
        visualPrompt: [
          scene.summary,
          `camera: ${size}`,
          styleHints?.length ? `style: ${styleHints.join(', ')}` : '',
        ]
          .filter(Boolean)
          .join(' | '),
        selectedModelId: route.modelId,
        routeReason: route.reason,
      })
    }
  }

  return shots
}
