import { create } from 'zustand'

export interface Project {
  id: string
  name: string
  description: string
  instructions: string
  createdAt: string
  updatedAt: string
}

interface ProjectState {
  projects: Project[]
  selectedProjectId: string | null
  loadProjects: () => Promise<void>
  createProject: (name: string, description: string) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  updateProject: (id: string, name: string, description: string) => Promise<void>
  updateInstructions: (id: string, instructions: string) => Promise<void>
  selectProject: (id: string) => void
  deselectProject: () => void
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  selectedProjectId: null,

  loadProjects: async () => {
    const projects = await window.hchat.project.list()
    set({ projects })
  },

  createProject: async (name, description) => {
    const project = await window.hchat.project.create(name, description)
    set((state) => ({ projects: [project, ...state.projects] }))
  },

  deleteProject: async (id) => {
    await window.hchat.project.delete(id)
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      selectedProjectId: state.selectedProjectId === id ? null : state.selectedProjectId
    }))
  },

  updateProject: async (id, name, description) => {
    const updated = await window.hchat.project.update(id, name, description)
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? updated : p))
    }))
  },

  updateInstructions: async (id, instructions) => {
    const updated = await window.hchat.project.updateInstructions(id, instructions)
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? updated : p))
    }))
  },

  selectProject: (id) => set({ selectedProjectId: id }),
  deselectProject: () => set({ selectedProjectId: null })
}))
