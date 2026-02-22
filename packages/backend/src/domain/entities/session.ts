export interface Session {
  id: string
  title: string
  model: string
  projectId: string | null
  isFavorite: boolean
  createdAt: Date
  updatedAt: Date
}
