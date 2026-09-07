import type { CharacterAsset, Project, SceneAsset, StyleProfile } from '@bloomani/shared'
import type { PromptContext } from '@bloomani/shared'
import { getCharacter, getStyle, listScenes } from './assetMemory.js'

/**
 * 汇总项目的视觉锚点：风格 / 主场景 / 角色定妆。
 * 任何需要渲染提示词的地方（分镜、图像、视频）都从这里取上下文，
 * 保证全剧复用同一套视觉约束。
 */
export async function collectPromptContext(
  project: Project,
  userId: string,
): Promise<PromptContext> {
  const style: StyleProfile | undefined = project.styleId
    ? await getStyle(project.styleId)
    : undefined

  let scene: SceneAsset | undefined
  if (project.sceneIds.length > 0) {
    const scenes = await listScenes(project.id)
    scene = scenes.find((s) => s.id === project.sceneIds[0]) ?? scenes[0]
  }

  const characters: CharacterAsset[] = []
  for (const characterId of project.characterIds) {
    const character = await getCharacter(characterId)
    if (character) characters.push(character)
  }

  return {
    style,
    scene,
    characters: characters.length > 0 ? characters : undefined,
    negativePrompt: style ? buildNegative(style) : undefined,
  }
}

function buildNegative(style: StyleProfile): string {
  return [
    '闪烁',
    '画面抖动',
    '多余肢体',
    '面部崩坏',
    '字幕水印',
    style.aspectRatio === '9:16' ? '横向构图' : '',
  ]
    .filter(Boolean)
    .join('，')
}
