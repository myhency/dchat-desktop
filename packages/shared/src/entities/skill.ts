export interface SkillFile {
  name: string
  relativePath: string
  isDirectory: boolean
  children?: SkillFile[]
}

export interface Skill {
  id: string
  name: string
  description: string
  content: string
  isEnabled: boolean
  path: string
  files: SkillFile[]
  createdAt: string
  updatedAt: string
}
