export interface Project {
  id: string
  name: string
  description: string
  instructions: string
  isFavorite: boolean
  memoryContent: string
  memoryUpdatedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
