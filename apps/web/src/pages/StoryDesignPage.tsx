import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { StoryDraft } from '@bloomani/shared'
import { listProjects, readLastProjectName, resolveOrCreateProject } from '../api/projects'
import { createScreenplayFromScript } from '../api/screenplays'
import { createStoryDraft, listStoryDrafts } from '../api/storyDrafts'
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

  async function handleSaveScript() {
    if (!body.trim()) {
      setStatus('剧本内容不能为空。')
      return
    }
    if (!user) {
      navigate('/login?next=/story')
      return
    }
    if (!projectName.trim()) {
      setStatus('请填写项目名称后再保存。')
      return
    }

    setSaving(true)
    setStatus('正在保存到项目…')
    try {
      const scriptTitle = title.trim() || '未命名剧本'
      const { project, created } = await resolveOrCreateProject(
        projectName,
        body.trim().slice(0, 200),
      )
      const draft = await createStoryDraft({
        title: scriptTitle,
        body,
        source: 'write',
      })
      await createScreenplayFromScript(project.id, {
        script: body,
        language: 'zh-CN',
      })
      setDrafts((prev) => [draft, ...prev.filter((d) => d.id !== draft.id)].slice(0, 12))
      setProjectSuggestions((prev) =>
        prev.includes(project.title) ? prev : [project.title, ...prev],
      )
      setStatus(
        created
          ? `已新建项目「${project.title}」并保存剧本「${draft.title}」`
          : `已保存剧本「${draft.title}」到项目「${project.title}」`,
      )
    } catch (err) {
      setStatus(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
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
    setActiveMode('write')
    setStatus('已生成可编辑剧本草稿。')
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
    setActiveMode('write')
    setStatus(`已选用「${selectedPublic.title}」。`)
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
      variant="portal"
      eyebrow="02 · 剧情设计"
      title="选择创作方式"
      lead="点选入口，在弹窗中完成剧本与故事"
    >
      <EntryPortal
        entries={storyEntries}
        onSelect={(id) => setActiveMode(id as StoryMode)}
      />

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
              <button type="button" className="btn btn-primary" onClick={handleImportParse}>
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
                  {saving ? '保存中…' : '保存到项目'}
                </button>
                <Link className="btn btn-ghost" to="/generate" onClick={closeModal}>
                  去内容生成
                </Link>
              </>
            )}
            {activeMode === 'public' && (
              <button type="button" className="btn btn-primary" onClick={handleUsePublicStory}>
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
