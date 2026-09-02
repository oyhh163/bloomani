import type { ApiResponse, ImportScriptInput, Screenplay } from '@bloomani/shared'
import { apiPost } from './client'

export async function createScreenplayFromScript(
  projectId: string,
  input: ImportScriptInput,
): Promise<Screenplay> {
  const result = await apiPost<ApiResponse<Screenplay>>('/api/screenplays/from-script', {
    projectId,
    ...input,
  })
  if (!result.ok) throw new Error(result.error)
  return result.data
}
