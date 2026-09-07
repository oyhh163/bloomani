import { eq } from 'drizzle-orm'
import type {
  CreateProjectInput,
  PipelineJob,
  PipelineStage,
  PipelineStageState,
  Project,
  ProjectBundle,
  StartPipelineInput,
  Timeline,
} from '@bloomani/shared'
import {
  PIPELINE_STAGE_ORDER,
  STAGE_AGENT_MAP,
} from '@bloomani/shared'
import { env } from '../config/env.js'
import { getDb } from '../db/client.js'
import { projects as projectsTable } from '../db/schema.js'
import {
  createProjectPg,
  getProjectPg,
  listProjectsPg,
  saveProjectPg,
} from '../repositories/projectRepo.js'
import {
  getPipelineJobPg,
  listPipelineJobsPg,
  savePipelineJobPg,
} from '../repositories/pipelineJobRepo.js'
import { getScreenplayPg } from '../repositories/screenplayRepo.js'
import { saveTimelinePg } from '../repositories/timelineRepo.js'
import {
  createCharacter,
  createScene,
  getStyle,
  upsertStyle,
} from './assetMemory.js'
import { collectPromptContext } from './assetContext.js'
import {
  breakdownEpisodes,
  listEpisodes,
  refreshEpisodePrompts,
  runQualityGate,
} from './episodeService.js'
import { runProductionStage } from './productionService.js'
import { buildScreenplayFromIdea, getScreenplay } from './screenplayService.js'
import { db, id, nowIso } from '../store/memory.js'
import { pollVideoTask, startVideoGeneration } from './videoService.js'

/**
 * 导出阶段：调用 Agnes 生成真实成片，返回可播放的视频地址。
 * 若 Agnes 未配置或生成失败，回退到占位地址，保证流水线不中断。
 */
async function generateExportVideo(project: Project): Promise<string> {
  try {
    const [aw, ah] = (project.aspectRatio || '9:16').split(':').map(Number)
    const height = 960
    const width = aw && ah ? Math.round((height * aw) / ah) : 540
    const task = await startVideoGeneration({
      prompt: `根据以下短剧创意生成成片：${project.title}。${project.idea}`,
      width,
      height,
      numFrames: 81,
      frameRate: 24,
    })
    const result = await pollVideoTask(task.videoId, { timeoutMs: 180000, maxAttempts: 60 })
    return result.url ?? `https://example.local/exports/${project.id}.mp4`
  } catch (err) {
    return `https://example.local/exports/${project.id}.mp4`
  }
}

async function ownerUserId(projectId: string): Promise<string> {
  if (env.storageDriver !== 'postgres') return env.defaultUserId
  const database = getDb()
  const [row] = await database
    .select({ userId: projectsTable.userId })
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId))
    .limit(1)
  return row?.userId ?? env.defaultUserId
}

/**
 * Director agent skeleton — orchestrates the AniME pipeline stages.
 * Hosted mode runs stub stages sequentially; chat mode can pause later.
 */
export async function createProject(
  input: CreateProjectInput,
  userId = env.defaultUserId,
): Promise<Project> {
  if (env.storageDriver === 'postgres') {
    return createProjectPg(input, userId)
  }

  const stamp = nowIso()
  const project: Project = {
    id: id('proj'),
    title: input.title?.trim() || deriveTitle(input.idea),
    idea: input.idea.trim(),
    userId,
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

export async function getProject(projectId: string): Promise<Project | undefined> {
  if (env.storageDriver === 'postgres') {
    // Always refresh from PG — sticky cache caused stale characterIds /
    // productionMeta to overwrite newer DB values on subsequent saves.
    const project = await getProjectPg(projectId)
    if (project) db.projects.set(project.id, project)
    return project
  }
  return db.projects.get(projectId)
}

export async function listProjects(userId = env.defaultUserId): Promise<Project[]> {
  if (env.storageDriver === 'postgres') {
    return listProjectsPg(userId)
  }
  return [...db.projects.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function getProjectBundle(projectId: string): Promise<ProjectBundle | undefined> {
  const project = await getProject(projectId)
  if (!project) return undefined

  const style = project.styleId ? await getStyle(project.styleId) : undefined
  const screenplay = project.screenplayId
    ? env.storageDriver === 'postgres'
      ? await getScreenplayPg(project.screenplayId)
      : db.screenplays.get(project.screenplayId)
    : undefined

  const episodes = await listEpisodes(project.id)

  return { project, style, screenplay, episodes }
}

export async function startPipeline(input: StartPipelineInput): Promise<PipelineJob> {
  const project = await getProject(input.projectId)
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`)
  }

  const mode = input.mode ?? project.mode
  project.mode = mode
  project.status = 'planning'
  project.updatedAt = nowIso()

  // 内容生成页选定的角色与剧情集注入项目
  if (input.characterIds && input.characterIds.length > 0) {
    project.characterIds = input.characterIds
  }
  if (input.episodeIds && input.episodeIds.length > 0) {
    project.plotEpisodeIds = input.episodeIds
  }

  await persistProject(project)

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
  db.projects.set(project.id, project)
  await persistJob(job)

  void runPipelineStub(job.id)

  return job
}

export async function getJob(jobId: string): Promise<PipelineJob | undefined> {
  const cached = db.jobs.get(jobId)
  if (cached) return cached
  if (env.storageDriver === 'postgres') {
    const job = await getPipelineJobPg(jobId)
    if (job) db.jobs.set(job.id, job)
    return job
  }
  return undefined
}

export async function listJobs(projectId?: string): Promise<PipelineJob[]> {
  if (env.storageDriver === 'postgres') {
    return listPipelineJobsPg(projectId)
  }
  const all = [...db.jobs.values()]
  return projectId ? all.filter((j) => j.projectId === projectId) : all
}

async function runPipelineStub(jobId: string): Promise<void> {
  const job = await getJob(jobId)
  if (!job) return
  const project = await getProject(job.projectId)
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
    await touch(job, project)

    try {
      await sleep(120)
      const note = await executeStage(project, stage)
      state.status = 'succeeded'
      state.progress = 100
      state.finishedAt = nowIso()
      state.message = note ?? `${stage} done`
      pushEvent(job, STAGE_AGENT_MAP[stage], 'succeeded', state.message)
      await touch(job, project)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'stage failed'
      state.status = 'failed'
      state.message = message
      job.status = 'failed'
      job.error = message
      project.status = 'failed'
      pushEvent(job, STAGE_AGENT_MAP[stage], 'failed', message)
      await touch(job, project)
      return
    }
  }

  job.status = 'succeeded'
  job.currentStage = undefined
  project.status = 'completed'
  pushEvent(job, 'director', 'succeeded', '流水线完成（骨架模拟）')
  await touch(job, project)
}

/** 返回该阶段的收尾说明（会写入 job 事件），无说明则返回 undefined */
async function executeStage(
  project: Project,
  stage: PipelineStage,
): Promise<string | undefined> {
  const userId = await ownerUserId(project.id)
  switch (stage) {
    case 'production': {
      const result = await runProductionStage(project.id, {
        source: 'novel',
        text: project.idea,
      })
      project.status = 'planning'
      const how = result.usedLlm ? `LLM（${result.model}）` : '规则化回退'
      return `立项萃取完成（${how}）：${result.production.hook}`
    }
    case 'art_direction': {
      const style = await upsertStyle(
        {
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
        },
        userId,
      )
      project.styleId = style.id
      project.status = 'planning'
      break
    }
    case 'screenplay': {
      const screenplay = await buildScreenplayFromIdea(
        project.id,
        {
          idea: project.idea,
          rawScript: project.idea,
          aspectRatio: project.aspectRatio,
          language: project.language,
          mode: project.mode,
        },
        userId,
      )
      project.screenplayId = screenplay.id
      break
    }
    case 'episode_breakdown': {
      // 此时角色/场景未定型，先按文本拆集；storyboard 阶段再注入视觉锚点
      const result = await breakdownEpisodes(
        { projectId: project.id, screenplayId: project.screenplayId },
        userId,
      )
      if (result.episodes.length === 0) {
        throw new Error('分集拆解失败：没有生成任何分集')
      }
      project.status = 'planning'
      const how = result.usedLlm ? `LLM（${result.model}）` : '规则化回退'
      return `分集完成（${how}）：共 ${result.episodes.length} 集，每集 ${
        result.episodes[0].shots.length
      } 镜`
    }
    case 'character_design': {
      if (project.characterIds.length === 0) {
        const character = await createCharacter(
          {
            name: '主角',
            description: `故事「${project.idea}」的核心角色`,
            projectId: project.id,
            libraryScoped: true,
            styleId: project.styleId,
          },
          userId,
        )
        project.characterIds = [character.id]
      }
      project.status = 'asset_ready'
      break
    }
    case 'scene_design': {
      const scene = await createScene(
        {
          name: '主场景',
          description: `适配「${project.idea}」的主环境`,
          projectId: project.id,
          libraryScoped: true,
          environment: { mood: 'soft', lighting: 'natural', keyProps: [] },
        },
        userId,
      )
      project.sceneIds = [scene.id]
      break
    }
    case 'storyboard': {
      // 角色/场景已就绪 → 把视觉锚点注入每一镜的提示词
      const ctx = await collectPromptContext(project, userId)
      const shotCount = await refreshEpisodePrompts(project.id, ctx, userId)
      project.status = 'storyboard_ready'
      return shotCount > 0
        ? `分镜提示词已注入视觉锚点（${shotCount} 镜）`
        : '分镜阶段：暂无分集镜头，请先跑分集拆解'
    }
    case 'animate': {
      project.status = 'rendering'
      break
    }
    case 'qa_review': {
      const report = await runQualityGate(project.id, userId)
      if (!report.passed) {
        return `质量检查：${report.issues.slice(0, 3).join('；')}`
      }
      return `质量检查通过：${report.episodeCount} 集 / ${report.shotCount} 镜，首尾帧已链 ${report.framedShots} 镜`
    }
    case 'edit': {
      const timeline = await ensureTimeline(project, userId)
      project.timelineId = timeline.id
      project.status = 'editing'
      break
    }
    case 'audio': {
      project.status = 'editing'
      break
    }
    case 'export': {
      project.outputUrl = await generateExportVideo(project)
      project.status = 'completed'
      break
    }
  }

  project.updatedAt = nowIso()
}

async function ensureTimeline(project: Project, userId: string): Promise<Timeline> {
  const stamp = nowIso()
  // 时间线以分镜（episodes）的真实镜头为准；兜底用 screenplay 骨架镜头
  const episodes = await listEpisodes(project.id)
  // 仅保留内容生成页选定的剧情集（未选则全部）
  const scopedEpisodes =
    project.plotEpisodeIds && project.plotEpisodeIds.length > 0
      ? episodes.filter((e) => project.plotEpisodeIds!.includes(e.id))
      : episodes
  const allShots = scopedEpisodes.flatMap((e) => e.shots)
  const sourceShots =
    allShots.length > 0
      ? allShots
      : project.screenplayId
        ? ((await getScreenplay(project.screenplayId))?.shots ?? [])
        : []
  const clips = sourceShots.map((shot, index) => {
    const startSec = index * shot.durationSec
    return {
      id: id('clip'),
      shotId: shot.id,
      startSec,
      endSec: startSec + shot.durationSec,
      transition: 'cut' as const,
    }
  })
  const durationSec = clips.length > 0 ? clips[clips.length - 1].endSec : 0

  const timeline: Timeline = {
    id: project.timelineId ?? id('tl'),
    projectId: project.id,
    clips,
    audio: [],
    durationSec,
    updatedAt: stamp,
  }

  if (env.storageDriver === 'postgres') {
    return saveTimelinePg(timeline, userId)
  }
  db.timelines.set(timeline.id, timeline)
  return timeline
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

async function touch(job: PipelineJob, project: Project): Promise<void> {
  const stamp = nowIso()
  job.updatedAt = stamp
  project.updatedAt = stamp
  db.jobs.set(job.id, job)
  db.projects.set(project.id, project)
  await persistJob(job)
  await persistProject(project)
}

async function persistProject(project: Project): Promise<void> {
  if (env.storageDriver === 'postgres') {
    const saved = await saveProjectPg(project)
    db.projects.set(saved.id, saved)
  } else {
    db.projects.set(project.id, project)
  }
}

async function persistJob(job: PipelineJob): Promise<void> {
  if (env.storageDriver === 'postgres') {
    const userId = await ownerUserId(job.projectId)
    await savePipelineJobPg(job, userId)
  } else {
    db.jobs.set(job.id, job)
  }
}

function deriveTitle(idea: string): string {
  const trimmed = idea.trim()
  return trimmed.length <= 24 ? trimmed || '未命名项目' : `${trimmed.slice(0, 24)}…`
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
