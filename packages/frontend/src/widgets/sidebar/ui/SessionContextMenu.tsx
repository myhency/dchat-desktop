import { useEffect, useRef } from 'react'
import { Star, Pencil, FolderPlus, FolderSync, FolderMinus, Trash2 } from 'lucide-react'

interface SessionContextMenuProps {
  anchorEl: HTMLElement
  isFavorite: boolean
  projectId: string | null
  onToggleFavorite: () => void
  onRename: () => void
  onMoveToProject: () => void
  onRemoveFromProject: () => void
  onDelete: () => void
  onClose: () => void
}

export function SessionContextMenu({
  anchorEl,
  isFavorite,
  projectId,
  onToggleFavorite,
  onRename,
  onMoveToProject,
  onRemoveFromProject,
  onDelete,
  onClose
}: SessionContextMenuProps): React.JSX.Element {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [onClose])

  const rect = anchorEl.getBoundingClientRect()

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 min-w-[180px]"
      style={{ top: rect.bottom + 4, left: rect.left }}
    >
      <button
        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
        onClick={onToggleFavorite}
      >
        <Star size={16} fill={isFavorite ? 'currentColor' : 'none'} />
        {isFavorite ? '즐겨찾기 해제' : '즐겨찾기'}
      </button>
      <button
        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
        onClick={onRename}
      >
        <Pencil size={16} />
        이름 변경
      </button>
      {projectId === null ? (
        <button
          className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          onClick={onMoveToProject}
        >
          <FolderPlus size={16} />
          프로젝트에 추가
        </button>
      ) : (
        <>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            onClick={onMoveToProject}
          >
            <FolderSync size={16} />
            프로젝트 변경
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            onClick={onRemoveFromProject}
          >
            <FolderMinus size={16} />
            프로젝트에서 제거
          </button>
          <hr className="my-1 border-neutral-200 dark:border-neutral-700" />
        </>
      )}
      <button
        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-red-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
        onClick={onDelete}
      >
        <Trash2 size={16} />
        삭제
      </button>
    </div>
  )
}
