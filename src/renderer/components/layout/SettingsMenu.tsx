import { useEffect, useRef } from 'react'

interface SettingsMenuProps {
  anchorEl: HTMLElement
  onSettings: () => void
  onClose: () => void
}

export function SettingsMenu({
  anchorEl,
  onSettings,
  onClose
}: SettingsMenuProps): React.JSX.Element {
  const menuRef = useRef<HTMLDivElement>(null)

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
      {/* 이메일 */}
      <div className="px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 truncate">
        user@example.com
      </div>

      <div className="h-px bg-neutral-200 dark:bg-neutral-700 mx-1" />

      {/* 설정 */}
      <button
        className="flex w-full items-center gap-3 px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
        onClick={() => {
          onSettings()
          onClose()
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-neutral-500 dark:text-neutral-400"
        >
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <span className="flex-1 text-left">설정</span>
        <span className="text-xs text-neutral-400 dark:text-neutral-500">⌘,</span>
      </button>

      {/* 자세히 알아보기 */}
      <button
        className="flex w-full items-center gap-3 px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
        onClick={onClose}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-neutral-500 dark:text-neutral-400"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
        <span className="flex-1 text-left">자세히 알아보기</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-neutral-400 dark:text-neutral-500"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>

      <div className="h-px bg-neutral-200 dark:bg-neutral-700 mx-1" />

      {/* 로그아웃 */}
      <button
        className="flex w-full items-center gap-3 px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
        onClick={onClose}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-neutral-500 dark:text-neutral-400"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        <span className="flex-1 text-left">로그아웃</span>
      </button>
    </div>
  )
}
