import { ProjectNameField } from './ProjectNameField'

type GenerationResultPanelProps = {
  imageUrl: string
  projectName: string
  onProjectNameChange: (value: string) => void
  projectSuggestions?: string[]
  saved?: boolean
  busy?: boolean
  onSave: () => void
  onDelete: () => void
  onRegenerate: () => void
}

export function GenerationResultPanel({
  imageUrl,
  projectName,
  onProjectNameChange,
  projectSuggestions = [],
  saved = false,
  busy = false,
  onSave,
  onDelete,
  onRegenerate,
}: GenerationResultPanelProps) {
  return (
    <div className="modal-result">
      <div className="modal-result-head">
        <p className="modal-drafts-label">生成结果</p>
        {saved ? <span className="result-badge">已保存</span> : null}
      </div>
      <div className="modal-result-frame">
        <img src={imageUrl} alt="角色生成结果" className="modal-result-image" />
        <div className="result-save-meta">
          <ProjectNameField
            value={projectName}
            onChange={onProjectNameChange}
            suggestions={projectSuggestions}
            disabled={busy || saved}
          />
        </div>
        <div className="result-actions">
          <button
            type="button"
            className="btn btn-primary result-action-btn"
            onClick={onSave}
            disabled={busy || saved}
          >
            {saved ? '已保存' : '保存到项目'}
          </button>
          <button
            type="button"
            className="btn btn-ghost result-action-btn"
            onClick={onDelete}
            disabled={busy}
          >
            删除
          </button>
          <button
            type="button"
            className="btn btn-ghost result-action-btn"
            onClick={onRegenerate}
            disabled={busy}
          >
            重新生成
          </button>
        </div>
      </div>
    </div>
  )
}
