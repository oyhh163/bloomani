import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { StudioLayout } from '../components/layout/StudioLayout'
import {
  PIPELINE_STAGE_ORDER,
  STAGE_AGENT_MAP,
  STAGE_LABELS,
  type CharacterAsset,
  type Episode,
  type PipelineJob,
  type Project,
} from '@bloomani/shared'
import { listProjects, readLastProjectName } from '../api/projects'
import { listEpisodes } from '../api/episodes'
import { listCharacterAssets } from '../api/assets'
import { getPipelineJob, startPipeline } from '../api/pipeline'

export function GeneratePage() {
  const reduceMotion = useReducedMotion()

  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState('')
  const [project, setProject] = useState<Project | null>(null)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [characters, setCharacters] = useState<CharacterAsset[]>([])
  const [selectedChars, setSelectedChars] = useState<string[]>([])
  const [selectedEps, setSelectedEps] = useState<string[]>([])
  const [job, setJob] = useState<PipelineJob | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const loadProjects = useCallback(async () => {
    const list = await listProjects().catch(() => [])
    setProjects(list)
    const last = readLastProjectName()
    const match = list.find((p) => p.title === last) ?? list[0]
    if (match) selectProject(match.id)
  }, [])

  const selectProject = useCallback(async (pid: string) => {
    setProjectId(pid)
    setError('')
    setJob(null)
    try {
      const [proj, eps, chars] = await Promise.all([
        listProjects().then((l) => l.find((p) => p.id === pid) ?? null),
        listEpisodes(pid),
        listCharacterAssets().catch(() => [] as CharacterAsset[]),
      ])
      setProject(proj)
      setEpisodes(eps)
      setCharacters(chars)
      // 默认全选，方便一键生成；用户可手动缩减
      setSelectedEps(eps.map((e) => e.id))
      setSelectedChars(chars.map((c) => c.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载项目失败')
    }
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const toggleChar = (id: string) =>
    setSelectedChars((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  const toggleEp = (id: string) =>
    setSelectedEps((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const totalShots = episodes
    .filter((e) => selectedEps.includes(e.id))
    .reduce((sum, e) => sum + e.shots.length, 0)

  const handleGenerate = useCallback(async () => {
    if (!projectId) return
    setError('')
    setBusy(true)
    try {
      const started = await startPipeline({
        projectId,
        mode: 'hosted',
        fromStage: 'character_design',
        characterIds: selectedChars,
        episodeIds: selectedEps,
      })
      setJob(started)
    } catch (e) {
      setError(e instanceof Error ? e.message : '启动生成失败')
    } finally {
      setBusy(false)
    }
  }, [projectId, selectedChars, selectedEps])

  return (
    <StudioLayout
      eyebrow="03 · 内容生成"
      title="选角 + 选剧情，一键生成视频"
      lead="剧情设计完成后，在这里挑选要出场的角色与要生成的剧情集，直接启动 AniME 流水线成片。"
    >
      <motion.div
        className="cockpit"
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        {error ? <p className="cockpit-error">{error}</p> : null}

        <section className="studio-panel cockpit-lock">
          <header className="card-head">
            <div>
              <span className="card-step">项目</span>
              <h2>选择已设计的项目</h2>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={loadProjects}>
              刷新
            </button>
          </header>
          {projects.length === 0 ? (
            <p className="panel-desc">
              还没有项目。请先到 <Link to="/story" className="inline-link">剧情设计</Link> 导入小说并生成剧本。
            </p>
          ) : (
            <select
              className="select"
              value={projectId}
              onChange={(e) => selectProject(e.target.value)}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          )}
          {project ? (
            <p className="panel-desc" style={{ marginTop: '0.75rem' }}>
              {project.idea.slice(0, 80)}
              {project.idea.length > 80 ? '…' : ''}
            </p>
          ) : null}
        </section>

        <section className="studio-panel cockpit-card">
          <header className="card-head">
            <div>
              <span className="card-step">选角</span>
              <h2>出场角色</h2>
            </div>
            <span className="tag">{selectedChars.length} 已选</span>
          </header>
          {characters.length === 0 ? (
            <p className="panel-desc">
              暂无角色资产。可先到 <Link to="/character" className="inline-link">角色设计</Link> 创建。
            </p>
          ) : (
            <div className="chip-grid">
              {characters.map((c) => {
                const on = selectedChars.includes(c.id)
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`chip ${on ? 'on' : ''}`}
                    onClick={() => toggleChar(c.id)}
                  >
                    {c.name}
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <section className="studio-panel cockpit-card">
          <header className="card-head">
            <div>
              <span className="card-step">剧情</span>
              <h2>要生成的集数</h2>
            </div>
            <span className="tag">{selectedEps.length} 集 · {totalShots} 镜</span>
          </header>
          {episodes.length === 0 ? (
            <p className="panel-desc">该项目还没有分集，请先到剧情设计完成分集拆解。</p>
          ) : (
            <div className="chip-grid">
              {episodes.map((ep) => {
                const on = selectedEps.includes(ep.id)
                return (
                  <button
                    key={ep.id}
                    type="button"
                    className={`chip ${on ? 'on' : ''}`}
                    onClick={() => toggleEp(ep.id)}
                  >
                    EP{ep.index} · {ep.title}
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <section className="studio-panel cockpit-card">
          <header className="card-head">
            <div>
              <span className="card-step">生成</span>
              <h2>启动成片</h2>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleGenerate}
              disabled={busy || !projectId || selectedEps.length === 0}
            >
              {busy ? '启动中…' : job ? '重新生成' : '生成视频'}
            </button>
          </header>
          {!job ? (
            <p className="panel-desc">
              选定角色与剧情后点击生成，流水线会从分镜阶段开始，注入视觉锚点并输出成片。
            </p>
          ) : (
            <PipelineCard
              job={job}
              projectId={projectId}
              onDone={() => selectProject(projectId)}
              outputUrl={project?.outputUrl}
            />
          )}

          {!job && project?.outputUrl && !project.outputUrl.includes('example.local') ? (
            <div className="render-preview">
              <p className="tag tag-ok">上次成片</p>
              <video className="render-video" src={project.outputUrl} controls preload="metadata" />
            </div>
          ) : null}
        </section>
      </motion.div>
    </StudioLayout>
  )
}

function PipelineCard({
  job,
  projectId,
  onDone,
  outputUrl,
}: {
  job: PipelineJob
  projectId: string
  onDone: (projectId: string) => void
  outputUrl?: string | null
}) {
  const [liveJob, setLiveJob] = useState<PipelineJob>(job)
  const [events, setEvents] = useState<PipelineJob['events']>(job.events)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setLiveJob(job)
    setEvents(job.events)

    const poll = async () => {
      const latest = await getPipelineJob(job.id).catch(() => null)
      if (!latest) return
      setLiveJob(latest)
      setEvents(latest.events)
      if (latest.status === 'succeeded' || latest.status === 'failed') {
        if (timer.current) clearInterval(timer.current)
        if (latest.status === 'succeeded') onDone(projectId)
      }
    }

    timer.current = setInterval(poll, 1500)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [job, projectId, onDone])

  const stageStatus = (stage: string) =>
    liveJob.stages.find((s) => s.stage === stage)?.status ?? 'queued'

  return (
    <>
      <div className="stage-track">
        {PIPELINE_STAGE_ORDER.map((stage) => {
          const status = stageStatus(stage)
          return (
            <div
              key={stage}
              className={`stage-pill ${status}`}
              title={`${STAGE_AGENT_MAP[stage]} · ${status}`}
            >
              <span className="stage-label">{STAGE_LABELS[stage]}</span>
              <span className="stage-agent">{STAGE_AGENT_MAP[stage]}</span>
            </div>
          )
        })}
      </div>

      {events.length > 0 ? (
        <div className="event-log">
          {[...events].reverse().map((evt) => (
            <div key={evt.id} className={`event-line ${evt.status}`}>
              <span className="event-role">{evt.role}</span>
              <span className="event-msg">{evt.message}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="panel-desc">启动后这里会实时滚动导演与各智能体的进度。</p>
      )}

      {liveJob.status === 'succeeded' && liveJob.projectId ? (
        <p className="tag tag-ok" style={{ marginTop: '0.75rem' }}>
          {outputUrl && !outputUrl.includes('example.local')
            ? '成片已生成，下面是成片预览。'
            : '成片已生成（当前为占位地址，请在后端接入真实生成）'}
        </p>
      ) : null}

      {outputUrl && !outputUrl.includes('example.local') ? (
        <div className="render-preview">
          <video className="render-video" src={outputUrl} controls preload="metadata" />
        </div>
      ) : null}
    </>
  )
}
