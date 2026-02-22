import { useEffect, useRef, useState } from 'react'
import { Settings, Info, ChevronRight, ExternalLink, LogOut } from 'lucide-react'

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
  const [showLearnMore, setShowLearnMore] = useState(false)

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
      style={{ bottom: window.innerHeight - rect.top + 4, left: rect.left + (rect.width - 240) / 2 }}
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
        <Settings size={16} className="text-neutral-500 dark:text-neutral-400" />
        <span className="flex-1 text-left">설정</span>
        <span className="text-xs text-neutral-400 dark:text-neutral-500">&#x2318;,</span>
      </button>

      {/* 자세히 알아보기 */}
      <div
        onMouseEnter={() => setShowLearnMore(true)}
        onMouseLeave={() => setShowLearnMore(false)}
      >
      <button
        className={`flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors ${
          showLearnMore
            ? 'bg-neutral-100 dark:bg-neutral-700'
            : 'hover:bg-neutral-100 dark:hover:bg-neutral-700'
        }`}
      >
        <Info size={16} className="text-neutral-500 dark:text-neutral-400" />
        <span className="flex-1 text-left">자세히 알아보기</span>
        <ChevronRight size={14} className="text-neutral-400 dark:text-neutral-500" />
      </button>

      {/* 자세히 알아보기 서브메뉴 */}
      {showLearnMore && (
        <div
          className="fixed z-50 bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 w-[200px]"
          style={{
            bottom: window.innerHeight - rect.top - rect.height,
            left: rect.left + (rect.width - 240) / 2 + 240 + 4
          }}
        >
          {[
            { label: 'API 콘솔', url: '#' },
            { label: 'D Chat에 대하여', url: '#' },
            { label: '튜토리얼', url: '#' }
          ].map((item) => (
            <button
              key={item.label}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              onClick={() => {
                window.open(item.url)
                onClose()
              }}
            >
              <span className="flex-1 text-left">{item.label}</span>
              <ExternalLink size={14} className="text-neutral-400 dark:text-neutral-500" />
            </button>
          ))}

          <div className="h-px bg-neutral-200 dark:bg-neutral-700 mx-1" />

          {[
            { label: '이용 정책', url: '#' },
            { label: '개인정보 처리방침', url: '#' }
          ].map((item) => (
            <button
              key={item.label}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              onClick={() => {
                window.open(item.url)
                onClose()
              }}
            >
              <span className="flex-1 text-left">{item.label}</span>
              <ExternalLink size={14} className="text-neutral-400 dark:text-neutral-500" />
            </button>
          ))}
        </div>
      )}
      </div>

      <div className="h-px bg-neutral-200 dark:bg-neutral-700 mx-1" />

      {/* 로그아웃 */}
      <button
        className="flex w-full items-center gap-3 px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
        onClick={onClose}
      >
        <LogOut size={16} className="text-neutral-500 dark:text-neutral-400" />
        <span className="flex-1 text-left">로그아웃</span>
      </button>
    </div>
  )
}
