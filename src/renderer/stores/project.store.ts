import { create } from 'zustand'

export interface Project {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
}

interface ProjectState {
  projects: Project[]
  loadProjects: () => Promise<void>
  createProject: (name: string, description: string) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  updateProject: (id: string, name: string, description: string) => Promise<void>
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],

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
    set((state) => ({ projects: state.projects.filter((p) => p.id !== id) }))
  },

  updateProject: async (id, name, description) => {
    const updated = await window.hchat.project.update(id, name, description)
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? updated : p))
    }))
  }
}))
