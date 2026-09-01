import type {
  CreateProjectInput,
  PipelineJob,
  PipelineStage,
  PipelineStageState,
  Project,
  ProjectBundle,
  StartPipelineInput,
} from '@bloomani/shared'
import {
  PIPELINE_STAGE_ORDER,
  STAGE_AGENT_MAP,
} from '@bloomani/shared'
import {
  createCharacter,
  createScene,
  getStyle,
  upsertStyle,
} from './assetMemory.js'
import { buildScreenplayFromIdea } from './screenplayService.js'
import { db, id, nowIso } from '../store/memory.js'

/**
 * Director agent skeleton — orchestrates the AniME pipeline stages.
 * Hosted mode runs stub stages sequentially; chat mode can pause later.
 */
export function createProject(input: CreateProjectInput): Project {
  const stamp = nowIso()
  const project: Project = {
    id: id('proj'),
    title: input.title?.trim() || deriveTitle(input.idea),
    idea: input.idea.trim(),
    status: 'draft',
    mode: input.mode ?? 'hosted',
    aspectRatio: input.aspectRatio ?? '9:16',
    language: input.language ?? 'zh-CN',
    characterIds: input.characterIds ?? [],
    sceneIds: [],
    createdAt: stamp,
    updatedAt: stamp,
  }

  db.projects.set(project.id, project)
  return project
}

export function getProject(projectId: string): Project | undefined {
  return db.projects.get(projectId)
}

export function listProjects(): Project[] {
  return [...db.projects.values()].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  )
}

export function getProjectBundle(projectId: string): ProjectBundle | undefined {
  const project = db.projects.get(projectId)
  if (!project) return undefined

  return {
    project,
    style: project.styleId ? getStyle(project.styleId) : undefined,
    screenplay: project.screenplayId
      ? db.screenplays.get(project.screenplayId)
      : undefined,
  }
}

export function startPipeline(input: StartPipelineInput): PipelineJob {
  const project = db.projects.get(input.projectId)
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`)
  }

  const mode = input.mode ?? project.mode
  project.mode = mode
  project.status = 'planning'
  project.updatedAt = nowIso()

  const fromIndex = input.fromStage
    ? PIPELINE_STAGE_ORDER.indexOf(input.fromStage)
    : 0

  const stages: PipelineStageState[] = PIPELINE_STAGE_ORDER.map((stage, index) => ({
    stage,
    status: index < fromIndex ? 'succeeded' : index === fromIndex ? 'running' : 'queued',
    agentRole: STAGE_AGENT_MAP[stage],
    progress: index < fromIndex ? 100 : 0,
  }))

  const job: PipelineJob = {
    id: id('job'),
    projectId: project.id,
    status: 'running',
    currentStage: PIPELINE_STAGE_ORDER[Math.max(0, fromIndex)],
    stages,
    events: [
      {
        id: id('evt'),
        projectId: project.id,
        role: 'director',
        status: 'running',
        message: `导演启动流水线（${mode}）`,
        progress: 0,
        createdAt: nowIso(),
      },
    ],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }

  db.jobs.set(job.id, job)

  // Fire-and-forget stub runner (replace with queue worker)
  void runPipelineStub(job.id)

  return job
}

export function getJob(jobId: string): PipelineJob | undefined {
  return db.jobs.get(jobId)
}

export function listJobs(projectId?: string): PipelineJob[] {
  const all = [...db.jobs.values()]
  return projectId ? all.filter((j) => j.projectId === projectId) : all
}

async function runPipelineStub(jobId: string): Promise<void> {
  const job = db.jobs.get(jobId)
  if (!job) return
  const project = db.projects.get(job.projectId)
  if (!project) return

  for (const stage of PIPELINE_STAGE_ORDER) {
    const state = job.stages.find((s) => s.stage === stage)
    if (!state || state.status === 'succeeded') continue

    job.currentStage = stage
    state.status = 'running'
    state.startedAt = nowIso()
    state.progress = 10
    state.message = `${STAGE_AGENT_MAP[stage]} working…`
    pushEvent(job, STAGE_AGENT_MAP[stage], 'running', state.message)
    touch(job, project)

    try {
      await sleep(120)
      await executeStage(project, stage)
      state.status = 'succeeded'
      state.progress = 100
      state.finishedAt = nowIso()
      state.message = `${stage} done`
      pushEvent(job, STAGE_AGENT_MAP[stage], 'succeeded', state.message)
      touch(job, project)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'stage failed'
      state.status = 'failed'
      state.message = message
      job.status = 'failed'
      job.error = message
      project.status = 'failed'
      pushEvent(job, STAGE_AGENT_MAP[stage], 'failed', message)
      touch(job, project)
      return
    }
  }

  job.status = 'succeeded'
  job.currentStage = undefined
  project.status = 'completed'
  pushEvent(job, 'director', 'succeeded', '流水线完成（骨架模拟）')
  touch(job, project)
}

async function executeStage(project: Project, stage: PipelineStage): Promise<void> {
  switch (stage) {
    case 'art_direction': {
      const style = upsertStyle({
        name: `${project.title} Style`,
        label: 'Bloomani default youth anime',
        palette: ['#f7a8c4', '#8ed9b8', '#2a2430'],
        lightingMood: 'soft daylight',
        aspectRatio: project.aspectRatio,
        stylePrompt: 'youthful anime, soft rose-mint palette, clean lines',
        preferredRenderModels: ['sora-2', 'seedance-2', 'kling'],
        libraryScoped: false,
        projectId: project.id,
        tags: ['auto'],
      })
      project.styleId = style.id
      project.status = 'planning'
      break
    }
    case 'screenplay': {
      const screenplay = buildScreenplayFromIdea(project.id, {
        idea: project.idea,
        aspectRatio: project.aspectRatio,
        language: project.language,
        mode: project.mode,
      })
      project.screenplayId = screenplay.id
      break
    }
    case 'character_design': {
      if (project.characterIds.length === 0) {
        const character = createCharacter({
          name: '主角',
          description: `故事「${project.idea}」的核心角色`,
          projectId: project.id,
          libraryScoped: true,
          styleId: project.styleId,
        })
        project.characterIds = [character.id]
      }
      project.status = 'asset_ready'
      break
    }
    case 'scene_design': {
      const scene = createScene({
        name: '主场景',
        description: `适配「${project.idea}」的主环境`,
        projectId: project.id,
        libraryScoped: true,
        environment: { mood: 'soft', lighting: 'natural', keyProps: [] },
      })
      project.sceneIds = [scene.id]
      break
    }
    case 'storyboard': {
      project.status = 'storyboard_ready'
      break
    }
    case 'animate': {
      project.status = 'rendering'
      break
    }
    case 'edit':
    case 'audio': {
      project.status = 'editing'
      break
    }
    case 'export': {
      project.outputUrl = `https://example.local/exports/${project.id}.mp4`
      project.status = 'completed'
      break
    }
  }

  project.updatedAt = nowIso()
}

function pushEvent(
  job: PipelineJob,
  role: PipelineJob['events'][number]['role'],
  status: PipelineJob['events'][number]['status'],
  message: string,
): void {
  job.events.push({
    id: id('evt'),
    projectId: job.projectId,
    role,
    status,
    message,
    createdAt: nowIso(),
  })
}

function touch(job: PipelineJob, project: Project): void {
  const stamp = nowIso()
  job.updatedAt = stamp
  project.updatedAt = stamp
}

function deriveTitle(idea: string): string {
  const trimmed = idea.trim()
  return trimmed.length <= 24 ? trimmed || '未命名项目' : `${trimmed.slice(0, 24)}…`
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
