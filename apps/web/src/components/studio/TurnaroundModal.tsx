import { useEffect, useMemo, useState } from 'react'
import type {
  CharacterAsset,
  CharacterTurnaround,
  CharacterTurnaroundSlot,
} from '@bloomani/shared'
import {
  createCharacterTurnaround,
  listCharacterStylePresets,
  regenerateCharacterTurnaround,
  type CharacterStylePresetSummary,
} from '../../api/characterStudio'
import { saveCharacterAsset } from '../../api/assets'

export interface TurnaroundModalProps {
  open: boolean
  onClose: () => void
  onSaved?: (character: CharacterAsset) => void
}

interface FormState {
  name: string
  tagline: string
  description: string
  bio: string
  personality: string
  stylePresetId: string
  /** 期望同步保存到的项目名 */
  projectName: string
}

const ALL_SLOTS: Array<Pick<CharacterTurnaroundSlot, 'id' | 'label' | 'view' | 'pose'>> = [
  { id: 'head', label: '头像', view: 'expression', pose: '正面头像特写' },
  { id: 'front', label: '正面全身', view: 'front', pose: '正面全身直立' },
  { id: 'back', label: '背面全身', view: 'back', pose: '背面全身直立' },
  { id: 'side', label: '侧面全身', view: 'side', pose: '90 度侧面全身' },
]

const DEFAULT_FORM: FormState = {
  name: '',
  tagline: '',
  description: '',
  bio: '',
  personality: '',
  stylePresetId: 'anime-fantasy',
  projectName: '',
}

export function TurnaroundModal({ open, onClose, onSaved }: TurnaroundModalProps) {
  const [styles, setStyles] = useState<CharacterStylePresetSummary[]>([])
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [character, setCharacter] = useState<CharacterAsset | null>(null)
  const [generating, setGenerating] = useState(false)
  const [busySlotId, setBusySlotId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!open) return
    listCharacterStylePresets().then(setStyles).catch(() => setStyles([]))
  }, [open])

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const resetAll = () => {
    setForm(DEFAULT_FORM)
    setCharacter(null)
    setError(null)
    setSaved(false)
  }

  const handleClose = () => {
    onClose()
    // 让动画结束后再清空，避免闪烁
    window.setTimeout(resetAll, 250)
  }

  const buildRequestBody = () => ({
    name: form.name,
    tagline: form.tagline || undefined,
    bio: form.bio || undefined,
    personality: form.personality || undefined,
    description: form.description,
    stylePresetId: form.stylePresetId,
  })

  const handleGenerate = async () => {
    if (!form.name.trim() || !form.description.trim()) {
      setError('请填好角色名称 + 角色描述')
      return
    }
    setError(null)
    setSaved(false)
    setGenerating(true)
    try {
      const result = await createCharacterTurnaround(buildRequestBody())
      setCharacter(result)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setGenerating(false)
    }
  }

  const handleRegenerateAll = async () => {
    if (!character) return
    setGenerating(true)
    setError(null)
    try {
      const result = await regenerateCharacterTurnaround({
        characterId: character.id,
        stylePresetId: form.stylePresetId,
        tagline: form.tagline || undefined,
      })
      setCharacter(result)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setGenerating(false)
    }
  }

  const handleRegenerateSlot = async (slotId: string) => {
    if (!character) return
    setBusySlotId(slotId)
    setError(null)
    try {
      const result = await regenerateCharacterTurnaround({
        characterId: character.id,
        stylePresetId: form.stylePresetId,
        tagline: form.tagline || undefined,
        slotIds: [slotId],
        seedReferenceUrl: pickSeed(character.turnaround, slotId),
      })
      setCharacter(result)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusySlotId(null)
    }
  }

  const handleSave = async () => {
    if (!character) return
    if (!form.projectName.trim()) {
      setError('请填写项目名称再保存')
      return
    }
    setSaving(true)
    setError(null)
    try {
      // turnaround 视图已经在 character 上，存库即可（仓库函数兼容）
      const saved = await saveCharacterAsset({
        name: character.name,
        description: form.description,
        referenceUrls: [character.turnaround?.slots?.[1]?.url ?? character.sheets?.[0]?.url].filter(
          Boolean,
        ) as string[],
        libraryScoped: true,
        bio: form.bio,
        personality: form.personality,
        tagline: form.tagline,
      })
      onSaved?.(saved)
      setSaved(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const selectedStyle = useMemo(
    () => styles.find((s) => s.id === form.stylePresetId),
    [styles, form.stylePresetId],
  )

  if (!open) return null

  return (
    <div className="studio-modal-root" role="presentation" onClick={handleClose}>
      <div className="studio-modal-backdrop" />
      <div
        className="studio-modal turnaround-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="turnaround-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="studio-modal-head">
          <div>
            <h2 id="turnaround-modal-title">风格定妆 · 多视图</h2>
            <p>选择画风 → 描述身份 → 生成头像 + 正面 + 背面 + 侧面 四张定妆照</p>
          </div>
          <button type="button" className="studio-modal-close" onClick={handleClose} aria-label="关闭">
            ×
          </button>
        </header>

        <div className="turnaround-modal-body">
          {/* ── 左：表单 ── */}
          <aside className="turnaround-form">
            <div className="turnaround-section">
              <h3>角色信息</h3>
              <div className="turnaround-field">
                <label>角色名 *</label>
                <input
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="例如：森林系歌姬"
                />
              </div>
              <div className="turnaround-field">
                <label>一句描述</label>
                <input
                  value={form.tagline}
                  onChange={(e) => updateField('tagline', e.target.value)}
                  placeholder="例如：冰蓝长发精灵歌姬"
                />
              </div>
              <div className="turnaround-field">
                <label>角色描述 / 视觉提示词 *</label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="详细描述五官、发型、服饰、气质……"
                />
              </div>
              <div className="turnaround-field-row">
                <div className="turnaround-field">
                  <label>背景</label>
                  <input
                    value={form.bio}
                    onChange={(e) => updateField('bio', e.target.value)}
                    placeholder="身份 / 出身"
                  />
                </div>
                <div className="turnaround-field">
                  <label>性格</label>
                  <input
                    value={form.personality}
                    onChange={(e) => updateField('personality', e.target.value)}
                    placeholder="性格 / 口头禅"
                  />
                </div>
              </div>
            </div>

            <div className="turnaround-section">
              <h3>选择画风</h3>
              <div className="turnaround-style-grid">
                {styles.map((style) => {
                  const active = style.id === form.stylePresetId
                  return (
                    <button
                      key={style.id}
                      type="button"
                      className={`turnaround-style-card ${active ? 'is-active' : ''}`}
                      onClick={() => updateField('stylePresetId', style.id)}
                      style={{
                        borderColor: active ? style.palette[1] : 'transparent',
                      }}
                    >
                      <span
                        className="turnaround-style-swatch"
                        style={{
                          background: `linear-gradient(135deg, ${style.palette.join(', ')})`,
                        }}
                      />
                      <span className="turnaround-style-label">{style.label}</span>
                      <span className="turnaround-style-desc">{style.description}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {error && <p className="turnaround-error">{error}</p>}
          </aside>

          {/* ── 右：四视图 ── */}
          <section className="turnaround-canvas">
            <header className="turnaround-canvas-head">
              <div>
                <h3>{character?.name ?? '尚未生成'}</h3>
                {character?.tagline && <p className="turnaround-tagline">{character.tagline}</p>}
              </div>
              <span className="turnaround-canvas-meta">
                {selectedStyle?.label ?? '默认风格'} ·{' '}
                {character?.turnaround?.slots?.filter((s) => !!s.url).length ?? 0}
                /4 视图已生成
              </span>
            </header>

            <TurnaroundBoard
              turnaround={character?.turnaround}
              generating={generating}
              busySlotId={busySlotId}
              onRegenerateSlot={handleRegenerateSlot}
            />
          </section>
        </div>

        <footer className="turnaround-modal-foot">
          <div className="turnaround-save">
            <input
              value={form.projectName}
              onChange={(e) => updateField('projectName', e.target.value)}
              placeholder="项目名（保存时使用）"
              disabled={!character}
            />
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleSave}
              disabled={!character || saving}
            >
              {saved ? '已保存 ✓' : saving ? '保存中…' : '保存到项目'}
            </button>
          </div>
          <div className="panel-actions">
            <button type="button" className="btn btn-ghost" onClick={handleClose}>
              取消
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={character ? handleRegenerateAll : handleGenerate}
              disabled={generating}
            >
              {generating ? '生成中…' : character ? '全部重新生成' : '生成四视图'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}

interface BoardProps {
  turnaround?: CharacterTurnaround
  generating: boolean
  busySlotId: string | null
  onRegenerateSlot: (slotId: string) => void
}

function TurnaroundBoard({ turnaround, generating, busySlotId, onRegenerateSlot }: BoardProps) {
  const slots = turnaround?.slots ?? ALL_SLOTS.map((s) => ({ ...s }))
  return (
    <div className="turnaround-board">
      <SheetFrame
        slot={slots.find((s) => s.id === 'head')}
        aspect="1/1"
        generating={generating || busySlotId === 'head'}
        label="头像"
        onRegenerate={() => onRegenerateSlot('head')}
        highlight
      />
      <div className="turnaround-side">
        <SheetFrame
          slot={slots.find((s) => s.id === 'front')}
          aspect="3/4"
          generating={generating || busySlotId === 'front'}
          label="正面全身"
          onRegenerate={() => onRegenerateSlot('front')}
        />
        <SheetFrame
          slot={slots.find((s) => s.id === 'back')}
          aspect="3/4"
          generating={generating || busySlotId === 'back'}
          label="背面全身"
          onRegenerate={() => onRegenerateSlot('back')}
        />
        <SheetFrame
          slot={slots.find((s) => s.id === 'side')}
          aspect="3/4"
          generating={generating || busySlotId === 'side'}
          label="侧面全身"
          onRegenerate={() => onRegenerateSlot('side')}
        />
      </div>
    </div>
  )
}

function SheetFrame({
  slot,
  aspect,
  generating,
  label,
  onRegenerate,
  highlight,
}: {
  slot?: CharacterTurnaroundSlot
  aspect: '1/1' | '3/4'
  generating: boolean
  label: string
  onRegenerate: () => void
  highlight?: boolean
}) {
  return (
    <figure className={`turnaround-sheet ${highlight ? 'is-highlight' : ''}`}>
      <div className="turnaround-sheet-image" style={{ aspectRatio: aspect }}>
        {slot?.url ? (
          <img src={slot.url} alt={label} />
        ) : generating ? (
          <div className="turnaround-sheet-placeholder">
            <span className="turnaround-sheet-spinner" />
            <span>正在生成 {label}…</span>
          </div>
        ) : (
          <div className="turnaround-sheet-placeholder is-empty">
            <span>暂未生成</span>
            <small>填写左侧表单后点击「生成四视图」</small>
          </div>
        )}
      </div>
      <figcaption className="turnaround-sheet-caption">
        <span>{label}</span>
        <button
          type="button"
          className="turnaround-sheet-again"
          onClick={onRegenerate}
          disabled={generating || !slot?.url}
        >
          {generating ? '生成中…' : '重新生成'}
        </button>
      </figcaption>
    </figure>
  )
}

function pickSeed(turnaround: CharacterTurnaround | undefined, excludeId: string) {
  if (!turnaround) return undefined
  return (
    turnaround.slots.find((s) => s.id === 'head' && s.id !== excludeId)?.url ??
    turnaround.slots.find((s) => s.id !== excludeId && !!s.url)?.url
  )
}