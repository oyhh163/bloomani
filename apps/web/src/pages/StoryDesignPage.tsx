import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { StudioLayout } from '../components/layout/StudioLayout'
import {
  SCRIPT_STORAGE_KEY,
  mockPublicStories,
  storyModes,
  type StoryMode,
} from '../data/storyStudio'

type DraftScript = {
  id: string
  title: string
  body: string
  updatedAt: string
}

function loadDrafts(): DraftScript[] {
  try {
    const raw = localStorage.getItem(SCRIPT_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as DraftScript[]) : []
  } catch {
    return []
  }
}

function saveDrafts(drafts: DraftScript[]) {
  localStorage.setItem(SCRIPT_STORAGE_KEY, JSON.stringify(drafts))
}

export function StoryDesignPage() {
  const reduceMotion = useReducedMotion()
  const [mode, setMode] = useState<StoryMode>('write')
  const [title, setTitle] = useState('未命名剧本')
  const [body, setBody] = useState(
    '场景 1\n便利店门口，夜色。一只微微发光的小猫蹲在台阶上。\n\n少年：你也是第一次来这座城吗？',
  )
  const [novelText, setNovelText] = useState('')
  const [drafts, setDrafts] = useState<DraftScript[]>([])
  const [selectedStory, setSelectedStory] = useState<string | null>(null)
  const [status, setStatus] = useState('选择一种方式，把故事变成可拍剧本。')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDrafts(loadDrafts())
  }, [])

  const selectedPublic = useMemo(
    () => mockPublicStories.find((s) => s.id === selectedStory) ?? null,
    [selectedStory],
  )

  function handleSaveScript() {
    if (!body.trim()) {
      setStatus('剧本内容不能为空。')
      return
    }
    const next: DraftScript = {
      id: `draft_${Date.now()}`,
      title: title.trim() || '未命名剧本',
      body,
      updatedAt: new Date().toISOString(),
    }
    const merged = [next, ...drafts].slice(0, 12)
    setDrafts(merged)
    saveDrafts(merged)
    setStatus(`已保存「${next.title}」。`)
  }

  async function onNovelFile(file?: File | null) {
    if (!file) return
    const text = await file.text()
    setNovelText(text)
    setStatus(`已导入「${file.name}」，可继续编辑后拆解剧本。`)
  }

  function handleImportParse() {
    if (!novelText.trim()) {
      setStatus('请先粘贴或上传小说文本。')
      return
    }
    setTitle(novelText.trim().slice(0, 18) || '导入剧本')
    setBody(
      `【由小说导入的草稿】\n\n${novelText.trim().slice(0, 1200)}${novelText.length > 1200 ? '\n\n…（已截断预览，接入后端后完整拆解）' : ''}`,
    )
    setMode('write')
    setStatus('已生成可编辑剧本草稿，可继续修改并保存。')
  }

  function handleUsePublicStory() {
    if (!selectedPublic) {
      setStatus('请先选择一个公开故事。')
      return
    }
    setTitle(selectedPublic.title)
    setBody(
      `标题：${selectedPublic.title}\n作者：${selectedPublic.author}\n摘要：${selectedPublic.summary}\n\n（公开故事选用后，将进入视频生成管线。当前为前端预览。）`,
    )
    setMode('write')
    setStatus(`已选用「${selectedPublic.title}」，可微调后进入内容生成。`)
  }

  return (
    <StudioLayout
      eyebrow="02 · 剧情设计"
      title="把灵感铺成可拍的故事"
      lead="导入小说、自写剧本，或选用社区公开故事——三种入口都能进入后续成片。"
    >
      <div className="mode-rail" role="tablist" aria-label="剧情创作方式">
        {storyModes.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={mode === item.id}
            className={`mode-chip ${mode === item.id ? 'is-active' : ''}`}
            onClick={() => setMode(item.id)}
          >
            <span className="mode-chip-label">{item.label}</span>
            <span className="mode-chip-hint">{item.hint}</span>
          </button>
        ))}
      </div>

      <div className="studio-grid studio-grid-story">
        <motion.section
          className="studio-panel"
          key={mode}
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          {mode === 'import' && (
            <>
              <h2>导入小说</h2>
              <p className="panel-desc">粘贴正文或上传 .txt，系统会整理成可编辑剧本草稿。</p>
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
                  rows={12}
                  value={novelText}
                  onChange={(e) => setNovelText(e.target.value)}
                  placeholder="把小说或故事大纲粘贴到这里…"
                />
              </label>
              <div className="panel-actions">
                <button type="button" className="btn btn-primary" onClick={handleImportParse}>
                  拆解为剧本草稿
                </button>
              </div>
            </>
          )}

          {mode === 'write' && (
            <>
              <h2>自己编写剧本</h2>
              <p className="panel-desc">按场次与对白书写，本地保存草稿，之后可交给生成管线。</p>
              <label className="field">
                <span>剧本标题</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} />
              </label>
              <label className="field">
                <span>剧本正文</span>
                <textarea rows={14} value={body} onChange={(e) => setBody(e.target.value)} />
              </label>
              <div className="panel-actions">
                <button type="button" className="btn btn-primary" onClick={handleSaveScript}>
                  保存剧本
                </button>
                <Link className="btn btn-ghost" to="/generate">
                  去内容生成
                </Link>
              </div>
            </>
          )}

          {mode === 'public' && (
            <>
              <h2>公开故事</h2>
              <p className="panel-desc">选用其他创作者公开的故事，快速进入视频生成。</p>
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
              <div className="panel-actions">
                <button type="button" className="btn btn-primary" onClick={handleUsePublicStory}>
                  选用此故事
                </button>
                <Link className="btn btn-ghost" to="/generate">
                  直接去生成
                </Link>
              </div>
            </>
          )}

          <p className="status-line" role="status">
            {status}
          </p>
        </motion.section>

        <aside className="studio-side">
          {mode === 'write' || mode === 'import' ? (
            <section className="studio-panel soft">
              <h2>我的草稿</h2>
              <p className="panel-desc">保存在本机浏览器，后续可同步到账号资产库。</p>
              {drafts.length === 0 ? (
                <p className="empty-hint">还没有草稿，写完点「保存剧本」。</p>
              ) : (
                <ul className="draft-list">
                  {drafts.map((draft) => (
                    <li key={draft.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setTitle(draft.title)
                          setBody(draft.body)
                          setMode('write')
                          setStatus(`已载入草稿「${draft.title}」。`)
                        }}
                      >
                        <strong>{draft.title}</strong>
                        <span>{new Date(draft.updatedAt).toLocaleString()}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : (
            <section className="studio-panel soft">
              <h2>选用预览</h2>
              {selectedPublic ? (
                <>
                  <h3 className="side-title">{selectedPublic.title}</h3>
                  <p className="panel-desc">{selectedPublic.summary}</p>
                  <p className="part-summary">
                    {selectedPublic.author} · {selectedPublic.durationLabel}
                  </p>
                </>
              ) : (
                <p className="empty-hint">点选左侧故事，查看摘要。</p>
              )}
            </section>
          )}
        </aside>
      </div>
    </StudioLayout>
  )
}
