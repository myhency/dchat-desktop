import type { Session } from '../../entities/session'

export interface ManageSessionUseCase {
  create(title: string, model: string, projectId?: string | null): Promise<Session>
  list(): Promise<Session[]>
  listByProjectId(projectId: string): Promise<Session[]>
  getById(id: string): Promise<Session | null>
  delete(id: string): Promise<void>
  updateModel(id: string, model: string): Promise<Session>
  updateTitle(id: string, title: string): Promise<Session>
  updateProjectId(id: string, projectId: string | null): Promise<Session>
  toggleFavorite(id: string): Promise<Session>
}
