import type {
  CharacterAsset,
  CreateCharacterInput,
  CreateSceneInput,
  SceneAsset,
  StyleProfile,
} from '@bloomani/shared'
import { env } from '../config/env.js'
import {
  createCharacterPg,
  deleteCharacterPg,
  getCharacterPg,
  listLibraryCharactersPg,
} from '../repositories/characterRepo.js'
import { createScenePg, listScenesPg } from '../repositories/sceneRepo.js'
import { getStylePg, upsertStylePg, type UpsertStyleInput } from '../repositories/styleRepo.js'
import { db, id, nowIso } from '../store/memory.js'

export async function listLibraryCharacters(
  userId = env.defaultUserId,
): Promise<CharacterAsset[]> {
  if (env.storageDriver === 'postgres') {
    return listLibraryCharactersPg(userId)
  }
  return [...db.characters.values()].filter((c) => c.libraryScoped)
}

export async function listProjectCharacters(
  projectId: string,
  userId = env.defaultUserId,
): Promise<CharacterAsset[]> {
  if (env.storageDriver === 'postgres') {
    const all = await listLibraryCharactersPg(userId)
    return all.filter((c) => c.projectId === projectId || c.libraryScoped)
  }
  return [...db.characters.values()].filter(
    (c) => c.projectId === projectId || c.libraryScoped,
  )
}

export async function createCharacter(
  input: CreateCharacterInput,
  userId = env.defaultUserId,
): Promise<CharacterAsset> {
  if (env.storageDriver === 'postgres') {
    return createCharacterPg(input, userId)
  }

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

  if (input.projectId) {
    const project = db.projects.get(input.projectId)
    if (project && !project.characterIds.includes(character.id)) {
      project.characterIds = [...project.characterIds, character.id]
      project.updatedAt = nowIso()
    }
  }

  return character
}

export async function getCharacter(characterId: string): Promise<CharacterAsset | undefined> {
  if (env.storageDriver === 'postgres') {
    return getCharacterPg(characterId)
  }
  return db.characters.get(characterId)
}

export async function deleteCharacter(characterId: string): Promise<boolean> {
  if (env.storageDriver === 'postgres') {
    return deleteCharacterPg(characterId)
  }
  return db.characters.delete(characterId)
}

export async function createScene(
  input: CreateSceneInput,
  userId = env.defaultUserId,
): Promise<SceneAsset> {
  if (env.storageDriver === 'postgres') {
    return createScenePg(input, userId)
  }

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

export async function listScenes(projectId?: string): Promise<SceneAsset[]> {
  if (env.storageDriver === 'postgres') {
    return listScenesPg(projectId)
  }
  const all = [...db.scenes.values()]
  if (!projectId) return all.filter((s) => s.libraryScoped)
  return all.filter((s) => s.projectId === projectId || s.libraryScoped)
}

export async function upsertStyle(
  partial: UpsertStyleInput,
  userId = env.defaultUserId,
): Promise<StyleProfile> {
  if (env.storageDriver === 'postgres') {
    return upsertStylePg(partial, userId)
  }

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

export async function getStyle(styleId: string): Promise<StyleProfile | undefined> {
  if (env.storageDriver === 'postgres') {
    return getStylePg(styleId)
  }
  return db.styles.get(styleId)
}
