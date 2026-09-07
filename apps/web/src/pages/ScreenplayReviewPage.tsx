import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Episode } from '@bloomani/shared'
import { breakdownEpisodes, getEpisode, listEpisodes, refreshEpisodePrompts } from '../api/episodes'
import { StudioLayout } from '../components/layout/StudioLayout'
import { StoryboardTable } from '../components/studio/StoryboardTable'

const TIME_LABELS: Record<string, string> = {
  day: '日间',
  night: '夜间',
  dawn: '黎明',
  dusk: '黄昏',
}

/** 单集「剧本内容」渲染：场景 → 动作 → 对白 → 资产 */
function ScriptContent({ episode }: { episode: Episode }) {
  const script = episode.scriptBody
  if (!script) {
    return (
      <p className="muted">
        该集尚未生成剧本内容（来自旧版本拆解）。请回到「剧情设计」重新拆解分集，以生成每集独立的剧本与分镜。
      </p>
    )
  }

  return (
    <div className="script-block">
      <p className="script-summary">{script.summary}</p>

      {script.scenes.map((scene) => (
        <div className="scene-card" key={scene.id}>
          <div className="scene-head">
            <span className="scene-meta">
              {scene.location} · {TIME_LABELS[scene.timeOfDay] ?? scene.timeOfDay}
            </span>
          </div>
          <p className="scene-action">{scene.action}</p>
          {scene.dialogues.length > 0 && (
            <ul className="dialogue-list">
              {scene.dialogues.map((d) => (
                <li className="dialogue-line" key={d.id}>
                  <span className="dialogue-name">{d.characterName}</span>
                  <span className="dialogue-text">{d.line}</span>
                  {d.emotion && <span className="dialogue-emotion">{d.emotion}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      {(script.characterNames.length > 0 || script.props.length > 0) && (
        <div className="script-assets">
          {script.characterNames.length > 0 && (
            <div className="asset-row">
              <span className="asset-label">出场角色</span>
              <span className="asset-chips">
                {script.characterNames.map((n) => (
                  <span className="chip" key={n}>
                    {n}
                  </span>
                ))}
              </span>
            </div>
          )}
          {script.props.length > 0 && (
            <div className="asset-row">
              <span className="asset-label">关键资产</span>
              <span className="asset-chips">
                {script.props.map((p) => (
                  <span className="chip chip-prop" key={p}>
                    {p}
                  </span>
                ))}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function ScreenplayReviewPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [episode, setEpisode] = useState<Episode | null>(null)
  const [loading, setLoading] = useState(true)
  const [rebuilding, setRebuilding] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!projectId) return
    setLoading(true)
    setError('')
    listEpisodes(projectId)
      .then((eps) => {
        setEpisodes(eps)
        const first = eps[0]?.id ?? null
        setActiveId(first)
        return first ? getEpisode(first) : null
      })
      .then((ep) => setEpisode(ep))
      .catch((e) => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false))
  }, [projectId])

  function selectEpisode(id: string) {
    setActiveId(id)
    setLoading(true)
    setError('')
    getEpisode(id)
      .then(setEpisode)
      .catch((e) => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false))
  }

  /** 对当前项目重新拆解分集（保留项目/剧本，重做分集与分镜） */
  async function rebreak() {
    if (!episode) return
    setRebuilding(true)
    setError('')
    try {
      await breakdownEpisodes({ projectId: episode.projectId, screenplayId: episode.screenplayId })
      await refreshEpisodePrompts(episode.projectId)
      const eps = await listEpisodes(episode.projectId)
      setEpisodes(eps)
      const first = eps[0]?.id ?? null
      setActiveId(first)
      setEpisode(first ? await getEpisode(first) : null)
    } catch (e) {
      setError(e instanceof Error ? e.message : '重新拆解失败')
    } finally {
      setRebuilding(false)
    }
  }

  return (
    <StudioLayout
      variant="default"
      eyebrow="02 · 剧情设计"
      title="剧本审查 · 画布"
      lead="先审查每集「剧本内容」，再据此核对分镜与卡点。确认后进入内容生成。"
    >
      <div className="review-layout">
        <aside className="review-episodes">
          <p className="review-episodes-label">分集</p>
          {episodes.length === 0 ? (
            <p className="muted">暂无分集。请回到剧情设计重新拆解，或确认后端已生成分镜。</p>
          ) : (
            <ul>
              {episodes.map((ep) => (
                <li key={ep.id}>
                  <button
                    type="button"
                    className={`episode-item ${ep.id === activeId ? 'is-active' : ''}`}
                    onClick={() => selectEpisode(ep.id)}
                  >
                    <span className="episode-item-title">
                      第 {ep.index} 集 · {ep.title}
                    </span>
                    {ep.synopsis && <span className="episode-item-synopsis">{ep.synopsis}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="review-canvas">
          {loading ? (
            <p className="muted">加载中…</p>
          ) : error ? (
            <p className="status-line" role="status">
              {error}
            </p>
          ) : episode ? (
            <>
              <div className="review-episode-head">
                <div className="review-episode-head-top">
                  <h2>
                    第 {episode.index} 集 · {episode.title}
                  </h2>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={rebuilding}
                    onClick={() => void rebreak()}
                  >
                    {rebuilding ? '重新拆解中…' : '重新拆解分集'}
                  </button>
                </div>
                {episode.synopsis && <p className="review-episode-synopsis">{episode.synopsis}</p>}
              </div>

              <div className="review-section">
                <h3 className="review-section-title">剧本内容</h3>
                <ScriptContent episode={episode} />
              </div>

              <div className="review-section">
                <details className="storyboard-details" open>
                  <summary className="review-section-title">分镜表（{episode.shots.length} 镜）</summary>
                  <StoryboardTable episode={episode} />
                </details>
              </div>
            </>
          ) : (
            <p className="muted">选择左侧分集查看剧本与分镜。</p>
          )}
        </section>
      </div>

      <p className="portal-next-hint">
        审查完成后，前往 <Link to="/generate">内容生成</Link>
      </p>
    </StudioLayout>
  )
}
