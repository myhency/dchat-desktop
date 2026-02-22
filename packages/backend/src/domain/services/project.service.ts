import type { Project } from '../entities/project'
import type { ManageProjectUseCase } from '../ports/inbound/manage-project.usecase'
import type { ProjectRepository } from '../ports/outbound/project.repository'
import { generateId } from './id'

export class ProjectService implements ManageProjectUseCase {
  constructor(private readonly projectRepo: ProjectRepository) {}

  async create(name: string, description: string): Promise<Project> {
    const now = new Date()
    const project: Project = {
      id: generateId(),
      name,
      description,
      instructions: '',
      isFavorite: false,
      createdAt: now,
      updatedAt: now
    }
    await this.projectRepo.save(project)
    return project
  }

  async list(): Promise<Project[]> {
    return this.projectRepo.findAll()
  }

  async delete(id: string): Promise<void> {
    await this.projectRepo.delete(id)
  }

  async update(id: string, name: string, description: string): Promise<Project> {
    const project = await this.projectRepo.findById(id)
    if (!project) {
      throw new Error(`Project not found: ${id}`)
    }
    project.name = name
    project.description = description
    project.updatedAt = new Date()
    await this.projectRepo.save(project)
    return project
  }

  async toggleFavorite(id: string): Promise<Project> {
    const project = await this.projectRepo.findById(id)
    if (!project) {
      throw new Error(`Project not found: ${id}`)
    }
    project.isFavorite = !project.isFavorite
    await this.projectRepo.save(project)
    return project
  }

  async updateInstructions(id: string, instructions: string): Promise<Project> {
    const project = await this.projectRepo.findById(id)
    if (!project) {
      throw new Error(`Project not found: ${id}`)
    }
    project.instructions = instructions
    project.updatedAt = new Date()
    await this.projectRepo.save(project)
    return project
  }
}
