import type {
  CharacterAsset,
  CreateCharacterInput,
  CreateSceneInput,
  SceneAsset,
  StyleProfile,
} from '@bloomani/shared'
import { db, id, nowIso } from '../store/memory.js'

export function listLibraryCharacters(): CharacterAsset[] {
  return [...db.characters.values()].filter((c) => c.libraryScoped)
}

export function listProjectCharacters(projectId: string): CharacterAsset[] {
  return [...db.characters.values()].filter(
    (c) => c.projectId === projectId || c.libraryScoped,
  )
}

export function createCharacter(input: CreateCharacterInput): CharacterAsset {
  const stamp = nowIso()
  const character: CharacterAsset = {
    id: id('char'),
    kind: 'character',
    name: input.name,
    bio: input.bio,
    personality: input.personality,
    projectId: input.projectId,
    libraryScoped: input.libraryScoped ?? true,
    tags: [],
    styleId: input.styleId,
    visualLock: {
      face: `derived from: ${input.description}`,
      hair: 'pending lock',
      outfit: 'pending lock',
      proportions: 'pending lock',
      accessories: [],
      identityPrompt: input.description,
    },
    sheets: (input.referenceUrls ?? []).map((url, index) => ({
      view: index === 0 ? 'front' : 'three_quarter',
      url,
    })),
    identityMemory: {
      embeddingId: id('emb'),
      model: 'identity-encoder-stub',
      dimensions: 768,
    },
    createdAt: stamp,
    updatedAt: stamp,
  }

  db.characters.set(character.id, character)
  return character
}

export function getCharacter(characterId: string): CharacterAsset | undefined {
  return db.characters.get(characterId)
}

export function createScene(input: CreateSceneInput): SceneAsset {
  const stamp = nowIso()
  const scene: SceneAsset = {
    id: id('scene'),
    kind: 'scene',
    name: input.name,
    description: input.description,
    projectId: input.projectId,
    libraryScoped: input.libraryScoped ?? true,
    tags: [],
    environment: {
      timeOfDay: input.environment?.timeOfDay,
      weather: input.environment?.weather,
      mood: input.environment?.mood,
      lighting: input.environment?.lighting,
      keyProps: input.environment?.keyProps ?? [],
    },
    referenceUrls: input.referenceUrls ?? [],
    consistencyPrompt: input.description,
    createdAt: stamp,
    updatedAt: stamp,
  }

  db.scenes.set(scene.id, scene)
  return scene
}

export function listScenes(projectId?: string): SceneAsset[] {
  const all = [...db.scenes.values()]
  if (!projectId) return all.filter((s) => s.libraryScoped)
  return all.filter((s) => s.projectId === projectId || s.libraryScoped)
}

export function upsertStyle(
  partial: Omit<StyleProfile, 'id' | 'kind' | 'createdAt' | 'updatedAt'> & {
    id?: string
  },
): StyleProfile {
  const stamp = nowIso()
  const styleId = partial.id ?? id('style')
  const existing = db.styles.get(styleId)
  const style: StyleProfile = {
    id: styleId,
    kind: 'style',
    name: partial.name,
    label: partial.label,
    palette: partial.palette,
    lightingMood: partial.lightingMood,
    aspectRatio: partial.aspectRatio,
    stylePrompt: partial.stylePrompt,
    preferredRenderModels: partial.preferredRenderModels,
    libraryScoped: partial.libraryScoped,
    projectId: partial.projectId,
    tags: partial.tags ?? [],
    createdAt: existing?.createdAt ?? stamp,
    updatedAt: stamp,
  }
  db.styles.set(style.id, style)
  return style
}

export function getStyle(styleId: string): StyleProfile | undefined {
  return db.styles.get(styleId)
}
