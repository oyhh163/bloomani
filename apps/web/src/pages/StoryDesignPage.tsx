import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { StoryDraft } from '@bloomani/shared'
import { listProjects, readLastProjectName, resolveOrCreateProject } from '../api/projects'
import { createScreenplayFromScript } from '../api/screenplays'
import { breakdownEpisodes, refreshEpisodePrompts } from '../api/episodes'
import { listStoryDrafts } from '../api/storyDrafts'
import { useAuth } from '../auth/AuthContext'
import { StudioLayout } from '../components/layout/StudioLayout'
import { ImportGuide, PublicGuide, WriteGuide } from '../components/studio/AnimeGuides'
import { EntryPortal, type PortalEntry } from '../components/studio/EntryPortal'
import { ProjectNameField } from '../components/studio/ProjectNameField'
import { StudioModal } from '../components/studio/StudioModal'
import {
  mockPublicStories,
  storyModes,
  type StoryMode,
} from '../data/storyStudio'

const storyEntries: PortalEntry[] = [
  {
    id: 'import',
    label: storyModes[0].label,
    hint: storyModes[0].hint,
    tone: 'rose',
    guide: <ImportGuide />,
  },
  {
    id: 'write',
    label: storyModes[1].label,
    hint: storyModes[1].hint,
    tone: 'mint',
    guide: <WriteGuide />,
  },
  {
    id: 'public',
    label: storyModes[2].label,
    hint: storyModes[2].hint,
    tone: 'violet',
    guide: <PublicGuide />,
  },
]

const modeMeta: Record<StoryMode, { title: string; subtitle: string }> = {
  import: { title: '导入小说', subtitle: '粘贴或上传文本，拆解为可编辑剧本' },
  write: { title: '自写剧本', subtitle: '填写项目名称后保存到对应项目' },
  public: { title: '选用公开故事', subtitle: '从社区公开故事中挑选并生成视频' },
}

export function StoryDesignPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [activeMode, setActiveMode] = useState<StoryMode | null>(null)
  const [projectName, setProjectName] = useState(readLastProjectName)
  const [projectSuggestions, setProjectSuggestions] = useState<string[]>([])
  const [title, setTitle] = useState('未命名剧本')
  const [body, setBody] = useState(
    '场景 1\n便利店门口，夜色。一只微微发光的小猫蹲在台阶上。\n\n少年：你也是第一次来这座城吗？',
  )
  const [novelText, setNovelText] = useState('')
  const [drafts, setDrafts] = useState<StoryDraft[]>([])
  const [selectedStory, setSelectedStory] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [rebuilding, setRebuilding] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) {
      setDrafts([])
      return
    }
    void Promise.all([listStoryDrafts(), listProjects()])
      .then(([nextDrafts, projects]) => {
        setDrafts(nextDrafts)
        setProjectSuggestions(projects.map((p) => p.title))
      })
      .catch(() => {
        setStatus('无法加载服务端数据，请确认已登录且 API 已启动。')
      })
  }, [user])

  const selectedPublic = useMemo(
    () => mockPublicStories.find((s) => s.id === selectedStory) ?? null,
    [selectedStory],
  )

  function closeModal() {
    setActiveMode(null)
    setStatus('')
  }

  /**
   * 对已有项目重新拆解分集：保留项目与剧本，仅重做「分集拆解」阶段，
   * 按最新逻辑重新生成每集剧本内容与分镜（后端会先清掉旧分集再写入）。
   */
  async function handleRebreak() {
    const name = projectName.trim()
    if (!name) {
      setStatus('请输入项目名称。')
      return
    }
    if (!projectSuggestions.includes(name)) {
      setStatus('未找到同名项目，请确认名称，或先在上方创建该项目。')
      return
    }
    if (!user) {
      navigate('/login?next=/story')
      return
    }
    setRebuilding(true)
    setStatus(`正在重新拆解「${name}」的分集（生成每集剧本与分镜）…`)
    try {
      const { project } = await resolveOrCreateProject(name, '')
      await breakdownEpisodes({ projectId: project.id, screenplayId: project.screenplayId })
      await refreshEpisodePrompts(project.id)
      navigate(`/story/review/${project.id}`)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : '重新拆解失败，请稍后重试')
      setRebuilding(false)
    }
  }

  /**
   * 统一入口：建/取项目 → 由脚本生成剧本 → 分集拆解 → 进入剧本审查（画布）页。
   * 拆解失败不阻断跳转，审查页可空态重试。
   */
  async function runAnalysisAndGo(projectNameVal: string, scriptText: string) {
    if (!user) {
      navigate('/login?next=/story')
      return
    }
    const name = projectNameVal.trim() || '未命名项目'
    if (!scriptText.trim()) {
      setStatus('请输入剧本或故事内容。')
      return
    }
    setSaving(true)
    setStatus('正在拆解剧本并生成分镜…')
    try {
      const { project } = await resolveOrCreateProject(name, scriptText.trim().slice(0, 200))
      const screenplay = await createScreenplayFromScript(project.id, {
        script: scriptText,
        language: 'zh-CN',
      })
      try {
        await breakdownEpisodes({ projectId: project.id, screenplayId: screenplay.id })
      } catch {
        /* 拆解失败不阻断审查页加载 */
      }
      navigate(`/story/review/${project.id}`)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : '分析失败，请稍后重试')
      setSaving(false)
    }
  }

  async function handleSaveScript() {
    if (!body.trim()) {
      setStatus('剧本内容不能为空。')
      return
    }
    await runAnalysisAndGo(projectName, body)
  }

  async function onNovelFile(file?: File | null) {
    if (!file) return
    const text = await file.text()
    setNovelText(text)
    setStatus(`已导入「${file.name}」。`)
  }

  function handleImportParse() {
    if (!novelText.trim()) {
      setStatus('请先粘贴或上传小说文本。')
      return
    }
    setTitle(novelText.trim().slice(0, 18) || '导入剧本')
    if (!projectName.trim()) {
      setProjectName(novelText.trim().slice(0, 18) || '导入项目')
    }
    setBody(
      `【由小说导入的草稿】\n\n${novelText.trim().slice(0, 1200)}${novelText.length > 1200 ? '\n\n…（已截断预览，接入后端后完整拆解）' : ''}`,
    )
    setStatus('已生成可编辑剧本草稿，点击「拆解为剧本草稿」进入审查。')
  }

  function handleUsePublicStory() {
    if (!selectedPublic) {
      setStatus('请先选择一个公开故事。')
      return
    }
    setTitle(selectedPublic.title)
    if (!projectName.trim()) {
      setProjectName(selectedPublic.title)
    }
    setBody(
      `标题：${selectedPublic.title}\n作者：${selectedPublic.author}\n摘要：${selectedPublic.summary}\n\n（公开故事选用后，将进入视频生成管线。当前为前端预览。）`,
    )
    setStatus(`已选用「${selectedPublic.title}」，点击「选用此故事」进入审查。`)
  }

  function loadDraft(draft: StoryDraft) {
    setTitle(draft.title)
    setBody(draft.body)
    setActiveMode('write')
    setStatus(`已载入草稿「${draft.title}」。`)
  }

  const meta = activeMode ? modeMeta[activeMode] : null

  return (
    <StudioLayout
      variant="default"
      eyebrow="02 · 剧情设计"
      title="从小说拆解到短剧剧本"
      lead="从小说、创意或公开故事出发，拆解为可审查、可生成的短剧剧本。"
    >
      <EntryPortal
        entries={storyEntries}
        onSelect={(id) => setActiveMode(id as StoryMode)}
      />

      <section className="rebreak-card">
        <div className="rebreak-head">
          <h3>重新拆解分集</h3>
          <p className="muted">
            对已有项目重做「分集拆解」：保留项目与剧本，按最新逻辑重新生成每集剧本内容与分镜。
          </p>
        </div>
        <div className="rebreak-row">
          <input
            className="rebreak-input"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="输入已有项目名称"
            disabled={rebuilding}
          />
          <button
            type="button"
            className="btn btn-primary"
            disabled={rebuilding}
            onClick={() => void handleRebreak()}
          >
            {rebuilding ? '拆解中…' : '重新拆解'}
          </button>
        </div>
        {status ? (
          <p className="status-line" role="status">
            {status}
          </p>
        ) : null}
      </section>

      <StudioModal
        open={activeMode !== null}
        title={meta?.title ?? ''}
        subtitle={meta?.subtitle}
        onClose={closeModal}
      >
        {activeMode === 'import' && (
          <div className="modal-form">
            <button type="button" className="upload-zone compact" onClick={() => fileRef.current?.click()}>
              <span>
                上传小说文本
                <small>支持 .txt / .md</small>
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,text/plain"
              hidden
              onChange={(e) => void onNovelFile(e.target.files?.[0])}
            />
            <label className="field">
              <span>小说正文</span>
              <textarea
                rows={10}
                value={novelText}
                onChange={(e) => setNovelText(e.target.value)}
                placeholder="把小说或故事大纲粘贴到这里…"
              />
            </label>
          </div>
        )}

        {activeMode === 'write' && (
          <div className="modal-form">
            <ProjectNameField
              value={projectName}
              onChange={setProjectName}
              suggestions={projectSuggestions}
              disabled={saving}
            />
            <label className="field">
              <span>剧本标题</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="field">
              <span>剧本正文</span>
              <textarea rows={12} value={body} onChange={(e) => setBody(e.target.value)} />
            </label>
            {drafts.length > 0 ? (
              <div className="modal-drafts">
                <p className="modal-drafts-label">我的草稿</p>
                <ul className="draft-list">
                  {drafts.slice(0, 4).map((draft) => (
                    <li key={draft.id}>
                      <button type="button" onClick={() => loadDraft(draft)}>
                        <strong>{draft.title}</strong>
                        <span>{new Date(draft.updatedAt).toLocaleString()}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}

        {activeMode === 'public' && (
          <div className="modal-form">
            <div className="story-list">
              {mockPublicStories.map((story) => (
                <button
                  key={story.id}
                  type="button"
                  className={`story-card ${selectedStory === story.id ? 'is-selected' : ''}`}
                  onClick={() => setSelectedStory(story.id)}
                >
                  <div className="story-card-top">
                    <strong>{story.title}</strong>
                    <span>{story.durationLabel}</span>
                  </div>
                  <p>{story.summary}</p>
                  <div className="story-card-meta">
                    <span>@{story.author}</span>
                    <span>{story.tags.join(' · ')}</span>
                    <span>♥ {story.likes}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="modal-foot">
          {status ? (
            <p className="status-line" role="status">
              {status}
            </p>
          ) : (
            <span />
          )}
          <div className="panel-actions">
            <button type="button" className="btn btn-ghost" onClick={closeModal}>
              关闭
            </button>
            {activeMode === 'import' && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  void runAnalysisAndGo(
                    projectName || novelText.trim().slice(0, 18) || '导入项目',
                    novelText,
                  )
                }
              >
                拆解为剧本草稿
              </button>
            )}
            {activeMode === 'write' && (
              <>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={saving}
                  onClick={() => void handleSaveScript()}
                >
                  {saving ? '分析中…' : '分析并进入审查'}
                </button>
                <Link className="btn btn-ghost" to="/generate" onClick={closeModal}>
                  去内容生成
                </Link>
              </>
            )}
            {activeMode === 'public' && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={!selectedPublic || saving}
                onClick={() =>
                  selectedPublic &&
                  void runAnalysisAndGo(
                    projectName || selectedPublic.title,
                    `标题：${selectedPublic.title}\n作者：${selectedPublic.author}\n摘要：${selectedPublic.summary}`,
                  )
                }
              >
                选用此故事
              </button>
            )}
          </div>
        </div>
      </StudioModal>

      <p className="portal-next-hint">
        剧本就绪后，前往 <Link to="/generate">内容生成</Link>
      </p>
    </StudioLayout>
  )
}
