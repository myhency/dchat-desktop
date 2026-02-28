import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, rmSync, existsSync } from 'fs'
import { join, resolve, relative, dirname } from 'path'
import { homedir } from 'os'
import AdmZip from 'adm-zip'
import type { Skill, SkillFile } from '../../../../domain/entities/skill'
import type { SkillRepository } from '../../../../domain/ports/outbound/skill.repository'
import type { SettingsRepository } from '../../../../domain/ports/outbound/settings.repository'

interface SkillConfig {
  disabled: string[]
}

const DEFAULT_SKILLS_PATH = join(homedir(), '.dchat', 'skills')
const CONFIG_PATH = join(homedir(), '.dchat', 'skill-config.json')

export class FileSystemSkillRepository implements SkillRepository {
  constructor(private readonly settingsRepo: SettingsRepository) {}

  getSkillsPath(): string {
    return DEFAULT_SKILLS_PATH
  }

  async getResolvedSkillsPath(): Promise<string> {
    const custom = await this.settingsRepo.get('skills_path')
    return custom || DEFAULT_SKILLS_PATH
  }

  async findAll(): Promise<Skill[]> {
    const skillsPath = await this.getResolvedSkillsPath()
    this.ensureDir(skillsPath)

    const entries = this.safeReaddir(skillsPath)
    const skills: Skill[] = []
    const config = this.readConfig()

    for (const entry of entries) {
      const dirPath = join(skillsPath, entry)
      const stat = this.safeStat(dirPath)
      if (!stat || !stat.isDirectory()) continue

      const skillMdPath = join(dirPath, 'SKILL.md')
      if (!existsSync(skillMdPath)) continue

      const skill = this.parseSkillDir(entry, dirPath, config)
      if (skill) skills.push(skill)
    }

    return skills.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  }

  async findById(id: string): Promise<Skill | null> {
    const skillsPath = await this.getResolvedSkillsPath()
    const dirPath = join(skillsPath, id)

    if (!existsSync(dirPath) || !existsSync(join(dirPath, 'SKILL.md'))) {
      return null
    }

    const config = this.readConfig()
    return this.parseSkillDir(id, dirPath, config)
  }

  async findEnabled(): Promise<Skill[]> {
    const all = await this.findAll()
    return all.filter((s) => s.isEnabled)
  }

  async save(skill: Skill): Promise<void> {
    const skillsPath = await this.getResolvedSkillsPath()
    const dirPath = join(skillsPath, skill.id)
    this.ensureDir(dirPath)

    const frontmatter = [
      '---',
      `name: ${skill.name}`,
      `description: ${skill.description}`,
      '---'
    ].join('\n')
    const content = `${frontmatter}\n\n${skill.content}\n`

    writeFileSync(join(dirPath, 'SKILL.md'), content, 'utf-8')

    // Update enabled state
    if (!skill.isEnabled) {
      this.setDisabled(skill.id, true)
    } else {
      this.setDisabled(skill.id, false)
    }
  }

  async delete(id: string): Promise<void> {
    const skillsPath = await this.getResolvedSkillsPath()
    const dirPath = join(skillsPath, id)

    if (existsSync(dirPath)) {
      rmSync(dirPath, { recursive: true, force: true })
    }

    // Clean up config
    this.setDisabled(id, false)
  }

  async deleteAll(): Promise<void> {
    const skillsPath = await this.getResolvedSkillsPath()
    if (existsSync(skillsPath)) {
      const entries = this.safeReaddir(skillsPath)
      for (const entry of entries) {
        const dirPath = join(skillsPath, entry)
        const stat = this.safeStat(dirPath)
        if (stat?.isDirectory() && existsSync(join(dirPath, 'SKILL.md'))) {
          rmSync(dirPath, { recursive: true, force: true })
        }
      }
    }
    // Reset config
    this.writeConfig({ disabled: [] })
  }

  async setEnabled(id: string, enabled: boolean): Promise<void> {
    this.setDisabled(id, !enabled)
  }

  async readFile(skillId: string, relativePath: string): Promise<string> {
    const skillsPath = await this.getResolvedSkillsPath()
    const skillDir = join(skillsPath, skillId)
    const filePath = resolve(skillDir, relativePath)

    // Security: prevent path traversal outside skill directory
    if (!filePath.startsWith(resolve(skillDir))) {
      throw new Error('Access denied: path outside skill directory')
    }

    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${relativePath}`)
    }

    return readFileSync(filePath, 'utf-8')
  }

  async extractArchive(zipBuffer: Buffer): Promise<Skill> {
    const zip = new AdmZip(zipBuffer)
    const entries = zip.getEntries()

    // Find SKILL.md — could be at root or inside a single top-level directory
    let skillMdEntry = entries.find((e) => e.entryName === 'SKILL.md')
    let prefix = ''
    if (!skillMdEntry) {
      // Check for single top-level directory containing SKILL.md
      skillMdEntry = entries.find((e) => e.entryName.match(/^[^/]+\/SKILL\.md$/))
      if (skillMdEntry) {
        prefix = skillMdEntry.entryName.replace(/SKILL\.md$/, '')
      }
    }
    if (!skillMdEntry) {
      throw new Error('SKILL.md 파일을 찾을 수 없습니다')
    }

    const skillMdContent = skillMdEntry.getData().toString('utf-8')
    const { name } = this.parseFrontmatter(skillMdContent)
    const id = this.toSlug(name || 'untitled')

    const skillsPath = await this.getResolvedSkillsPath()
    const dirPath = join(skillsPath, id)

    // Clean existing dir if exists
    if (existsSync(dirPath)) {
      rmSync(dirPath, { recursive: true, force: true })
    }
    this.ensureDir(dirPath)

    // Extract all files, stripping the prefix if present
    for (const entry of entries) {
      if (entry.isDirectory) continue
      let entryPath = entry.entryName
      if (prefix && entryPath.startsWith(prefix)) {
        entryPath = entryPath.slice(prefix.length)
      }
      if (!entryPath) continue

      const targetPath = join(dirPath, entryPath)
      // Security check
      if (!resolve(targetPath).startsWith(resolve(dirPath))) continue

      this.ensureDir(dirname(targetPath))
      writeFileSync(targetPath, entry.getData())
    }

    const skill = await this.findById(id)
    if (!skill) throw new Error('스킬 추출 후 읽기 실패')
    return skill
  }

  async saveFiles(files: { relativePath: string; data: Buffer }[]): Promise<Skill> {
    // Find SKILL.md among files
    const skillMdFile = files.find((f) =>
      f.relativePath === 'SKILL.md' || f.relativePath.endsWith('/SKILL.md')
    )
    if (!skillMdFile) {
      throw new Error('SKILL.md 파일을 찾을 수 없습니다')
    }

    const skillMdContent = skillMdFile.data.toString('utf-8')
    const { name } = this.parseFrontmatter(skillMdContent)
    const id = this.toSlug(name || 'untitled')

    // Detect if files have a common prefix directory (folder upload)
    let prefix = ''
    const firstSlash = skillMdFile.relativePath.indexOf('/')
    if (firstSlash > 0 && skillMdFile.relativePath.endsWith('/SKILL.md')) {
      prefix = skillMdFile.relativePath.slice(0, firstSlash + 1)
    }

    const skillsPath = await this.getResolvedSkillsPath()
    const dirPath = join(skillsPath, id)

    // Clean existing dir if exists
    if (existsSync(dirPath)) {
      rmSync(dirPath, { recursive: true, force: true })
    }
    this.ensureDir(dirPath)

    // Write all files
    for (const file of files) {
      let filePath = file.relativePath
      if (prefix && filePath.startsWith(prefix)) {
        filePath = filePath.slice(prefix.length)
      }
      if (!filePath) continue

      const targetPath = join(dirPath, filePath)
      // Security check
      if (!resolve(targetPath).startsWith(resolve(dirPath))) continue

      this.ensureDir(dirname(targetPath))
      writeFileSync(targetPath, file.data)
    }

    const skill = await this.findById(id)
    if (!skill) throw new Error('스킬 저장 후 읽기 실패')
    return skill
  }

  private toSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      || 'untitled'
  }

  // ── Private helpers ──

  private parseSkillDir(id: string, dirPath: string, config: SkillConfig): Skill | null {
    const skillMdPath = join(dirPath, 'SKILL.md')

    try {
      const raw = readFileSync(skillMdPath, 'utf-8')
      const { name, description, content } = this.parseFrontmatter(raw)
      const dirStat = statSync(dirPath)
      const fileStat = statSync(skillMdPath)
      const files = this.buildFileTree(dirPath, dirPath)

      return {
        id,
        name: name || id,
        description: description || '',
        content,
        isEnabled: !config.disabled.includes(id),
        path: dirPath,
        files,
        createdAt: dirStat.birthtime,
        updatedAt: fileStat.mtime
      }
    } catch {
      return null
    }
  }

  private parseFrontmatter(raw: string): { name: string; description: string; content: string } {
    const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/)
    if (match) {
      const frontmatter = match[1]
      const body = match[2].trim()
      const nameMatch = frontmatter.match(/^name:\s*(.+)$/m)
      const descMatch = frontmatter.match(/^description:\s*(.+)$/m)
      return {
        name: nameMatch?.[1]?.trim() || '',
        description: descMatch?.[1]?.trim() || '',
        content: body
      }
    }
    // No frontmatter — use first heading as name
    const headingMatch = raw.match(/^#\s+(.+)$/m)
    return {
      name: headingMatch?.[1]?.trim() || '',
      description: '',
      content: raw.trim()
    }
  }

  private buildFileTree(baseDir: string, currentDir: string): SkillFile[] {
    const entries = this.safeReaddir(currentDir)
    const result: SkillFile[] = []

    for (const entry of entries.sort()) {
      const fullPath = join(currentDir, entry)
      const stat = this.safeStat(fullPath)
      if (!stat) continue

      const relativePath = relative(baseDir, fullPath)
      if (stat.isDirectory()) {
        result.push({
          name: entry,
          relativePath,
          isDirectory: true,
          children: this.buildFileTree(baseDir, fullPath)
        })
      } else {
        result.push({
          name: entry,
          relativePath,
          isDirectory: false
        })
      }
    }

    return result
  }

  private readConfig(): SkillConfig {
    try {
      const raw = readFileSync(CONFIG_PATH, 'utf-8')
      const parsed = JSON.parse(raw) as Partial<SkillConfig>
      return { disabled: Array.isArray(parsed.disabled) ? parsed.disabled : [] }
    } catch {
      return { disabled: [] }
    }
  }

  private writeConfig(config: SkillConfig): void {
    this.ensureDir(join(homedir(), '.dchat'))
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', 'utf-8')
  }

  private setDisabled(id: string, disabled: boolean): void {
    const config = this.readConfig()
    const idx = config.disabled.indexOf(id)
    if (disabled && idx === -1) {
      config.disabled.push(id)
    } else if (!disabled && idx !== -1) {
      config.disabled.splice(idx, 1)
    }
    this.writeConfig(config)
  }

  private ensureDir(dirPath: string): void {
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true })
    }
  }

  private safeReaddir(dirPath: string): string[] {
    try {
      return readdirSync(dirPath)
    } catch {
      return []
    }
  }

  private safeStat(filePath: string): ReturnType<typeof statSync> | null {
    try {
      return statSync(filePath)
    } catch {
      return null
    }
  }
}
