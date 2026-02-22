import { create } from 'zustand'
import { projectApi } from '../api'
import type { Project } from '@dchat/shared'

export type { Project }

interface ProjectState {
  projects: Project[]
  selectedProjectId: string | null
  loadProjects: () => Promise<void>
  createProject: (name: string, description: string) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  updateProject: (id: string, name: string, description: string) => Promise<void>
  updateInstructions: (id: string, instructions: string) => Promise<void>
  toggleFavorite: (id: string) => Promise<void>
  selectProject: (id: string) => void
  deselectProject: () => void
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  selectedProjectId: null,

  loadProjects: async () => {
    const projects = await projectApi.list()
    set({ projects })
  },

  createProject: async (name, description) => {
    const project = await projectApi.create(name, description)
    set((state) => ({ projects: [project, ...state.projects] }))
  },

  deleteProject: async (id) => {
    await projectApi.delete(id)
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      selectedProjectId: state.selectedProjectId === id ? null : state.selectedProjectId
    }))
  },

  updateProject: async (id, name, description) => {
    const updated = await projectApi.update(id, name, description)
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? updated : p))
    }))
  },

  updateInstructions: async (id, instructions) => {
    const updated = await projectApi.updateInstructions(id, instructions)
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? updated : p))
    }))
  },

  toggleFavorite: async (id) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, isFavorite: !p.isFavorite } : p
      )
    }))
    const updated = await projectApi.toggleFavorite(id)
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? updated : p))
    }))
  },

  selectProject: (id) => set({ selectedProjectId: id }),
  deselectProject: () => set({ selectedProjectId: null })
}))
