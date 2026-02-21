import type { Project } from '../../entities/project'

export interface ManageProjectUseCase {
  create(name: string, description: string): Promise<Project>
  list(): Promise<Project[]>
  delete(id: string): Promise<void>
  update(id: string, name: string, description: string): Promise<Project>
  updateInstructions(id: string, instructions: string): Promise<Project>
}
