type ProjectNameFieldProps = {
  value: string
  onChange: (value: string) => void
  suggestions?: string[]
  disabled?: boolean
  required?: boolean
  hint?: string
}

export function ProjectNameField({
  value,
  onChange,
  suggestions = [],
  disabled = false,
  required = true,
  hint = '保存时会归入该项目；同名项目将自动复用',
}: ProjectNameFieldProps) {
  const listId = 'bloomani-project-name-list'

  return (
    <label className="field project-name-field">
      <span>
        项目名称
        {required ? <em className="field-required">必填</em> : null}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="例如：发光小猫短片"
        list={suggestions.length > 0 ? listId : undefined}
        disabled={disabled}
        autoComplete="off"
        required={required}
      />
      {suggestions.length > 0 ? (
        <datalist id={listId}>
          {suggestions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      ) : null}
      {hint ? <small className="field-hint">{hint}</small> : null}
    </label>
  )
}
