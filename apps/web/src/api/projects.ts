import type { ApiResponse, CreateProjectInput, Project } from '@bloomani/shared'
import { apiGet, apiPost } from './client'

const LAST_PROJECT_KEY = 'bloomani.lastProjectName'

export function readLastProjectName(): string {
  try {
    return localStorage.getItem(LAST_PROJECT_KEY) ?? ''
  } catch {
    return ''
  }
}

export function rememberProjectName(name: string): void {
  try {
    localStorage.setItem(LAST_PROJECT_KEY, name.trim())
  } catch {
    // ignore quota / private mode
  }
}

export async function listProjects(): Promise<Project[]> {
  const result = await apiGet<ApiResponse<Project[]>>('/api/projects')
  if (!result.ok) throw new Error(result.error)
  return result.data
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const result = await apiPost<ApiResponse<Project>>('/api/projects', input)
  if (!result.ok) throw new Error(result.error)
  return result.data
}

/** Match existing project by exact title, otherwise create one. */
export async function resolveOrCreateProject(
  projectName: string,
  idea: string,
): Promise<{ project: Project; created: boolean }> {
  const title = projectName.trim()
  if (!title) {
    throw new Error('请填写项目名称')
  }

  const projects = await listProjects()
  const existing = projects.find((p) => p.title === title)
  if (existing) {
    rememberProjectName(title)
    return { project: existing, created: false }
  }

  const project = await createProject({
    title,
    idea: idea.trim() || title,
  })
  rememberProjectName(title)
  return { project, created: true }
}
