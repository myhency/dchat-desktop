import { create } from 'zustand'
import { skillApi } from '../api/skill.api'
import type { Skill } from '@dchat/shared'

export type { Skill }

interface SkillState {
  skills: Skill[]
  loading: boolean
  selectedFileContent: string | null
  selectedFilePath: string | null
  loadSkills: () => Promise<void>
  createSkill: (name: string, description: string, content: string) => Promise<Skill>
  updateSkill: (id: string, updates: { name?: string; description?: string; content?: string }) => Promise<void>
  deleteSkill: (id: string) => Promise<void>
  toggleEnabled: (id: string) => Promise<void>
  loadFileContent: (skillId: string, relativePath: string) => Promise<void>
  clearFileContent: () => void
  uploadArchive: (data: string) => Promise<Skill>
  uploadFiles: (files: { relativePath: string; data: string }[]) => Promise<Skill>
}

export const useSkillStore = create<SkillState>((set) => ({
  skills: [],
  loading: false,
  selectedFileContent: null,
  selectedFilePath: null,

  loadSkills: async () => {
    set({ loading: true })
    try {
      const skills = await skillApi.list()
      set({ skills })
    } finally {
      set({ loading: false })
    }
  },

  createSkill: async (name, description, content) => {
    const skill = await skillApi.create({ name, description, content })
    set((state) => ({ skills: [skill, ...state.skills] }))
    return skill
  },

  updateSkill: async (id, updates) => {
    const updated = await skillApi.update(id, updates)
    set((state) => ({
      skills: state.skills.map((s) => (s.id === id ? updated : s))
    }))
  },

  deleteSkill: async (id) => {
    await skillApi.delete(id)
    set((state) => ({
      skills: state.skills.filter((s) => s.id !== id)
    }))
  },

  toggleEnabled: async (id) => {
    // Optimistic update
    set((state) => ({
      skills: state.skills.map((s) =>
        s.id === id ? { ...s, isEnabled: !s.isEnabled } : s
      )
    }))
    try {
      const updated = await skillApi.toggleEnabled(id)
      set((state) => ({
        skills: state.skills.map((s) => (s.id === id ? updated : s))
      }))
    } catch {
      // Revert on error
      set((state) => ({
        skills: state.skills.map((s) =>
          s.id === id ? { ...s, isEnabled: !s.isEnabled } : s
        )
      }))
    }
  },

  loadFileContent: async (skillId, relativePath) => {
    try {
      const content = await skillApi.readFile(skillId, relativePath)
      set({ selectedFileContent: content, selectedFilePath: relativePath })
    } catch {
      set({ selectedFileContent: null, selectedFilePath: null })
    }
  },

  clearFileContent: () => {
    set({ selectedFileContent: null, selectedFilePath: null })
  },

  uploadArchive: async (data) => {
    const skill = await skillApi.uploadArchive(data)
    set((state) => ({ skills: [skill, ...state.skills] }))
    return skill
  },

  uploadFiles: async (files) => {
    const skill = await skillApi.uploadFiles(files)
    set((state) => ({ skills: [skill, ...state.skills] }))
    return skill
  }
}))
