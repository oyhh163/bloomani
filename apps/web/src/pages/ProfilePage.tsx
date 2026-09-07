import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import type { WorkspaceSnapshot } from '@bloomani/shared'
import { fetchWorkspace } from '../api/auth'
import { useAuth } from '../auth/AuthContext'
import { Ambient } from '../components/layout/Ambient'
import { NavAccount } from '../components/layout/NavAccount'

export function ProfilePage() {
  const { user, loading } = useAuth()
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot | null>(null)
  const [status, setStatus] = useState('加载个人创作…')
  const [playing, setPlaying] = useState<WorkspaceSnapshot['projects'][number] | null>(null)

  useEffect(() => {
    if (!user) return
    void fetchWorkspace()
      .then((data) => {
        setWorkspace(data)
        setStatus('')
      })
      .catch((error) => {
        setStatus(error instanceof Error ? error.message : '加载失败')
      })
  }, [user])

  const projectMap = useMemo(() => {
    const map = new Map<string, WorkspaceSnapshot['projects'][number]>()
    workspace?.projects.forEach((p) => map.set(p.id, p))
    return map
  }, [workspace])

  const renders = useMemo(
    () =>
      workspace?.projects.filter(
        (p) => p.outputUrl && !p.outputUrl.includes('example.local'),
      ) ?? [],
    [workspace],
  )

  if (loading) {
    return (
      <div className="page profile-page">
        <Ambient />
        <main className="profile-main">
          <p className="status-line">加载中…</p>
        </main>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login?next=/me" replace />
  }

  return (
    <div className="page profile-page">
      <Ambient />
      <header className="nav">
        <Link className="brand" to="/" aria-label="Bloomani 首页">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-text">Bloomani</span>
        </Link>
        <nav className="nav-links" aria-label="创作导航">
          <Link to="/character">角色设计</Link>
          <Link to="/story">剧情设计</Link>
          <Link to="/generate">内容生成</Link>
        </nav>
        <NavAccount />
      </header>

      <main className="profile-main">
        <header className="profile-hero">
          <p className="studio-eyebrow">我的空间</p>
          <h1>{user.displayName}</h1>
          <p className="profile-meta">@{user.username}</p>
          {status ? (
            <p className="status-line" role="status">
              {status}
            </p>
          ) : null}
        </header>

        <section className="profile-section">
          <div className="profile-section-head">
            <h2>项目</h2>
            <Link className="btn btn-ghost" to="/character">
              去创作
            </Link>
          </div>
          {workspace?.projects.length ? (
            <ul className="profile-list">
              {workspace.projects.map((project) => (
                <li key={project.id} className="profile-item">
                  <strong>{project.title}</strong>
                  <p>{project.idea}</p>
                  <div className="profile-item-meta">
                    <span>{project.status}</span>
                    <span>角色 {project.characterIds.length}</span>
                    <span>场景 {project.sceneIds.length}</span>
                    <span>{new Date(project.updatedAt).toLocaleString()}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-hint">还没有项目。保存角色或剧情时填写项目名称即可创建。</p>
          )}
        </section>

        <section className="profile-section">
          <div className="profile-section-head">
            <h2>成片</h2>
            <Link className="btn btn-ghost" to="/generate">
              去生成
            </Link>
          </div>
          {renders.length ? (
            <ul className="profile-grid">
              {renders.map((project) => (
                <li key={project.id} className="profile-card render-card">
                  <div className="profile-card-body">
                    <strong>{project.title}</strong>
                    <span>{new Date(project.updatedAt).toLocaleString()}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setPlaying(project)}
                  >
                    播放成片
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-hint">还没有成片。在「内容生成」跑完流水线后会自动出现在这里。</p>
          )}
        </section>

        <section className="profile-section">
          <div className="profile-section-head">
            <h2>角色</h2>
            <Link className="btn btn-ghost" to="/character">
              角色设计
            </Link>
          </div>
          {workspace?.characters.length ? (
            <ul className="profile-grid">
              {workspace.characters.map((character) => {
                const cover = character.sheets[0]?.url
                const projectTitle = character.projectId
                  ? projectMap.get(character.projectId)?.title
                  : undefined
                return (
                  <li key={character.id} className="profile-card">
                    {cover ? (
                      <img src={cover} alt={character.name} className="profile-card-image" />
                    ) : (
                      <div className="profile-card-placeholder" aria-hidden="true" />
                    )}
                    <div className="profile-card-body">
                      <strong>{character.name}</strong>
                      <span>{projectTitle ? `项目 · ${projectTitle}` : '演员库'}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="empty-hint">还没有保存的角色。</p>
          )}
        </section>

        <section className="profile-section">
          <div className="profile-section-head">
            <h2>剧情草稿</h2>
            <Link className="btn btn-ghost" to="/story">
              剧情设计
            </Link>
          </div>
          {workspace?.storyDrafts.length ? (
            <ul className="profile-list">
              {workspace.storyDrafts.map((draft) => (
                <li key={draft.id} className="profile-item">
                  <strong>{draft.title}</strong>
                  <p>{draft.body.slice(0, 160)}{draft.body.length > 160 ? '…' : ''}</p>
                  <div className="profile-item-meta">
                    <span>{draft.source}</span>
                    <span>{new Date(draft.updatedAt).toLocaleString()}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-hint">还没有保存的剧情草稿。</p>
          )}
        </section>
        {playing ? (
          <div
            className="render-modal"
            role="dialog"
            aria-modal="true"
            onClick={() => setPlaying(null)}
          >
            <div className="render-modal-inner" onClick={(e) => e.stopPropagation()}>
              <div className="render-modal-head">
                <strong>{playing.title}</strong>
                <button type="button" className="btn btn-ghost" onClick={() => setPlaying(null)}>
                  关闭
                </button>
              </div>
              <video className="render-video" src={playing.outputUrl!} controls autoPlay />
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}
