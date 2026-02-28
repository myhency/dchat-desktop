import { create } from 'zustand'
import { skillApi } from '../api/skill.api'
import type { Skill } from '@dchat/shared'

export type { Skill }

interface SkillState {
  skills: Skill[]
  loading: boolean
  loadSkills: () => Promise<void>
  createSkill: (name: string, description: string, content: string) => Promise<Skill>
  updateSkill: (id: string, updates: { name?: string; description?: string; content?: string }) => Promise<void>
  deleteSkill: (id: string) => Promise<void>
  toggleEnabled: (id: string) => Promise<void>
}

export const useSkillStore = create<SkillState>((set) => ({
  skills: [],
  loading: false,

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
  }
}))
