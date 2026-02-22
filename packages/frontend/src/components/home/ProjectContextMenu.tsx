import { useEffect, useRef } from 'react'
import { Star, Pencil, Archive, Trash2 } from 'lucide-react'

interface ProjectContextMenuProps {
  anchorEl: HTMLElement
  isFavorite: boolean
  showFavorite: boolean
  onToggleFavorite: () => void
  onEditDetails: () => void
  onDelete: () => void
  onClose: () => void
}

export function ProjectContextMenu({
  anchorEl,
  isFavorite,
  showFavorite,
  onToggleFavorite,
  onEditDetails,
  onDelete,
  onClose
}: ProjectContextMenuProps): React.JSX.Element {
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
      {showFavorite && (
        <button
          className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          onClick={onToggleFavorite}
        >
          <Star size={16} fill={isFavorite ? 'currentColor' : 'none'} />
          {isFavorite ? '즐겨찾기 해제' : '즐겨찾기'}
        </button>
      )}
      <button
        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
        onClick={onEditDetails}
      >
        <Pencil size={16} />
        세부사항 수정
      </button>
      <div className="my-1 border-t border-neutral-200 dark:border-neutral-700" />
      <button
        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm opacity-40 cursor-not-allowed"
        disabled
      >
        <Archive size={16} />
        보관
      </button>
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
