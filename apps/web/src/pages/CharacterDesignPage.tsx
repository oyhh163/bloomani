import { useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { StudioLayout } from '../components/layout/StudioLayout'
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

export function CharacterDesignPage() {
  const reduceMotion = useReducedMotion()
  const [mode, setMode] = useState<CharacterMode>('text')
  const [prompt, setPrompt] = useState('软萌短发少女，粉色连帽衫，眼神明亮，青春校园感')
  const [name, setName] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedActor, setSelectedActor] = useState<string | null>(null)
  const [parts, setParts] = useState(defaultParts)
  const [activePart, setActivePart] = useState<PartCategory>('face')
  const [status, setStatus] = useState('选择一种方式，开始锁定你的角色。')
  const fileRef = useRef<HTMLInputElement>(null)

  const selectedPartLabel = useMemo(() => {
    return (Object.keys(parts) as PartCategory[])
      .map((key) => partOptions[key].find((o) => o.id === parts[key])?.label)
      .filter(Boolean)
      .join(' · ')
  }, [parts])

  function handleGenerate() {
    if (mode === 'text' && !prompt.trim()) {
      setStatus('请先填写角色描述。')
      return
    }
    if (mode === 'upload' && !previewUrl) {
      setStatus('请先上传一张参考图。')
      return
    }
    if (mode === 'library' && !selectedActor) {
      setStatus('请先从演员库选择一位角色。')
      return
    }
    setStatus('已生成角色草稿（前端预览）。接入模型后将写入资产库。')
  }

  function onFileChange(file?: File | null) {
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setStatus(`已载入参考图「${file.name}」，可生成角色形象。`)
  }

  return (
    <StudioLayout
      eyebrow="01 · 角色设计"
      title="定住角色，镜头里始终是同一个人"
      lead="文本、参考图、演员库或自定义五官，四种方式都能产出可复用的角色资产。"
    >
      <div className="mode-rail" role="tablist" aria-label="角色创建方式">
        {characterModes.map((item) => (
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

      <div className="studio-grid">
        <motion.section
          className="studio-panel"
          key={mode}
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          {mode === 'text' && (
            <>
              <h2>根据文本生成</h2>
              <p className="panel-desc">描述年龄、发型、服装与气质，系统会生成可复用设定。</p>
              <label className="field">
                <span>角色昵称</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：桃桃"
                />
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
            </>
          )}

          {mode === 'upload' && (
            <>
              <h2>上传图片生成</h2>
              <p className="panel-desc">上传一张清晰正脸或半身参考图，用于锁定外貌特征。</p>
              <button
                type="button"
                className="upload-zone"
                onClick={() => fileRef.current?.click()}
              >
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
            </>
          )}

          {mode === 'library' && (
            <>
              <h2>AI 演员库</h2>
              <p className="panel-desc">
                选用平台可复用演员。素材来源后续调研接入，当前为占位示例。
              </p>
              <div className="actor-grid">
                {mockActors.map((actor) => (
                  <button
                    key={actor.id}
                    type="button"
                    className={`actor-card tone-${actor.tone} ${selectedActor === actor.id ? 'is-selected' : ''}`}
                    onClick={() => {
                      setSelectedActor(actor.id)
                      setName(actor.name)
                      setStatus(`已选择演员「${actor.name}」。`)
                    }}
                  >
                    <span className="actor-avatar" aria-hidden="true" />
                    <strong>{actor.name}</strong>
                    <span>{actor.vibe}</span>
                    <em>{actor.tags.join(' · ')}</em>
                  </button>
                ))}
              </div>
            </>
          )}

          {mode === 'custom' && (
            <>
              <h2>自定义角色形象</h2>
              <p className="panel-desc">从素材库挑选脸型、发型、眼睛、鼻子、嘴巴组合形象。</p>
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
                    onClick={() => setParts((prev) => ({ ...prev, [activePart]: option.id }))}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="part-summary">当前组合：{selectedPartLabel}</p>
            </>
          )}

          <div className="panel-actions">
            <button type="button" className="btn btn-primary" onClick={handleGenerate}>
              生成角色形象
            </button>
            <Link className="btn btn-ghost" to="/story">
              下一步：剧情设计
            </Link>
          </div>
          <p className="status-line" role="status">
            {status}
          </p>
        </motion.section>

        <aside className="studio-preview">
          <div className={`preview-stage tone-${mode === 'library' ? 'mint' : 'rose'}`}>
            {previewUrl && mode === 'upload' ? (
              <img src={previewUrl} alt="" className="preview-image" />
            ) : (
              <CharacterPreview
                mode={mode}
                name={name || (selectedActor ? mockActors.find((a) => a.id === selectedActor)?.name : '新角色')}
                parts={parts}
              />
            )}
          </div>
          <div className="preview-meta">
            <h3>{name || '未命名角色'}</h3>
            <p>
              {mode === 'custom'
                ? selectedPartLabel
                : mode === 'library' && selectedActor
                  ? mockActors.find((a) => a.id === selectedActor)?.vibe
                  : prompt || '等待描述或参考图'}
            </p>
          </div>
        </aside>
      </div>
    </StudioLayout>
  )
}

function CharacterPreview({
  mode,
  name,
  parts,
}: {
  mode: CharacterMode
  name?: string
  parts: Record<PartCategory, string>
}) {
  return (
    <div className="char-preview-art" data-mode={mode} data-hair={parts.hair} data-face={parts.face}>
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
