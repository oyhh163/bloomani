import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { deleteCharacterAsset, saveCharacterAsset } from '../api/assets'
import { ApiError } from '../api/client'
import { generateCharacterImage } from '../api/generate'
import { listProjects, readLastProjectName, resolveOrCreateProject } from '../api/projects'
import { useAuth } from '../auth/AuthContext'
import { StudioLayout } from '../components/layout/StudioLayout'
import {
  CustomGuide,
  LibraryGuide,
  TextGuide,
  UploadGuide,
} from '../components/studio/AnimeGuides'
import { EntryPortal, type PortalEntry } from '../components/studio/EntryPortal'
import { GenerationResultPanel } from '../components/studio/GenerationResultPanel'
import { StudioModal } from '../components/studio/StudioModal'
import {
  characterModes,
  mockActors,
  partLabels,
  partOptions,
  type CharacterMode,
  type PartCategory,
} from '../data/characterStudio'

const defaultParts: Record<PartCategory, string> = {
  face: 'face-oval',
  hair: 'hair-long',
  eyes: 'eyes-round',
  nose: 'nose-tiny',
  mouth: 'mouth-smile',
}

const characterEntries: PortalEntry[] = [
  {
    id: 'text',
    label: characterModes[0].label,
    hint: characterModes[0].hint,
    tone: 'rose',
    guide: <TextGuide />,
  },
  {
    id: 'upload',
    label: characterModes[1].label,
    hint: characterModes[1].hint,
    tone: 'mint',
    guide: <UploadGuide />,
  },
  {
    id: 'library',
    label: characterModes[2].label,
    hint: characterModes[2].hint,
    tone: 'blend',
    guide: <LibraryGuide />,
  },
  {
    id: 'custom',
    label: characterModes[3].label,
    hint: characterModes[3].hint,
    tone: 'violet',
    guide: <CustomGuide />,
  },
]

const modeMeta: Record<CharacterMode, { title: string; subtitle: string }> = {
  text: { title: '文本生成角色', subtitle: '用一句话描述，生成可复用的角色设定' },
  upload: { title: '上传图片生成', subtitle: '参考图锁定外貌，减少镜头间换脸' },
  library: { title: 'AI 演员库', subtitle: '选用平台演员资产，后续可调研素材来源' },
  custom: { title: '自定义形象', subtitle: '从素材库拼搭脸型、发型与五官' },
}

function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('读取图片失败'))
    reader.readAsDataURL(file)
  })
}

export function CharacterDesignPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [activeMode, setActiveMode] = useState<CharacterMode | null>(null)
  const [prompt, setPrompt] = useState('软萌短发少女，粉色连帽衫，眼神明亮，青春校园感')
  const [name, setName] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [resultModel, setResultModel] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [selectedActor, setSelectedActor] = useState<string | null>(null)
  const [parts, setParts] = useState(defaultParts)
  const [activePart, setActivePart] = useState<PartCategory>('face')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [projectName, setProjectName] = useState(readLastProjectName)
  const [projectSuggestions, setProjectSuggestions] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) {
      setProjectSuggestions([])
      return
    }
    void listProjects()
      .then((projects) => setProjectSuggestions(projects.map((p) => p.title)))
      .catch(() => {
        // API offline — suggestions stay empty
      })
  }, [user])

  const selectedPartLabel = useMemo(() => {
    return (Object.keys(parts) as PartCategory[])
      .map((key) => partOptions[key].find((o) => o.id === parts[key])?.label)
      .filter(Boolean)
      .join(' · ')
  }, [parts])

  const selectedActorCard = useMemo(
    () => mockActors.find((a) => a.id === selectedActor) ?? null,
    [selectedActor],
  )

  function resetResult() {
    setResultUrl(null)
    setResultModel(null)
    setSavedId(null)
  }

  function closeModal() {
    setActiveMode(null)
    setStatus('')
    setBusy(false)
  }

  function openMode(id: CharacterMode) {
    setActiveMode(id)
    resetResult()
    setStatus('')
  }

  function buildDescription(): string {
    if (activeMode === 'custom') {
      return `自定义动漫角色，${selectedPartLabel}，清爽年轻风格`
    }
    if (activeMode === 'library' && selectedActorCard) {
      return `${selectedActorCard.vibe}，标签：${selectedActorCard.tags.join('、')}`
    }
    if (activeMode === 'upload') {
      return prompt.trim() || '保持角色身份，生成清晰正面半身角色设定图'
    }
    return prompt.trim()
  }

  async function handleGenerate() {
    if (!activeMode || busy) return

    if (activeMode === 'text' && !prompt.trim()) {
      setStatus('请先填写角色描述。')
      return
    }
    if (activeMode === 'upload' && !uploadFile && !previewUrl) {
      setStatus('请先上传一张参考图。')
      return
    }
    if (activeMode === 'library' && !selectedActorCard) {
      setStatus('请先从演员库选择一位角色。')
      return
    }

    const description = buildDescription()
    setBusy(true)
    setStatus('正在调用 Agnes Image 生成…')
    resetResult()

    try {
      const referenceImages =
        activeMode === 'upload' && uploadFile
          ? [await fileToDataUri(uploadFile)]
          : undefined

      const result = await generateCharacterImage({
        name:
          name ||
          (activeMode === 'library' ? selectedActorCard?.name : undefined) ||
          (activeMode === 'custom' ? '自定义角色' : undefined),
        prompt: description,
        size: '1K',
        ratio: '3:4',
        referenceImages,
      })

      const url = result.url ?? (result.b64Json ? `data:image/png;base64,${result.b64Json}` : null)
      if (!url) throw new Error('未返回图片')
      setResultUrl(url)
      setResultModel(result.model)
      if (activeMode === 'library' && selectedActorCard && !name) {
        setName(selectedActorCard.name)
      }
      setStatus(`生成成功（${result.model}）`)
    } catch (error) {
      setStatus(error instanceof ApiError || error instanceof Error ? error.message : '生成失败')
    } finally {
      setBusy(false)
    }
  }

  async function handleSave() {
    if (!resultUrl || busy) return
    if (!user) {
      navigate('/login?next=/character')
      return
    }
    if (!projectName.trim()) {
      setStatus('请填写项目名称后再保存。')
      return
    }

    setBusy(true)
    setStatus('正在保存到项目…')
    try {
      const description = buildDescription() || '角色设定'
      const { project, created } = await resolveOrCreateProject(projectName, description)
      const character = await saveCharacterAsset({
        name: name.trim() || selectedActorCard?.name || '未命名角色',
        description,
        referenceUrls: [resultUrl],
        libraryScoped: true,
        projectId: project.id,
        bio: resultModel ? `generated by ${resultModel}` : undefined,
      })
      setSavedId(character.id)
      setProjectSuggestions((prev) =>
        prev.includes(project.title) ? prev : [project.title, ...prev],
      )
      setStatus(
        created
          ? `已新建项目「${project.title}」并保存角色「${character.name}」`
          : `已保存角色「${character.name}」到项目「${project.title}」`,
      )
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '保存失败')
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteResult() {
    if (busy) return
    setBusy(true)
    try {
      if (savedId) {
        await deleteCharacterAsset(savedId)
      }
      resetResult()
      setStatus('已删除当前生成结果')
    } catch (error) {
      // Still clear local result if remote delete fails (e.g. memory restarted)
      resetResult()
      setStatus(error instanceof Error ? `本地结果已清除（${error.message}）` : '已删除当前生成结果')
    } finally {
      setBusy(false)
    }
  }

  function handleRegenerate() {
    void handleGenerate()
  }

  function onFileChange(file?: File | null) {
    if (!file) return
    setUploadFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    resetResult()
    setStatus(`已载入参考图「${file.name}」。`)
  }

  const meta = activeMode ? modeMeta[activeMode] : null
  const showResult = Boolean(resultUrl)

  return (
    <StudioLayout
      variant="portal"
      eyebrow="01 · 角色设计"
      title="选择创建方式"
      lead="点选入口，在弹窗中完成角色设定"
    >
      <EntryPortal entries={characterEntries} onSelect={(id) => openMode(id as CharacterMode)} />

      <StudioModal
        open={activeMode !== null}
        title={meta?.title ?? ''}
        subtitle={meta?.subtitle}
        onClose={closeModal}
      >
        {activeMode === 'text' && (
          <div className="modal-form">
            <label className="field">
              <span>角色昵称</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：桃桃" />
            </label>
            <label className="field">
              <span>形象描述</span>
              <textarea
                rows={6}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="软萌短发少女，粉色连帽衫…"
              />
            </label>
          </div>
        )}

        {activeMode === 'upload' && (
          <div className="modal-form">
            <button type="button" className="upload-zone" onClick={() => fileRef.current?.click()}>
              {previewUrl ? (
                <img src={previewUrl} alt="参考预览" className="upload-preview" />
              ) : (
                <span>
                  点击或拖入图片
                  <small>支持 JPG / PNG，建议正面半身</small>
                </span>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => onFileChange(e.target.files?.[0])}
            />
            <label className="field">
              <span>补充说明（可选）</span>
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="保持发型，服装改成校服"
              />
            </label>
          </div>
        )}

        {activeMode === 'library' && (
          <div className="modal-form">
            <div className="actor-grid">
              {mockActors.map((actor) => (
                <button
                  key={actor.id}
                  type="button"
                  className={`actor-card tone-${actor.tone} ${selectedActor === actor.id ? 'is-selected' : ''}`}
                  onClick={() => {
                    setSelectedActor(actor.id)
                    setName(actor.name)
                    resetResult()
                    setStatus(`已选择演员「${actor.name}」，可生成形象。`)
                  }}
                >
                  <span className="actor-avatar" aria-hidden="true" />
                  <strong>{actor.name}</strong>
                  <span>{actor.vibe}</span>
                  <em>{actor.tags.join(' · ')}</em>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeMode === 'custom' && (
          <div className="modal-form modal-form-split">
            <div className="custom-preview-wrap">
              <CharacterPreview name={name || '新角色'} parts={parts} />
            </div>
            <div>
              <label className="field">
                <span>角色昵称</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：柚子" />
              </label>
              <div className="part-tabs" role="tablist" aria-label="五官部件">
                {(Object.keys(partLabels) as PartCategory[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={activePart === key ? 'is-active' : ''}
                    onClick={() => setActivePart(key)}
                  >
                    {partLabels[key]}
                  </button>
                ))}
              </div>
              <div className="part-options">
                {partOptions[activePart].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={parts[activePart] === option.id ? 'is-selected' : ''}
                    onClick={() => {
                      setParts((prev) => ({ ...prev, [activePart]: option.id }))
                      resetResult()
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="part-summary">当前组合：{selectedPartLabel}</p>
            </div>
          </div>
        )}

        {showResult && resultUrl ? (
          <GenerationResultPanel
            imageUrl={resultUrl}
            projectName={projectName}
            onProjectNameChange={setProjectName}
            projectSuggestions={projectSuggestions}
            saved={Boolean(savedId)}
            busy={busy}
            onSave={() => void handleSave()}
            onDelete={() => void handleDeleteResult()}
            onRegenerate={handleRegenerate}
          />
        ) : null}

        <div className="modal-foot">
          {status ? (
            <p className="status-line" role="status">
              {status}
            </p>
          ) : (
            <span />
          )}
          <div className="panel-actions">
            <button type="button" className="btn btn-ghost" onClick={closeModal} disabled={busy}>
              取消
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleGenerate()}
              disabled={busy}
            >
              {busy ? '生成中…' : showResult ? '再次生成' : '生成角色形象'}
            </button>
          </div>
        </div>
      </StudioModal>

      <p className="portal-next-hint">
        角色就绪后，前往 <Link to="/story">剧情设计</Link>
      </p>
    </StudioLayout>
  )
}

function CharacterPreview({
  name,
  parts,
}: {
  name?: string
  parts: Record<PartCategory, string>
}) {
  return (
    <div className="char-preview-art" data-hair={parts.hair} data-face={parts.face}>
      <div className="char-halo" />
      <div className="char-bust">
        <div className="char-hair" />
        <div className="char-face">
          <span className="char-eye left" />
          <span className="char-eye right" />
          <span className="char-nose" />
          <span className="char-mouth" />
        </div>
      </div>
      <p className="char-preview-name">{name}</p>
    </div>
  )
}
