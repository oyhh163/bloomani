import { HOOK_LABELS, type Episode, type HookType } from '@bloomani/shared'

const ALL_HOOKS: HookType[] = ['gold_3s', 'core_10s', 'climax_50s', 'recurring', 'tail']

export const ANGLE_LABEL: Record<string, string> = { high: '俯拍', low: '仰拍', eye: '平视' }

export function HookRow({ episode }: { episode: Episode }) {
  return (
    <div className="hook-row">
      {ALL_HOOKS.map((h) => {
        const present = Boolean(episode.hookShots?.[h])
        return (
          <span key={h} className={`hook-pill ${present ? 'on' : 'off'}`} title={HOOK_LABELS[h]}>
            {HOOK_LABELS[h].replace(/^.*· /, '')}
          </span>
        )
      })}
    </div>
  )
}

export function StoryboardTable({ episode }: { episode: Episode }) {
  return (
    <div className="shot-table-wrap">
      <table className="shot-table">
        <thead>
          <tr>
            <th>镜</th>
            <th>景别</th>
            <th>运镜</th>
            <th>角度</th>
            <th>卡点</th>
            <th>首尾帧衔接</th>
            <th>衔接锚点</th>
          </tr>
        </thead>
        <tbody>
          {episode.shots.map((shot) => (
            <tr key={shot.id}>
              <td>{shot.index}</td>
              <td>{shot.camera.size}</td>
              <td>{shot.camera.move}</td>
              <td>{shot.camera.angle ? (ANGLE_LABEL[shot.camera.angle] ?? shot.camera.angle) : '—'}</td>
              <td>
                {shot.hookType ? (
                  <span className="tag tag-hook">{HOOK_LABELS[shot.hookType].replace(/^.*· /, '')}</span>
                ) : (
                  <span className="muted">—</span>
                )}
              </td>
              <td className="frame-cell">
                <span className="frame-chain">
                  <span className="frame-start">{shot.frameChain?.startFrameDescription ?? '—'}</span>
                  <span className="frame-arrow">→</span>
                  <span className="frame-end">{shot.frameChain?.endFrameDescription ?? '—'}</span>
                </span>
              </td>
              <td className="conn-cell">{shot.frameChain?.connection ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
