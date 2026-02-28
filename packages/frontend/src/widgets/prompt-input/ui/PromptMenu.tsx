import { useEffect, useRef, useState } from 'react'
import { Paperclip, FolderOpen, Folder, Globe, Blocks, ChevronRight, Check } from 'lucide-react'
import { pickImage } from '@/shared/lib/native'
import type { ImageAttachment } from '@/entities/session'
import { useProjectStore } from '@/entities/project'

interface PromptMenuProps {
  anchorEl: HTMLElement
  onClose: () => void
  onAttach?: (attachments: ImageAttachment[]) => void
  onProjectSelect?: (projectId: string, projectName: string) => void
}

export function PromptMenu({ anchorEl, onClose, onAttach, onProjectSelect }: PromptMenuProps): React.JSX.Element {
  const menuRef = useRef<HTMLDivElement>(null)
  const projectItemRef = useRef<HTMLDivElement>(null)
  const [webSearchEnabled, setWebSearchEnabled] = useState(false)
  const [showProjects, setShowProjects] = useState(false)
  const projects = useProjectStore((s) => s.projects)

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !anchorEl.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [onClose, anchorEl])

  const rect = anchorEl.getBoundingClientRect()

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 w-[240px]"
      style={{ bottom: window.innerHeight - rect.top + 4, left: rect.left }}
    >
      {/* 파일 또는 사진 추가 */}
      <button
        className="flex w-full items-center gap-3 px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
        onClick={async () => {
          onClose()
          const picked = await pickImage()
          if (picked?.length) onAttach?.(picked)
        }}
      >
        <Paperclip size={16} className="text-neutral-500 dark:text-neutral-400" />
        <span className="flex-1 text-left">파일 또는 사진 추가</span>
      </button>

      {/* 프로젝트에 추가 */}
      <div
        ref={projectItemRef}
        onMouseEnter={() => setShowProjects(true)}
        onMouseLeave={() => setShowProjects(false)}
      >
        <button
          className={`flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors ${
            showProjects
              ? 'bg-neutral-100 dark:bg-neutral-700'
              : 'hover:bg-neutral-100 dark:hover:bg-neutral-700'
          }`}
        >
          <FolderOpen size={16} className="text-neutral-500 dark:text-neutral-400" />
          <span className="flex-1 text-left">프로젝트에 추가</span>
          <ChevronRight size={14} className="text-neutral-400 dark:text-neutral-500" />
        </button>

        {showProjects && (() => {
          const itemRect = projectItemRef.current?.getBoundingClientRect()
          if (!itemRect) return null
          return (
            <div
              className="fixed z-50 bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 w-[200px] max-h-[240px] overflow-y-auto"
              style={{ top: itemRect.top, left: itemRect.right + 4 }}
            >
              {projects.length === 0 ? (
                <div className="px-4 py-3 text-sm text-neutral-400">
                  프로젝트가 없습니다
                </div>
              ) : (
                projects.map((project) => (
                  <button
                    key={project.id}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                    onClick={() => {
                      onProjectSelect?.(project.id, project.name)
                      onClose()
                    }}
                  >
                    <Folder size={16} className="text-neutral-400" />
                    <span className="flex-1 text-left truncate">{project.name}</span>
                  </button>
                ))
              )}
            </div>
          )
        })()}
      </div>

      <div className="h-px bg-neutral-200 dark:bg-neutral-700 mx-1" />

      {/* 웹 검색 */}
      <button
        className="flex w-full items-center gap-3 px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
        onClick={() => setWebSearchEnabled((prev) => !prev)}
      >
        <Globe
          size={16}
          className={webSearchEnabled ? 'text-blue-500' : 'text-neutral-500 dark:text-neutral-400'}
        />
        <span
          className={`flex-1 text-left ${webSearchEnabled ? 'text-blue-500' : ''}`}
        >
          웹 검색
        </span>
        {webSearchEnabled && <Check size={14} className="text-blue-500" />}
      </button>

      {/* 커넥터 */}
      <button
        className="flex w-full items-center gap-3 px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
        onClick={onClose}
      >
        <Blocks size={16} className="text-neutral-500 dark:text-neutral-400" />
        <span className="flex-1 text-left">커넥터</span>
        <ChevronRight size={14} className="text-neutral-400 dark:text-neutral-500" />
      </button>
    </div>
  )
}
