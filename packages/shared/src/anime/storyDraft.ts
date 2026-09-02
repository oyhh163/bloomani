/** Story draft contracts for persisted screenplay writing */

export type StoryDraftSource = 'write' | 'import' | 'public'

export interface StoryDraft {
  id: string
  userId: string
  title: string
  body: string
  source: StoryDraftSource
  createdAt: string
  updatedAt: string
}

export interface CreateStoryDraftInput {
  title: string
  body: string
  source?: StoryDraftSource
  userId?: string
}

export interface UpdateStoryDraftInput {
  title?: string
  body?: string
  source?: StoryDraftSource
}
