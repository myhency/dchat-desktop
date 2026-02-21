import type { Project } from '../../entities/project'

export interface ProjectRepository {
  findAll(): Promise<Project[]>
  findById(id: string): Promise<Project | null>
  save(project: Project): Promise<void>
  delete(id: string): Promise<void>
}
