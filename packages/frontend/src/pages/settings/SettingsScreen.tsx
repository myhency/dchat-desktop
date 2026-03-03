import { useState, useRef, useEffect, useCallback } from 'react'
import { X, ChevronDown, ChevronRight, Shield, ExternalLink, RefreshCw, Eye, EyeOff, Loader2, Check, Upload, Download, Trash2, Play, Square, RotateCw, FileText, FolderOpen, Search, Brain, Plus, MoreHorizontal, ChevronLeft, AlertTriangle, ArrowRight, Terminal, CircleCheck, Hand, Ban, Pencil, Zap, Sparkles, FileUp, File, Folder } from 'lucide-react'
import { useSettingsStore, settingsApi, memoryApi } from '@/entities/settings'
import { useSkillStore } from '@/entities/skill'
import type { Skill, SkillFile } from '@dchat/shared'
import { useSessionStore } from '@/entities/session'
import { useMcpStore, mcpApi } from '@/entities/mcp'
import { backupApi } from '@/entities/settings/api/backup.api'
import { openFile, pickDirectory } from '@/shared/lib/native'
import { formatRelativeTime } from '@/shared/lib/time'

type Tab =
  | 'general-top'
  | 'privacy'
  | 'usage'
  | 'features'
  | 'customization'
  | 'connectors'
  | 'general'
  | 'extensions'
  | 'developer'

const TABS: { section?: string; id: Tab; label: string }[] = [
  { id: 'general-top', label: '일반' },
  { id: 'privacy', label: '개인정보보호' },
  { id: 'usage', label: '사용량' },
  { id: 'features', label: '기능' },
  { id: 'customization', label: '사용자 지정' },
  { id: 'connectors', label: '연결' },
  { section: '데스크톱 앱', id: 'general', label: '일반' },
  { id: 'extensions', label: '확장 프로그램' },
  { id: 'developer', label: '개발자' }
]

const ROLES = [
  '제품 관리',
  '엔지니어링',
  '인사 관리',
  '재무',
  '마케팅',
  '영업',
  '운영',
  '데이터 사이언스',
  '디자인',
  '법무',
  '기타'
]

function Toggle({
  checked,
  onChange
}: {
  checked: boolean
  onChange: (v: boolean) => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-neutral-300 dark:bg-neutral-600'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  )
}

function RoleDropdown({
  value,
  onChange
}: {
  value: string
  onChange: (v: string) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const display = value || '직무를 선택해 주세요'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
      >
        <span className={value ? '' : 'text-neutral-400 dark:text-neutral-500'}>{display}</span>
        <ChevronDown size={12} className={`shrink-0 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 shadow-lg max-h-60 overflow-y-auto">
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false) }}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-600 ${
              !value ? 'bg-neutral-100 dark:bg-neutral-600' : ''
            }`}
          >
            직무를 선택해 주세요
          </button>
          {ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => { onChange(r); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-600 ${
                value === r ? 'bg-neutral-100 dark:bg-neutral-600' : ''
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ShortcutSelect({
  value,
  onChange,
  options
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Map custom:... values to the 'custom' option for display
  const matchValue = value.startsWith('custom') ? 'custom' : value
  const display = options.find((o) => o.value === matchValue)?.label ?? value

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="min-w-[180px] flex items-center justify-between rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary-500"
      >
        <span>{display}</span>
        <ChevronDown size={12} className={`shrink-0 ml-2 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 min-w-[180px] rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 shadow-lg overflow-hidden">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-600 ${
                matchValue === o.value ? 'bg-neutral-100 dark:bg-neutral-600' : ''
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const isMac = navigator.platform.startsWith('Mac')

const QUICK_ACCESS_OPTIONS = isMac
  ? [
      { value: 'double-option', label: 'Option 키 두 번 누르기' },
      { value: 'option-space', label: 'Option+Space' },
      { value: 'custom', label: '사용자 설정...' },
      { value: 'none', label: '단축키 없음' }
    ]
  : [
      { value: 'double-option', label: 'Alt 키 두 번 누르기' },
      { value: 'option-space', label: 'Ctrl+Space' },
      { value: 'custom', label: '사용자 설정...' },
      { value: 'none', label: '단축키 없음' }
    ]

/** Convert browser KeyboardEvent key/code to Electron accelerator key name */
function normalizeKeyName(key: string, code: string): string | null {
  // Ignore standalone modifier keys
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) return null

  const codeMap: Record<string, string> = {
    Space: 'Space', Backspace: 'Backspace', Delete: 'Delete',
    Enter: 'Return', Tab: 'Tab', Escape: 'Escape',
    ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
    Home: 'Home', End: 'End', PageUp: 'PageUp', PageDown: 'PageDown'
  }
  if (codeMap[code]) return codeMap[code]

  // F-keys
  const fMatch = code.match(/^F(\d+)$/)
  if (fMatch) return code

  // Letter keys (use code to get the physical key regardless of layout)
  const letterMatch = code.match(/^Key([A-Z])$/)
  if (letterMatch) return letterMatch[1]

  // Digit keys
  const digitMatch = code.match(/^Digit(\d)$/)
  if (digitMatch) return digitMatch[1]

  // Numpad
  if (code.startsWith('Numpad')) {
    const num = code.replace('Numpad', 'num')
    return num
  }

  // Symbols — use the key directly if printable
  if (key.length === 1) return key.toUpperCase()

  return null
}

/** Convert Electron accelerator string to display symbols */
function acceleratorToDisplay(accelerator: string): string {
  if (isMac) {
    const modMap: Record<string, string> = {
      Command: '\u2318',
      Cmd: '\u2318',
      Control: '\u2303',
      Ctrl: '\u2303',
      Alt: '\u2325',
      Option: '\u2325',
      Shift: '\u21E7'
    }
    const parts = accelerator.split('+')
    return parts.map((p) => modMap[p] ?? p).join('')
  }
  // Windows/Linux: keep text labels joined with "+"
  return accelerator
}

function ShortcutRecorder({
  value,
  onChange
}: {
  value: string // full store value like 'custom:Shift+Command+Space' or 'custom'
  onChange: (v: string) => void
}): React.JSX.Element {
  const [recording, setRecording] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const accelerator = value.startsWith('custom:') ? value.slice('custom:'.length) : ''
  const display = accelerator ? acceleratorToDisplay(accelerator) : ''

  // Auto-start recording when mounted without an accelerator
  useEffect(() => {
    if (!accelerator) {
      setRecording(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Focus container when recording starts
  useEffect(() => {
    if (recording) {
      ref.current?.focus()
    }
  }, [recording])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()

      if (e.key === 'Escape') {
        setRecording(false)
        return
      }

      const keyName = normalizeKeyName(e.key, e.code)
      if (!keyName) return // modifier-only press, wait for full combo

      // Require at least one modifier
      if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) return

      const parts: string[] = []
      if (e.ctrlKey) parts.push('Control')
      if (e.altKey) parts.push('Alt')
      if (e.shiftKey) parts.push('Shift')
      if (e.metaKey) parts.push('Command')
      parts.push(keyName)

      const acc = parts.join('+')
      onChange(`custom:${acc}`)
      setRecording(false)
    },
    [onChange]
  )

  // Close recording on outside click
  useEffect(() => {
    if (!recording) return
    const handler = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setRecording(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [recording])

  const handleClear = (): void => {
    onChange('custom')
    setRecording(false)
  }

  return (
    <div
      ref={ref}
      className="flex items-center gap-2 outline-none"
      tabIndex={-1}
      onKeyDown={recording ? handleKeyDown : undefined}
    >
      <button
        type="button"
        onClick={() => setRecording(true)}
        className={`flex items-center gap-2 min-w-[180px] rounded-lg border px-3 py-1.5 text-sm outline-none transition-colors ${
          recording
            ? 'border-primary-500 ring-2 ring-primary-500/30 bg-white dark:bg-neutral-700'
            : 'border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700'
        }`}
      >
        {recording ? (
          <span className="text-neutral-400 dark:text-neutral-500 animate-pulse">키 조합을 누르세요...</span>
        ) : display ? (
          <span className="font-mono tracking-wider">{display}</span>
        ) : (
          <span className="text-neutral-400 dark:text-neutral-500">단축키 기록</span>
        )}
      </button>
      {accelerator && (
        <button
          type="button"
          onClick={handleClear}
          className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}

function GeneralContent(): React.JSX.Element {
  const launchAtStartup = useSettingsStore((s) => s.launchAtStartup)
  const quickAccessShortcut = useSettingsStore((s) => s.quickAccessShortcut)
  const showInMenuBar = useSettingsStore((s) => s.showInMenuBar)
  const setLaunchAtStartup = useSettingsStore((s) => s.setLaunchAtStartup)
  const setQuickAccessShortcut = useSettingsStore((s) => s.setQuickAccessShortcut)
  const setShowInMenuBar = useSettingsStore((s) => s.setShowInMenuBar)

  const isCustom = quickAccessShortcut === 'custom' || quickAccessShortcut.startsWith('custom:')

  return (
    <div>
      <h3 className="text-base font-semibold mb-6">일반 데스크톱 설정</h3>

      <div className="flex items-center justify-between py-4">
        <div>
          <div className="text-sm font-medium">시작 시 실행</div>
          <div className="text-sm text-neutral-500 dark:text-neutral-400">컴퓨터에 로그인할 때 D Chat을 자동으로 시작합니다</div>
        </div>
        <Toggle checked={launchAtStartup} onChange={setLaunchAtStartup} />
      </div>

      <div className="py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">빠른 액세스 바로가기</div>
            <div className="text-sm text-neutral-500 dark:text-neutral-400">데스크톱 어디서나 D Chat에게 메시지 보내기</div>
          </div>
          <ShortcutSelect value={quickAccessShortcut} onChange={setQuickAccessShortcut} options={QUICK_ACCESS_OPTIONS} />
        </div>
        {isCustom && (
          <div className="mt-3 flex justify-end">
            <ShortcutRecorder value={quickAccessShortcut} onChange={setQuickAccessShortcut} />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between py-4">
        <div>
          <div className="text-sm font-medium">메뉴 바</div>
          <div className="text-sm text-neutral-500 dark:text-neutral-400">메뉴 막대에 D Chat 표시</div>
        </div>
        <Toggle checked={showInMenuBar} onChange={setShowInMenuBar} />
      </div>
    </div>
  )
}

function GeneralTopContent(): React.JSX.Element {
  const fullName = useSettingsStore((s) => s.fullName)
  const nickname = useSettingsStore((s) => s.nickname)
  const role = useSettingsStore((s) => s.role)
  const customInstructions = useSettingsStore((s) => s.customInstructions)
  const responseNotif = useSettingsStore((s) => s.responseNotif)
  const colorMode = useSettingsStore((s) => s.colorMode)
  const setFullName = useSettingsStore((s) => s.setFullName)
  const setNickname = useSettingsStore((s) => s.setNickname)
  const setRole = useSettingsStore((s) => s.setRole)
  const setCustomInstructions = useSettingsStore((s) => s.setCustomInstructions)
  const setResponseNotif = useSettingsStore((s) => s.setResponseNotif)
  const setColorMode = useSettingsStore((s) => s.setColorMode)

  const initials = fullName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="space-y-10">
      {/* 섹션 A: 프로필 */}
      <section>
        <h3 className="text-sm font-semibold mb-4">프로필</h3>

        {/* 성명 + 닉네임 2열 */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-neutral-600 dark:text-neutral-400 mb-1.5">
              성명
            </label>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 rounded-full bg-neutral-700 text-white flex items-center justify-center text-sm font-medium">
                {initials || '?'}
              </div>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-neutral-600 dark:text-neutral-400 mb-1.5">
              D Chat이 어떻게 불러드릴까요?
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* 직무 드롭다운 */}
        <div className="mb-4">
          <label className="block text-sm text-neutral-600 dark:text-neutral-400 mb-1.5">
            귀하의 업무를 가장 잘 설명하는 것은 무엇입니까?
          </label>
          <RoleDropdown value={role} onChange={setRole} />
        </div>

        {/* 맞춤 설정 textarea */}
        <div>
          <label className="block text-sm text-neutral-600 dark:text-neutral-400 mb-1">
            D Chat이 응답에서 고려해야 할 개인 맞춤 설정은 무엇인가요?
          </label>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
            귀하의 맞춤 설정은 모든 대화에 적용됩니다.
          </p>
          <textarea
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="예시: 설명을 간단명료하게 유지"
            rows={4}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
        </div>
      </section>

      {/* 섹션 B: 알림 */}
      <section>
        <h3 className="text-sm font-semibold mb-4">알림</h3>
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">응답 완료</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                응답이 완료되면 알림을 받습니다. 장시간 실행되는 작업에 유용합니다.
              </p>
            </div>
            <Toggle checked={responseNotif} onChange={setResponseNotif} />
          </div>
        </div>
      </section>

      {/* 섹션 C: 모양 */}
      <section>
        <h3 className="text-sm font-semibold mb-4">모양</h3>

        {/* 색상 모드 */}
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">색상 모드</p>
        <div className="grid grid-cols-3 gap-3">
          {([
            { id: 'light' as const, label: '기본', bg: 'bg-white', bar: 'bg-neutral-200', text: 'bg-neutral-300' },
            { id: 'auto' as const, label: '자동', bg: 'bg-gradient-to-r from-white to-neutral-800', bar: 'bg-neutral-400', text: 'bg-neutral-400' },
            { id: 'dark' as const, label: '다크', bg: 'bg-neutral-800', bar: 'bg-neutral-600', text: 'bg-neutral-500' }
          ]).map((mode) => (
            <button
              key={mode.id}
              onClick={() => setColorMode(mode.id)}
              className={`rounded-lg border-2 p-1 transition-colors ${
                colorMode === mode.id
                  ? 'border-primary-500'
                  : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
              }`}
            >
              <div className={`${mode.bg} rounded-md p-2.5 h-16 flex flex-col justify-between`}>
                <div className={`${mode.bar} h-1.5 w-8 rounded-full`} />
                <div className="space-y-1">
                  <div className={`${mode.text} h-1 w-full rounded-full`} />
                  <div className={`${mode.text} h-1 w-3/4 rounded-full`} />
                </div>
              </div>
              <p className="text-xs text-center mt-1.5 pb-0.5">{mode.label}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

function UsageContent(): React.JSX.Element {
  const [overageEnabled, setOverageEnabled] = useState(false)

  return (
    <div className="space-y-6">
      {/* 섹션 A: 플랜 사용량 한도 */}
      <section>
        <h3 className="text-base font-semibold mb-4">플랜 사용량 한도</h3>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm">현재 세션</span>
            <span className="text-sm text-neutral-500">8% 사용됨</span>
          </div>
          <div className="h-2 rounded-full bg-neutral-200 dark:bg-neutral-700">
            <div className="h-full rounded-full bg-primary-500" style={{ width: '8%' }} />
          </div>
          <p className="text-xs text-neutral-500 mt-1">4시간 3분 후 재설정</p>
        </div>
      </section>

      {/* 섹션 B: 주간 한도 */}
      <section>
        <h3 className="text-base font-semibold mb-2">주간 한도</h3>
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="text-sm text-primary dark:text-primary-400 underline mb-4 inline-block"
        >
          사용량 한도에 대해 자세히 알아보기
        </a>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm">모든 모델</span>
            <span className="text-sm text-neutral-500">5% 사용됨</span>
          </div>
          <div className="h-2 rounded-full bg-neutral-200 dark:bg-neutral-700">
            <div className="h-full rounded-full bg-primary-500" style={{ width: '5%' }} />
          </div>
          <p className="text-xs text-neutral-500 mt-1">(목) 오후 10:00에 재설정</p>
        </div>
        <div className="flex items-center gap-1.5 mt-3 text-xs text-neutral-500">
          <span>마지막 업데이트: 1분 전</span>
          <button type="button" className="hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors">
            <RefreshCw size={12} />
          </button>
        </div>
      </section>

      <hr className="border-neutral-200 dark:border-neutral-700" />

      {/* 섹션 C: 추가 사용량 */}
      <section>
        <h3 className="text-base font-semibold mb-2">추가 사용량</h3>
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            사용량 한도에 도달하면 D Chat이 자동으로 추가 사용량을 활성화합니다.
            추가 사용량은 별도로 청구됩니다.
          </p>
          <Toggle checked={overageEnabled} onChange={setOverageEnabled} />
        </div>
      </section>
    </div>
  )
}

function PrivacyContent(): React.JSX.Element {
  const loadSettings = useSettingsStore((s) => s.loadSettings)
  const loadSessions = useSessionStore((s) => s.loadSessions)
  const [exportStatus, setExportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState('')

  const handleExport = async (): Promise<void> => {
    setExportStatus('loading')
    setStatusMessage('')
    try {
      const data = await backupApi.exportBackup()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dchat-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setExportStatus('success')
      setStatusMessage('백업 파일이 다운로드되었습니다')
      setTimeout(() => { setExportStatus('idle'); setStatusMessage('') }, 3000)
    } catch (err) {
      setExportStatus('error')
      setStatusMessage(err instanceof Error ? err.message : '내보내기 실패')
      setTimeout(() => { setExportStatus('idle'); setStatusMessage('') }, 5000)
    }
  }

  const handleImport = (): void => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return

      if (!window.confirm('기존 데이터가 모두 삭제됩니다. 계속하시겠습니까?')) return

      setImportStatus('loading')
      setStatusMessage('')
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        await backupApi.importBackup(data)
        await loadSettings()
        await loadSessions()
        setImportStatus('success')
        setStatusMessage('데이터가 복구되었습니다')
        setTimeout(() => { setImportStatus('idle'); setStatusMessage('') }, 3000)
      } catch (err) {
        setImportStatus('error')
        setStatusMessage(err instanceof Error ? err.message : '가져오기 실패')
        setTimeout(() => { setImportStatus('idle'); setStatusMessage('') }, 5000)
      }
    }
    input.click()
  }

  return (
    <div>
      {/* 헤더 영역 */}
      <div className="flex items-center gap-2 mb-1">
        <Shield size={20} className="text-neutral-700 dark:text-neutral-300" />
        <h2 className="text-base font-semibold">개인정보보호</h2>
      </div>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">
        D Chat은 투명한 데이터 처리 방침을 지향합니다
      </p>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
        D Chat 사용 시 귀하의 정보가 어떻게 보호되는지 알아보시고, 자세한 내용은{' '}
        <span className="font-semibold text-neutral-900 dark:text-neutral-100">개인정보 보호 센터</span> 및{' '}
        <span className="font-semibold text-neutral-900 dark:text-neutral-100">개인정보처리방침</span>를 참조하세요.
      </p>

      <hr className="border-neutral-200 dark:border-neutral-700 mb-6" />

      {/* 프라이버시 설정 */}
      <h3 className="text-sm font-semibold mb-4">프라이버시 설정</h3>
      <div className="space-y-4">
        {/* 데이터 내보내기 */}
        <div className="flex items-center justify-between">
          <span className="text-sm">데이터 내보내기</span>
          <button
            type="button"
            disabled={exportStatus === 'loading'}
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-600 px-3 py-1.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            {exportStatus === 'loading' ? (
              <><Loader2 size={14} className="animate-spin" /> 내보내는 중...</>
            ) : (
              <><Download size={14} /> 데이터 내보내기</>
            )}
          </button>
        </div>

        {/* 데이터 가져오기 */}
        <div className="flex items-center justify-between">
          <span className="text-sm">데이터 가져오기</span>
          <button
            type="button"
            disabled={importStatus === 'loading'}
            onClick={handleImport}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-600 px-3 py-1.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            {importStatus === 'loading' ? (
              <><Loader2 size={14} className="animate-spin" /> 가져오는 중...</>
            ) : (
              <><Upload size={14} /> 데이터 가져오기</>
            )}
          </button>
        </div>

        {/* 상태 메시지 */}
        {statusMessage && (
          <p className={`text-xs ${
            exportStatus === 'error' || importStatus === 'error'
              ? 'text-red-500'
              : 'text-green-500'
          }`}>
            {statusMessage}
          </p>
        )}

        {/* 메모리 설정 */}
        <div className="flex items-center justify-between">
          <span className="text-sm">메모리 설정</span>
          <button
            type="button"
            onClick={() => {}}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-600 px-3 py-1.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            관리
            <ExternalLink size={12} />
          </button>
        </div>

      </div>
    </div>
  )
}

/* ── 모델 목록 (프로바이더별 그룹) ── */

const PROVIDER_MODELS: { provider: string; models: { id: string; label: string }[] }[] = [
  {
    provider: 'Anthropic',
    models: [
      { id: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
      { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
      { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' }
    ]
  },
  {
    provider: 'OpenAI',
    models: [
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini' }
    ]
  }
]

function ModelDropdown({
  value,
  onChange,
  anthropicKey,
  openaiKey
}: {
  value: string
  onChange: (v: string) => void
  anthropicKey: string
  openaiKey: string
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const availableGroups = PROVIDER_MODELS.filter((g) => {
    if (g.provider === 'Anthropic') return !!anthropicKey
    if (g.provider === 'OpenAI') return !!openaiKey
    return false
  })

  const allModels = availableGroups.flatMap((g) => g.models)
  const currentLabel = allModels.find((m) => m.id === value)?.label
    ?? PROVIDER_MODELS.flatMap((g) => g.models).find((m) => m.id === value)?.label
    ?? value

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
      >
        <span>{currentLabel}</span>
        <ChevronDown size={12} className={`shrink-0 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 shadow-lg max-h-60 overflow-y-auto">
          {availableGroups.length === 0 && (
            <div className="px-3 py-2 text-sm text-neutral-400">API 키를 설정하세요</div>
          )}
          {availableGroups.map((group) => (
            <div key={group.provider}>
              <div className="px-3 pt-2 pb-1 text-xs text-neutral-500 font-medium">{group.provider}</div>
              {group.models.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { onChange(m.id); setOpen(false) }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-600 ${
                    value === m.id ? 'bg-neutral-100 dark:bg-neutral-600' : ''
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ProviderCard({
  name,
  provider,
  apiKey,
  baseUrl,
  baseUrlPlaceholder,
  verified,
  onApiKeyChange,
  onBaseUrlChange,
  onVerified
}: {
  name: string
  provider: 'anthropic' | 'openai'
  apiKey: string
  baseUrl: string
  baseUrlPlaceholder: string
  verified: boolean
  onApiKeyChange: (key: string) => void
  onBaseUrlChange: (url: string) => void
  onVerified: () => void
}): React.JSX.Element {
  const [showKey, setShowKey] = useState(false)
  const [localKey, setLocalKey] = useState(apiKey)
  const [localBaseUrl, setLocalBaseUrl] = useState(baseUrl)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testError, setTestError] = useState('')
  const hasKey = !!apiKey

  // Sync local state when store value changes externally
  useEffect(() => { setLocalKey(apiKey) }, [apiKey])
  useEffect(() => { setLocalBaseUrl(baseUrl) }, [baseUrl])

  const handleTestConnection = async (): Promise<void> => {
    setTestStatus('testing')
    setTestError('')
    try {
      await settingsApi.testConnection(provider)
      setTestStatus('success')
      onVerified()
      setTimeout(() => setTestStatus('idle'), 3000)
    } catch (err) {
      const message = err instanceof Error ? err.message : '연결 실패'
      setTestError(message)
      setTestStatus('error')
      setTimeout(() => setTestStatus('idle'), 5000)
    }
  }

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold">{name}</h4>
        <span className={`flex items-center gap-1.5 text-xs ${
          !hasKey ? 'text-neutral-400' : verified ? 'text-green-500' : 'text-amber-500'
        }`}>
          <span className="text-[10px]">{hasKey && verified ? '\u25CF' : '\u25CB'}</span>
          {!hasKey ? '미설정' : verified ? '연결됨' : '미확인'}
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm text-neutral-600 dark:text-neutral-400 mb-1.5">API 키</label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={localKey}
              onChange={(e) => setLocalKey(e.target.value)}
              onBlur={() => { if (localKey !== apiKey) onApiKeyChange(localKey) }}
              placeholder="API 키를 입력하세요"
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 pr-9 text-sm outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm text-neutral-600 dark:text-neutral-400 mb-1.5">Base URL</label>
          <input
            type="text"
            value={localBaseUrl}
            onChange={(e) => setLocalBaseUrl(e.target.value)}
            onBlur={() => { if (localBaseUrl !== baseUrl) onBaseUrlChange(localBaseUrl) }}
            placeholder={baseUrlPlaceholder}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {hasKey && (
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              disabled={testStatus === 'testing'}
              onClick={handleTestConnection}
              className="rounded-lg border border-neutral-300 dark:border-neutral-600 px-3 py-1.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
              {testStatus === 'testing' ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 size={14} className="animate-spin" />
                  테스트 중...
                </span>
              ) : '연결 테스트'}
            </button>
            {testStatus === 'success' && (
              <span className="flex items-center gap-1 text-xs text-green-500">
                <Check size={14} />
                연결 성공
              </span>
            )}
            {testStatus === 'error' && (
              <span className="text-xs text-red-500">{testError}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function DeleteMemoryModal({
  open,
  onClose,
  onConfirm
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
}): React.JSX.Element | null {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-[420px] rounded-xl bg-white dark:bg-neutral-800 shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-semibold mb-2">기억 초기화</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
          프로젝트 메모리를 포함한 모든 메모리가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            기억 초기화
          </button>
        </div>
      </div>
    </div>
  )
}

function MemoryManageModal({
  open,
  onClose,
  memoryContent,
  onMemoryChange
}: {
  open: boolean
  onClose: () => void
  memoryContent: string
  onMemoryChange: (content: string) => void
}): React.JSX.Element | null {
  const selectedModel = useSettingsStore((s) => s.selectedModel)
  const [instruction, setInstruction] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading) onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose, loading])

  if (!open) return null

  const sections = memoryContent
    ? memoryContent.split(/^(?=## )/m).filter((s) => s.trim())
    : []

  const handleSubmit = async () => {
    if (!instruction.trim() || loading) return
    setLoading(true)
    try {
      const result = await memoryApi.edit({ instruction: instruction.trim(), model: selectedModel })
      onMemoryChange(result.content)
      setInstruction('')
    } catch {
      // silently ignore
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { if (!loading) onClose() }}>
      <div className="w-[560px] max-h-[80vh] flex flex-col rounded-xl bg-white dark:bg-neutral-800 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <h2 className="text-base font-semibold">기억 관리</h2>
          <button
            type="button"
            onClick={() => { if (!loading) onClose() }}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
          >
            <X size={18} />
          </button>
        </div>
        <p className="px-6 pb-4 text-sm text-neutral-500 dark:text-neutral-400">
          D Chat이 당신에 대해 기억하고 있는 내용입니다!
        </p>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6">
          {sections.length === 0 ? (
            <div className="text-center py-8 text-sm text-neutral-400 dark:text-neutral-500">
              저장된 기억이 없습니다
            </div>
          ) : (
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 space-y-4">
              {sections.map((section, i) => {
                const lines = section.trim().split('\n')
                const header = lines[0].replace(/^## /, '')
                const body = lines.slice(1).join('\n').trim()
                return (
                  <div key={i}>
                    <p className="text-sm font-semibold mb-1">{header}</p>
                    {body && <p className="text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap">{body}</p>}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="px-6 py-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleSubmit() }}
              placeholder="D Chat에게 기억하거나 잊어야 할 것을 알려주세요..."
              className="flex-1 text-sm px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 outline-none focus:ring-2 focus:ring-primary-500"
              disabled={loading}
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!instruction.trim() || loading}
              className="p-2 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function parseSkillMarkdown(text: string): { name: string; description: string; content: string } {
  const frontmatterMatch = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/)
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1]
    const body = frontmatterMatch[2].trim()
    const nameMatch = frontmatter.match(/^name:\s*(.+)$/m)
    const descMatch = frontmatter.match(/^description:\s*(.+)$/m)
    return {
      name: nameMatch?.[1]?.trim() || 'Untitled Skill',
      description: descMatch?.[1]?.trim() || '',
      content: body
    }
  }
  // frontmatter 없으면 첫 헤딩을 이름으로 사용
  const headingMatch = text.match(/^#\s+(.+)$/m)
  return {
    name: headingMatch?.[1]?.trim() || 'Untitled Skill',
    description: '',
    content: text.trim()
  }
}

const EXAMPLE_SKILLS: { name: string; description: string; content: string }[] = [
  {
    name: '한국어 응답',
    description: '항상 한국어로 응답합니다',
    content: '사용자에게 응답할 때 항상 한국어를 사용하세요. 영어로 질문을 받더라도 한국어로 답변하세요.'
  },
  {
    name: '간결한 답변',
    description: '짧고 핵심적인 답변을 제공합니다',
    content: '가능한 한 간결하게 답변하세요. 불필요한 서론이나 반복을 피하고, 핵심 정보만 전달하세요. 코드 예시는 최소한으로 유지하세요.'
  },
  {
    name: '코드 리뷰어',
    description: '코드 리뷰 관점에서 피드백을 제공합니다',
    content: '코드를 검토할 때 다음 관점에서 피드백을 제공하세요:\n1. 버그 가능성\n2. 성능 문제\n3. 가독성 및 유지보수성\n4. 보안 취약점\n각 항목에 대해 구체적인 개선 방안을 제시하세요.'
  },
  {
    name: '단계별 설명',
    description: '복잡한 개념을 단계별로 설명합니다',
    content: '복잡한 개념이나 프로세스를 설명할 때 항상 번호가 매겨진 단계로 나누어 설명하세요. 각 단계는 하나의 핵심 개념만 다루세요.'
  },
  {
    name: 'Markdown 포맷',
    description: '응답을 구조화된 Markdown으로 제공합니다',
    content: '응답을 작성할 때 Markdown 형식을 적극 활용하세요:\n- 제목은 ##을 사용\n- 중요 용어는 **굵게**\n- 코드는 백틱으로 감싸기\n- 목록은 bullet point 사용\n- 필요시 표(table) 활용'
  }
]

function SkillCreateEditModal({
  open,
  onClose,
  skill,
  prefill,
  onSave
}: {
  open: boolean
  onClose: () => void
  skill: Skill | null
  prefill?: { name: string; description: string; content: string } | null
  onSave: (name: string, description: string, content: string) => Promise<void>
}): React.JSX.Element | null {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      const source = skill ?? prefill
      setName(source?.name ?? '')
      setDescription(source?.description ?? '')
      setContent(source?.content ?? '')
    }
  }, [open, skill, prefill])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose, saving])

  if (!open) return null

  const handleSave = async () => {
    if (!name.trim() || !content.trim() || saving) return
    setSaving(true)
    try {
      await onSave(name.trim(), description.trim(), content.trim())
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-[520px] max-h-[80vh] rounded-xl bg-white dark:bg-neutral-800 shadow-2xl p-6 flex flex-col" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-semibold mb-4">{skill ? '스킬 수정' : '새 스킬 추가'}</h2>

        <div className="space-y-4 flex-1 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium mb-1">이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 코드 리뷰어"
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">설명</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="이 스킬이 하는 일을 간략히 설명하세요"
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">지시사항</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="AI가 따라야 할 지시사항을 입력하세요..."
              rows={8}
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || !content.trim() || saving}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {skill ? '저장' : '추가'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SkillDeleteConfirmModal({
  open,
  onClose,
  onConfirm,
  skillName
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  skillName: string
}): React.JSX.Element | null {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-[420px] rounded-xl bg-white dark:bg-neutral-800 shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-semibold mb-2">스킬 삭제</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
          &ldquo;{skillName}&rdquo; 스킬을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  )
}

async function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer
      const bytes = new Uint8Array(arrayBuffer)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
      resolve(btoa(binary))
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

async function readDirectoryEntries(entry: FileSystemDirectoryEntry, basePath = ''): Promise<{ relativePath: string; file: File }[]> {
  const reader = entry.createReader()
  const results: { relativePath: string; file: File }[] = []

  const readBatch = (): Promise<FileSystemEntry[]> =>
    new Promise((resolve, reject) => reader.readEntries(resolve, reject))

  let batch = await readBatch()
  while (batch.length > 0) {
    for (const child of batch) {
      const childPath = basePath ? `${basePath}/${child.name}` : child.name
      if (child.isFile) {
        const file = await new Promise<File>((resolve, reject) =>
          (child as FileSystemFileEntry).file(resolve, reject)
        )
        results.push({ relativePath: childPath, file })
      } else if (child.isDirectory) {
        const subResults = await readDirectoryEntries(child as FileSystemDirectoryEntry, childPath)
        results.push(...subResults)
      }
    }
    batch = await readBatch()
  }

  return results
}

function SkillUploadModal({
  open,
  onClose,
  onUploaded
}: {
  open: boolean
  onClose: () => void
  onUploaded: () => void
}): React.JSX.Element | null {
  const { createSkill, uploadArchive, uploadFiles } = useSkillStore()
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    if (open) setError(null)
  }, [open])

  const handleMdFile = async (file: File) => {
    const text = await file.text()
    const parsed = parseSkillMarkdown(text)
    await createSkill(parsed.name, parsed.description, parsed.content)
  }

  const handleArchiveFile = async (file: File) => {
    const base64 = await readFileAsBase64(file)
    await uploadArchive(base64)
  }

  const handleFolderEntries = async (entries: { relativePath: string; file: File }[]) => {
    const files: { relativePath: string; data: string }[] = []
    for (const entry of entries) {
      const base64 = await readFileAsBase64(entry.file)
      files.push({ relativePath: entry.relativePath, data: base64 })
    }
    await uploadFiles(files)
  }

  const processFiles = async (items: DataTransferItemList | null, fileList: FileList) => {
    setUploading(true)
    setError(null)
    try {
      // Check for directory drops via DataTransfer API
      if (items) {
        for (let i = 0; i < items.length; i++) {
          const entry = items[i].webkitGetAsEntry?.()
          if (entry?.isDirectory) {
            const dirEntries = await readDirectoryEntries(entry as FileSystemDirectoryEntry)
            if (dirEntries.length === 0) throw new Error('빈 폴더입니다')
            const hasSkillMd = dirEntries.some((e) => e.relativePath === 'SKILL.md' || e.relativePath.endsWith('/SKILL.md'))
            if (!hasSkillMd) throw new Error('폴더에 SKILL.md 파일이 없습니다')
            await handleFolderEntries(dirEntries)
            onUploaded()
            onClose()
            return
          }
        }
      }

      // Handle single file
      const file = fileList[0]
      if (!file) return

      const ext = file.name.toLowerCase().split('.').pop()
      if (ext === 'md' || ext === 'txt' || ext === 'markdown') {
        await handleMdFile(file)
      } else if (ext === 'zip' || ext === 'skill') {
        await handleArchiveFile(file)
      } else {
        throw new Error('지원하지 않는 파일 형식입니다. .md, .zip, .skill 파일을 업로드해주세요.')
      }
      onUploaded()
      onClose()
    } catch (err: any) {
      setError(err.message || '업로드 실패')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    processFiles(e.dataTransfer.items, e.dataTransfer.files)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      processFiles(null, files)
    }
    e.target.value = ''
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-[520px] rounded-xl bg-white dark:bg-neutral-800 shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">스킬 업로드</h2>
          <button type="button" onClick={onClose} className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Drag & Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors mb-6 ${
            dragging
              ? 'border-primary bg-primary/5'
              : 'border-neutral-300 dark:border-neutral-600 hover:border-neutral-400 dark:hover:border-neutral-500'
          }`}
        >
          {uploading ? (
            <Loader2 size={32} className="text-neutral-400 animate-spin" />
          ) : (
            <>
              <div className="w-12 h-12 rounded-lg border border-neutral-300 dark:border-neutral-600 flex items-center justify-center">
                <FolderOpen size={24} className="text-neutral-400" />
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                드래그 앤 드롭하거나 클릭하여 업로드
              </p>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.txt,.markdown,.zip,.skill"
          onChange={handleFileInput}
          className="hidden"
        />

        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="text-sm text-neutral-600 dark:text-neutral-400">
          <p className="font-medium mb-2">파일 요구사항</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>.md 파일에는 YAML 형식의 스킬 이름과 설명이 포함되어야 합니다</li>
            <li>.zip 또는 .skill 파일에는 SKILL.md 파일이 포함되어야 합니다</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

function FeaturesContent({ onNavigate }: { onNavigate: (tab: Tab) => void }): React.JSX.Element {
  const memoryEnabled = useSettingsStore((s) => s.memoryEnabled)
  const chatSearchEnabled = useSettingsStore((s) => s.chatSearchEnabled)
  const setMemoryEnabled = useSettingsStore((s) => s.setMemoryEnabled)
  const setChatSearchEnabled = useSettingsStore((s) => s.setChatSearchEnabled)

  const [memoryData, setMemoryData] = useState<{ content: string; updatedAt: string | null } | null>(null)
  const [memoryModalOpen, setMemoryModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  useEffect(() => {
    memoryApi.get().then(setMemoryData).catch(() => {})
  }, [])

  const hasMemory = memoryData && memoryData.content

  return (
    <div className="space-y-6">
      {/* 메모리 섹션 */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Brain size={20} className="text-neutral-700 dark:text-neutral-300" />
          <h3 className="text-base font-semibold">메모리</h3>
        </div>
      </div>

      {/* 채팅 검색 토글 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">채팅 검색 및 참조</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            이전 대화에서 관련 세부 정보를 검색하여 더 나은 응답을 제공합니다
          </p>
        </div>
        <Toggle checked={chatSearchEnabled} onChange={setChatSearchEnabled} />
      </div>

      {/* 메모리 토글 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">채팅 기록에서 기억 생성</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            채팅에서 관련 컨텍스트를 기억하여 향후 대화에 활용합니다
          </p>
        </div>
        <Toggle checked={memoryEnabled} onChange={setMemoryEnabled} />
      </div>

      {/* 메모리 카드 */}
      {hasMemory && (
        <button
          type="button"
          onClick={() => setMemoryModalOpen(true)}
          className="w-full text-left rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-20 h-14 rounded-lg bg-neutral-100 dark:bg-neutral-700 overflow-hidden p-2 shrink-0">
              <p className="text-[6px] leading-tight text-neutral-500 dark:text-neutral-400 overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical' }}>
                {memoryData.content}
              </p>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">채팅에서 얻은 메모리</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">기억 보기 및 편집</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setDeleteModalOpen(true)
              }}
              className="p-1.5 rounded-md text-neutral-400 hover:text-red-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </button>
      )}

      <hr className="border-neutral-200 dark:border-neutral-700" />

      {/* 사용자 지정 이동 카드 */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Zap size={20} className="text-neutral-700 dark:text-neutral-300" />
          <h3 className="text-base font-semibold">사용자 지정</h3>
        </div>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
          스킬로 AI에게 역할 수준의 전문성을 부여하세요
        </p>
        <button
          type="button"
          onClick={() => onNavigate('customization')}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        >
          사용자 지정으로 이동
          <ArrowRight size={16} />
        </button>
      </div>

      {/* Modals */}
      <DeleteMemoryModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={async () => {
          try {
            await memoryApi.delete()
            setMemoryData({ content: '', updatedAt: null })
          } catch { /* ignore */ }
          setDeleteModalOpen(false)
        }}
      />
      <MemoryManageModal
        open={memoryModalOpen}
        onClose={() => setMemoryModalOpen(false)}
        memoryContent={memoryData?.content ?? ''}
        onMemoryChange={(content) => {
          setMemoryData((prev) => ({ content, updatedAt: prev?.updatedAt ?? null }))
        }}
      />
    </div>
  )
}

function SkillFileTreeNode({
  file,
  skillId,
  selectedPath,
  onSelect,
  expandedDirs,
  onToggleDir
}: {
  file: SkillFile
  skillId: string
  selectedPath: string | null
  onSelect: (skillId: string, path: string) => void
  expandedDirs: Set<string>
  onToggleDir: (path: string) => void
}): React.JSX.Element {
  const isExpanded = expandedDirs.has(file.relativePath)

  if (file.isDirectory) {
    return (
      <div>
        <button
          type="button"
          onClick={() => onToggleDir(file.relativePath)}
          className="w-full flex items-center gap-1.5 py-1 px-2 text-xs rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
        >
          <Folder size={14} className="text-neutral-400 dark:text-neutral-500 shrink-0" />
          <span className="truncate flex-1 text-left">{file.name}</span>
          <ChevronDown size={14} className={`text-neutral-400 shrink-0 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
        </button>
        {isExpanded && file.children && (
          <div className="ml-4">
            {file.children.map((child) => (
              <SkillFileTreeNode
                key={child.relativePath}
                file={child}
                skillId={skillId}
                selectedPath={selectedPath}
                onSelect={onSelect}
                expandedDirs={expandedDirs}
                onToggleDir={onToggleDir}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(skillId, file.relativePath)}
      className={`w-full flex items-center gap-1.5 py-1 px-2 text-xs rounded transition-colors ${
        selectedPath === file.relativePath
          ? 'bg-primary/10 text-primary font-medium'
          : 'hover:bg-neutral-100 dark:hover:bg-neutral-700'
      }`}
    >
      <span className="truncate text-left">{file.name}</span>
    </button>
  )
}

function CustomizationContent(): React.JSX.Element {
  const { skills, loadSkills, createSkill, updateSkill, deleteSkill, toggleEnabled, selectedFileContent, selectedFilePath, loadFileContent, clearFileContent } = useSkillStore()

  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null)
  const [skillTab, setSkillTab] = useState<'mine' | 'examples'>('mine')
  const [skillSearch, setSkillSearch] = useState('')
  const [skillModalOpen, setSkillModalOpen] = useState(false)
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null)
  const [deleteSkillTarget, setDeleteSkillTarget] = useState<Skill | null>(null)
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [prefillData, setPrefillData] = useState<{ name: string; description: string; content: string } | null>(null)
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const [expandedSkillIds, setExpandedSkillIds] = useState<Set<string>>(new Set())
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const addMenuRef = useRef<HTMLDivElement>(null)
  const moreMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadSkills() }, [])

  // 스킬 선택 시 파일 내용 초기화 및 SKILL.md 자동 로드
  useEffect(() => {
    if (selectedSkillId) {
      loadFileContent(selectedSkillId, 'SKILL.md')
    } else {
      clearFileContent()
    }
    setExpandedDirs(new Set())
  }, [selectedSkillId])

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    if (!addMenuOpen && !moreMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (addMenuOpen && addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setAddMenuOpen(false)
      }
      if (moreMenuOpen && moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [addMenuOpen, moreMenuOpen])

  const handleCreateWithClaude = async () => {
    setAddMenuOpen(false)
    const selectedModel = useSettingsStore.getState().selectedModel
    useSettingsStore.getState().closeSettings()
    const session = await useSessionStore.getState().createSession('New Chat', selectedModel)
    if (session) {
      useSessionStore.getState().sendMessage('새로운 스킬을 만들고 싶어요. 어떤 스킬을 만들 수 있는지 도와주세요.')
    }
  }

  const handleToggleDir = useCallback((path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])

  const handleToggleSkillExpand = useCallback((skillId: string) => {
    setExpandedSkillIds((prev) => {
      const next = new Set(prev)
      if (next.has(skillId)) next.delete(skillId)
      else next.add(skillId)
      return next
    })
  }, [])

  const handleSelectSkill = useCallback((skillId: string) => {
    setSelectedSkillId(skillId)
    setMoreMenuOpen(false)
  }, [])

  const handleFileSelect = useCallback((skillId: string, path: string) => {
    setSelectedSkillId(skillId)
    loadFileContent(skillId, path)
  }, [loadFileContent])

  const filteredSkills = skillSearch
    ? skills.filter((s) => s.name.toLowerCase().includes(skillSearch.toLowerCase()) || s.description.toLowerCase().includes(skillSearch.toLowerCase()))
    : skills

  const filteredExamples = skillSearch
    ? EXAMPLE_SKILLS.filter((s) => s.name.toLowerCase().includes(skillSearch.toLowerCase()) || s.description.toLowerCase().includes(skillSearch.toLowerCase()))
    : EXAMPLE_SKILLS

  const addedSkillNames = new Set(skills.map((s) => s.name))
  const selectedSkill = skills.find((s) => s.id === selectedSkillId) ?? null

  return (
    <div className="flex gap-6 h-full">
      {/* 왼쪽: 스킬 리스트 + 인라인 파일 트리 */}
      <div className="w-[300px] shrink-0 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-base font-semibold flex-1">스킬</h3>
          <button
            type="button"
            onClick={() => setSkillSearch(skillSearch ? '' : ' ')}
            className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <Search size={16} />
          </button>
          <div className="relative" ref={addMenuRef}>
            <button
              type="button"
              onClick={() => setAddMenuOpen(!addMenuOpen)}
              className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <Plus size={18} />
            </button>
            {addMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-lg z-10 py-1">
                <button
                  type="button"
                  onClick={handleCreateWithClaude}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                >
                  <Sparkles size={16} className="text-primary shrink-0" />
                  <div>
                    <p className="font-medium">Claude와 함께 창작하기</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">AI와 대화하며 스킬 생성</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => { setAddMenuOpen(false); setEditingSkill(null); setPrefillData(null); setSkillModalOpen(true) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                >
                  <Pencil size={16} className="text-neutral-500 shrink-0" />
                  <div>
                    <p className="font-medium">스킬 지침 작성</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">직접 지시사항 입력</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => { setAddMenuOpen(false); setUploadModalOpen(true) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                >
                  <FileUp size={16} className="text-neutral-500 shrink-0" />
                  <div>
                    <p className="font-medium">스킬 업로드</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">파일 또는 폴더에서 가져오기</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {skillSearch !== '' && (
          <div className="relative mb-3">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="검색..."
              value={skillSearch}
              onChange={(e) => setSkillSearch(e.target.value)}
              autoFocus
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        )}

        <div className="flex gap-1 mb-3">
          <button
            type="button"
            onClick={() => setSkillTab('mine')}
            className={`px-2.5 py-1 text-xs rounded-md transition-colors ${skillTab === 'mine' ? 'bg-neutral-200 dark:bg-neutral-600 font-medium' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
          >
            내 스킬
          </button>
          <button
            type="button"
            onClick={() => setSkillTab('examples')}
            className={`px-2.5 py-1 text-xs rounded-md transition-colors ${skillTab === 'examples' ? 'bg-neutral-200 dark:bg-neutral-600 font-medium' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
          >
            예시 스킬
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-0.5">
          {skillTab === 'mine' ? (
            filteredSkills.length === 0 ? (
              <div className="text-center py-6 text-xs text-neutral-400 dark:text-neutral-500">
                {skillSearch.trim() ? '검색 결과 없음' : '스킬이 없습니다'}
              </div>
            ) : (
              filteredSkills.map((skill) => {
                const isExpanded = expandedSkillIds.has(skill.id)
                const hasFiles = skill.files && skill.files.length > 0
                return (
                  <div key={skill.id}>
                    <div
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm transition-colors cursor-pointer ${
                        selectedSkillId === skill.id
                          ? 'bg-neutral-200 dark:bg-neutral-700'
                          : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                      onClick={() => handleSelectSkill(skill.id)}
                    >
                      {hasFiles ? (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleToggleSkillExpand(skill.id) }}
                          className="p-0.5 rounded hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors shrink-0"
                        >
                          <ChevronDown size={14} className={`text-neutral-400 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                        </button>
                      ) : (
                        <span className="w-[22px] shrink-0" />
                      )}
                      <FileText size={14} className="text-neutral-400 shrink-0" />
                      <span className="truncate flex-1">{skill.name}</span>
                    </div>
                    {/* 인라인 파일 트리 */}
                    {isExpanded && hasFiles && (
                      <div className="ml-[30px] mt-0.5 mb-1">
                        {skill.files.map((file) => (
                          <SkillFileTreeNode
                            key={file.relativePath}
                            file={file}
                            skillId={skill.id}
                            selectedPath={selectedSkillId === skill.id ? selectedFilePath : null}
                            onSelect={handleFileSelect}
                            expandedDirs={expandedDirs}
                            onToggleDir={handleToggleDir}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            )
          ) : (
            filteredExamples.map((example) => {
              const alreadyAdded = addedSkillNames.has(example.name)
              return (
                <div key={example.name} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{example.name}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{example.description}</p>
                  </div>
                  <button
                    type="button"
                    disabled={alreadyAdded}
                    onClick={async () => { await createSkill(example.name, example.description, example.content) }}
                    className={`shrink-0 px-2 py-1 text-xs font-medium rounded-md transition-colors ${alreadyAdded ? 'text-neutral-400 cursor-default' : 'text-primary hover:bg-primary/10'}`}
                  >
                    {alreadyAdded ? '추가됨' : '추가'}
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* 오른쪽: 스킬 상세 (메타데이터 + 미리보기) */}
      <div className="flex-1 min-w-0 border-l border-neutral-200 dark:border-neutral-700 pl-6">
        {selectedSkill ? (
          <div className="flex flex-col gap-4 h-full">
            {/* 헤더: 이름 + 토글 + 더보기 메뉴 */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{selectedSkill.name}</h3>
              <div className="flex items-center gap-2">
                <Toggle checked={selectedSkill.isEnabled} onChange={() => toggleEnabled(selectedSkill.id)} />
                <div className="relative" ref={moreMenuRef}>
                  <button
                    type="button"
                    onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                    className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <MoreHorizontal size={18} />
                  </button>
                  {moreMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-36 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-lg z-10 py-1">
                      <button
                        type="button"
                        onClick={() => { setMoreMenuOpen(false); setEditingSkill(selectedSkill); setSkillModalOpen(true) }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                      >
                        <Pencil size={14} />
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => { setMoreMenuOpen(false); setDeleteSkillTarget(selectedSkill) }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 size={14} />
                        삭제
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 설명 */}
            {selectedSkill.description && (
              <div>
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">설명</p>
                <p className="text-sm text-neutral-700 dark:text-neutral-300">
                  {selectedSkill.description}
                </p>
              </div>
            )}

            {/* 파일 미리보기 */}
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 overflow-hidden flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-200 dark:border-neutral-700">
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {selectedFilePath || 'SKILL.md'}
                </span>
              </div>
              <div className="p-4 flex-1 overflow-y-auto">
                <pre className="text-xs text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap font-mono leading-relaxed">
                  {selectedFileContent ?? selectedSkill.content}
                </pre>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-neutral-400 dark:text-neutral-500">
            스킬을 선택하세요
          </div>
        )}
      </div>

      {/* Modals */}
      <SkillCreateEditModal
        open={skillModalOpen}
        onClose={() => { setSkillModalOpen(false); setEditingSkill(null); setPrefillData(null) }}
        skill={editingSkill}
        prefill={prefillData}
        onSave={async (name, description, content) => {
          if (editingSkill) {
            await updateSkill(editingSkill.id, { name, description, content })
          } else {
            await createSkill(name, description, content)
          }
        }}
      />
      <SkillDeleteConfirmModal
        open={!!deleteSkillTarget}
        onClose={() => setDeleteSkillTarget(null)}
        onConfirm={async () => {
          if (deleteSkillTarget) {
            await deleteSkill(deleteSkillTarget.id)
            if (selectedSkillId === deleteSkillTarget.id) setSelectedSkillId(null)
            setDeleteSkillTarget(null)
          }
        }}
        skillName={deleteSkillTarget?.name ?? ''}
      />
      <SkillUploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploaded={() => loadSkills()}
      />
    </div>
  )
}

function ConnectorsContent(): React.JSX.Element {
  const anthropicApiKey = useSettingsStore((s) => s.anthropicApiKey)
  const openaiApiKey = useSettingsStore((s) => s.openaiApiKey)
  const anthropicBaseUrl = useSettingsStore((s) => s.anthropicBaseUrl)
  const openaiBaseUrl = useSettingsStore((s) => s.openaiBaseUrl)
  const selectedModel = useSettingsStore((s) => s.selectedModel)
  const anthropicVerified = useSettingsStore((s) => s.anthropicVerified)
  const openaiVerified = useSettingsStore((s) => s.openaiVerified)
  const setApiKey = useSettingsStore((s) => s.setApiKey)
  const setSelectedModel = useSettingsStore((s) => s.setSelectedModel)
  const setAnthropicBaseUrl = useSettingsStore((s) => s.setAnthropicBaseUrl)
  const setOpenaiBaseUrl = useSettingsStore((s) => s.setOpenaiBaseUrl)
  const setProviderVerified = useSettingsStore((s) => s.setProviderVerified)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold mb-1">연결</h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          AI 프로바이더의 API 연결을 설정합니다
        </p>
      </div>

      {/* 기본 모델 */}
      <div>
        <label className="block text-sm text-neutral-600 dark:text-neutral-400 mb-1.5">기본 모델</label>
        <ModelDropdown
          value={selectedModel}
          onChange={setSelectedModel}
          anthropicKey={anthropicApiKey}
          openaiKey={openaiApiKey}
        />
      </div>

      {/* Anthropic */}
      <ProviderCard
        name="Anthropic"
        provider="anthropic"
        apiKey={anthropicApiKey}
        baseUrl={anthropicBaseUrl}
        baseUrlPlaceholder="https://api.anthropic.com"
        verified={anthropicVerified}
        onApiKeyChange={(key) => setApiKey('anthropic', key)}
        onBaseUrlChange={setAnthropicBaseUrl}
        onVerified={() => setProviderVerified('anthropic', true)}
      />

      {/* OpenAI */}
      <ProviderCard
        name="OpenAI"
        provider="openai"
        apiKey={openaiApiKey}
        baseUrl={openaiBaseUrl}
        baseUrlPlaceholder="https://api.openai.com/v1"
        verified={openaiVerified}
        onApiKeyChange={(key) => setApiKey('openai', key)}
        onBaseUrlChange={setOpenaiBaseUrl}
        onVerified={() => setProviderVerified('openai', true)}
      />
    </div>
  )
}

function DeveloperContent(): React.JSX.Element {
  const servers = useMcpStore((s) => s.servers)
  const selectedServerId = useMcpStore((s) => s.selectedServerId)
  const loading = useMcpStore((s) => s.loading)
  const logs = useMcpStore((s) => s.logs)
  const logsServerId = useMcpStore((s) => s.logsServerId)
  const configPath = useMcpStore((s) => s.configPath)
  const loadServers = useMcpStore((s) => s.loadServers)
  const deleteServer = useMcpStore((s) => s.deleteServer)
  const startServer = useMcpStore((s) => s.startServer)
  const stopServer = useMcpStore((s) => s.stopServer)
  const restartServer = useMcpStore((s) => s.restartServer)
  const selectServer = useMcpStore((s) => s.selectServer)
  const loadLogs = useMcpStore((s) => s.loadLogs)
  const closeLogs = useMcpStore((s) => s.closeLogs)
  const loadConfigPath = useMcpStore((s) => s.loadConfigPath)
  const reloadConfig = useMcpStore((s) => s.reloadConfig)

  const [reloading, setReloading] = useState(false)

  useEffect(() => {
    loadServers()
    loadConfigPath()
  }, [loadServers, loadConfigPath])

  const handleOpenConfigFile = (): void => {
    if (!configPath) return
    openFile(configPath)
  }

  const handleReload = async (): Promise<void> => {
    setReloading(true)
    await reloadConfig()
    setReloading(false)
  }

  const selected = servers.find((s) => s.config.id === selectedServerId)

  const statusColor = (status: string): string => {
    if (status === 'running') return 'bg-blue-500'
    if (status === 'error') return 'bg-red-500'
    return 'bg-neutral-400'
  }

  const statusLabel = (status: string): string => {
    if (status === 'running') return '실행 중'
    if (status === 'error') return '오류'
    return '중지됨'
  }

  // Show logs modal
  if (logsServerId) {
    const logServer = servers.find((s) => s.config.id === logsServerId)
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{logServer?.config.name ?? ''} 로그</h3>
          <button
            type="button"
            onClick={closeLogs}
            className="text-sm text-primary dark:text-primary-400 hover:underline"
          >
            돌아가기
          </button>
        </div>
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 p-3 max-h-96 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-xs text-neutral-500">로그가 없습니다</p>
          ) : (
            <pre className="text-xs text-neutral-600 dark:text-neutral-300 whitespace-pre-wrap font-mono">
              {logs.join('\n')}
            </pre>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-base font-semibold">로컬 MCP 서버</h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
          MCP 서버를 추가하여 AI에게 도구를 제공합니다
        </p>
      </div>

      {/* Config file actions */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenConfigFile}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-600 px-3 py-1.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            <FolderOpen size={14} />
            설정 파일 편집
          </button>
          <button
            type="button"
            onClick={handleReload}
            disabled={reloading}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-600 px-3 py-1.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            {reloading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            다시 불러오기
          </button>
        </div>
        {configPath && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">{configPath}</p>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Loader2 size={14} className="animate-spin" />
          불러오는 중...
        </div>
      )}

      {/* Server list + detail layout */}
      {!loading && servers.length === 0 && (
        <div className="text-sm text-neutral-500 dark:text-neutral-400 py-8 text-center">
          등록된 MCP 서버가 없습니다
        </div>
      )}

      {!loading && servers.length > 0 && (
        <div className="flex gap-4">
          {/* Left: Server list */}
          <div className="w-[200px] shrink-0 space-y-1">
            {servers.map((srv) => (
              <button
                key={srv.config.id}
                type="button"
                onClick={() => selectServer(srv.config.id)}
                className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${
                  selectedServerId === srv.config.id
                    ? 'bg-neutral-200 dark:bg-neutral-700 font-medium'
                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${statusColor(srv.status)}`} />
                  <span className="truncate">{srv.config.name}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Right: Detail */}
          <div className="flex-1 min-w-0">
            {selected ? (
              <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 space-y-4">
                {/* Name + status */}
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">{selected.config.name}</h4>
                  <span className={`flex items-center gap-1.5 text-xs ${
                    selected.status === 'running' ? 'text-blue-500' :
                    selected.status === 'error' ? 'text-red-500' :
                    'text-neutral-400'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusColor(selected.status)}`} />
                    {statusLabel(selected.status)}
                  </span>
                </div>

                {/* Command info */}
                <div className="space-y-2">
                  <div>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">명령어</span>
                    <p className="text-sm font-mono bg-neutral-50 dark:bg-neutral-800 rounded px-2 py-1 mt-0.5">
                      {selected.config.command}
                    </p>
                  </div>
                  {selected.config.args.length > 0 && (
                    <div>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">인수</span>
                      <p className="text-sm font-mono bg-neutral-50 dark:bg-neutral-800 rounded px-2 py-1 mt-0.5">
                        {selected.config.args.join(' ')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Tools */}
                {selected.tools.length > 0 && (
                  <div>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      도구 ({selected.tools.length})
                    </span>
                    <div className="mt-1 space-y-1">
                      {selected.tools.map((tool) => (
                        <div
                          key={tool.name}
                          className="text-xs bg-neutral-50 dark:bg-neutral-800 rounded px-2 py-1.5"
                        >
                          <span className="font-medium">{tool.name}</span>
                          {tool.description && (
                            <span className="text-neutral-500 dark:text-neutral-400 ml-1.5">
                              — {tool.description}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                  {selected.status === 'running' ? (
                    <button
                      type="button"
                      onClick={() => stopServer(selected.config.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-600 px-3 py-1.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <Square size={12} />
                      중지
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startServer(selected.config.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-600 px-3 py-1.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <Play size={12} />
                      시작
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => restartServer(selected.config.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-600 px-3 py-1.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <RotateCw size={12} />
                    재시작
                  </button>
                  <button
                    type="button"
                    onClick={() => loadLogs(selected.config.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-600 px-3 py-1.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <FileText size={12} />
                    로그
                  </button>
                  <div className="flex-1" />
                  <button
                    type="button"
                    onClick={() => deleteServer(selected.config.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-red-300 dark:border-red-800 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 size={12} />
                    삭제
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-neutral-500 dark:text-neutral-400 py-8 text-center">
                서버를 선택하세요
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const isElectron = typeof window !== 'undefined' && !!(window as any).electron

type ToolPermission = 'always' | 'confirm' | 'blocked'

const FILESYSTEM_TOOL_NAMES = [
  'read_text_file', 'write_file', 'edit_file',
  'list_directory', 'search_files', 'create_directory',
  'read_media_file', 'read_multiple_files', 'list_directory_with_sizes',
  'directory_tree', 'move_file', 'get_file_info', 'list_allowed_directories'
] as const

const SHELL_TOOL_NAMES = ['execute_command'] as const

const DEFAULT_PERMISSIONS: Record<string, ToolPermission> = {
  read_text_file: 'always',
  write_file: 'confirm',
  edit_file: 'confirm',
  list_directory: 'always',
  search_files: 'always',
  create_directory: 'confirm',
  read_media_file: 'always',
  read_multiple_files: 'always',
  list_directory_with_sizes: 'always',
  directory_tree: 'always',
  move_file: 'confirm',
  get_file_info: 'always',
  list_allowed_directories: 'always',
  execute_command: 'confirm'
}

type ExtensionView = 'list' | 'filesystem-config'

function ExtensionsContent({ onNavigate }: { onNavigate: (tab: Tab) => void }): React.JSX.Element {
  const [view, setView] = useState<ExtensionView>('list')
  const [directories, setDirectories] = useState<string[]>([])
  const [shellEnabled, setShellEnabled] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const loadedDirsRef = useRef<string[]>([])
  const [toolPermissions, setToolPermissions] = useState<Record<string, ToolPermission>>({ ...DEFAULT_PERMISSIONS })
  const [builtinStatus, setBuiltinStatus] = useState<{ status: 'running' | 'error' | 'disabled'; toolCount: number; directories: string[]; errors: string[] } | null>(null)

  const fetchBuiltinStatus = useCallback(() => {
    settingsApi.getBuiltinToolsStatus().then(setBuiltinStatus).catch(() => {})
  }, [])

  // Load settings on mount
  useEffect(() => {
    Promise.all([
      settingsApi.get('builtin_tools_allowed_dirs'),
      settingsApi.get('builtin_tools_shell_enabled'),
      settingsApi.get('builtin_tools_permissions'),
      settingsApi.getBuiltinToolsStatus()
    ]).then(([dirsVal, shellVal, permsVal, status]) => {
      setBuiltinStatus(status)
      if (dirsVal) {
        try {
          const parsed = JSON.parse(dirsVal)
          setDirectories(parsed)
          loadedDirsRef.current = parsed
        } catch { /* ignore */ }
      } else {
        const defaultDir = status.defaultDirectory
        setDirectories([defaultDir])
        loadedDirsRef.current = [defaultDir]
      }
      setShellEnabled(shellVal !== 'false')
      if (permsVal) {
        try {
          const parsed = JSON.parse(permsVal)
          setToolPermissions({ ...DEFAULT_PERMISSIONS, ...parsed })
        } catch { /* ignore */ }
      }
      setLoaded(true)
    }).catch(() => {
      setLoaded(true)
    })
  }, [])

  const handlePermissionChange = (toolName: string, permission: ToolPermission): void => {
    const updated = { ...toolPermissions, [toolName]: permission }
    setToolPermissions(updated)
    settingsApi.set('builtin_tools_permissions', JSON.stringify(updated))
  }

  const handleAddDirectory = (): void => {
    setDirectories([...directories, ''])
  }

  const handleDirectoryChange = (index: number, value: string): void => {
    setDirectories(directories.map((d, i) => (i === index ? value : d)))
  }

  const handlePickDirectory = async (index: number): Promise<void> => {
    const dir = await pickDirectory()
    if (dir) {
      setDirectories(directories.map((d, i) => (i === index ? dir : d)))
    }
  }

  const handleRemoveDirectory = (index: number): void => {
    setDirectories(directories.filter((_, i) => i !== index))
  }

  const handleSave = async (): Promise<void> => {
    if (!loaded) return
    const validDirs = directories.filter((d) => d.trim())
    setSaving(true)
    try {
      await settingsApi.set('builtin_tools_allowed_dirs', JSON.stringify(validDirs))
      setDirectories(validDirs)
      loadedDirsRef.current = validDirs
      fetchBuiltinStatus()
    } finally {
      setSaving(false)
    }
  }

  const handleShellToggle = async (value: boolean): Promise<void> => {
    setShellEnabled(value)
    await settingsApi.set('builtin_tools_shell_enabled', value ? 'true' : 'false')
  }

  const hasDirectories = directories.filter((d) => d.trim()).length > 0
  const isDirsDirty = JSON.stringify(directories.filter(d => d.trim())) !== JSON.stringify(loadedDirsRef.current)

  // ── List View ──
  if (view === 'list') {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-base font-semibold mb-1">확장 프로그램</h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
            내장 도구를 사용하여 D Chat의 기능을 확장할 수 있습니다
          </p>
        </div>

        <div>
          <h4 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-3">내장 도구</h4>
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 divide-y divide-neutral-200 dark:divide-neutral-700">
            {/* Filesystem card */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                  <FolderOpen size={16} className="text-neutral-600 dark:text-neutral-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Filesystem</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      builtinStatus?.status === 'running' ? 'bg-blue-500' :
                      builtinStatus?.status === 'error' ? 'bg-red-500' :
                      'bg-neutral-400'
                    }`} />
                    {builtinStatus?.status === 'running' ? '실행 중' :
                     builtinStatus?.status === 'error' ? '오류' :
                     '비활성화'}
                    {builtinStatus && builtinStatus.toolCount > 0 && ` (${builtinStatus.toolCount}개 도구)`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setView('filesystem-config')}
                className="rounded-lg border border-neutral-300 dark:border-neutral-600 px-3 py-1 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                구성
              </button>
            </div>
            {/* Shell card */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                  <Terminal size={16} className="text-neutral-600 dark:text-neutral-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Shell</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {shellEnabled ? '활성화됨' : '비활성화됨'}
                  </p>
                </div>
              </div>
              <Toggle checked={shellEnabled} onChange={handleShellToggle} />
            </div>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => onNavigate('developer')}
            className="text-sm text-primary dark:text-primary-400 hover:underline"
          >
            고급 설정 (외부 MCP 서버)
          </button>
        </div>
      </div>
    )
  }

  // ── Filesystem Config View ──
  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        type="button"
        onClick={() => setView('list')}
        className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
      >
        <ChevronLeft size={16} />
        모든 확장 프로그램
      </button>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
          <FolderOpen size={20} className="text-neutral-600 dark:text-neutral-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold">Filesystem</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">내장 도구</p>
        </div>
      </div>

      {/* Warning banner */}
      {!hasDirectories && (
        <div className="flex items-start gap-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
          <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            도구를 사용하려면 허용할 디렉토리를 추가하세요.
          </p>
        </div>
      )}

      {builtinStatus && builtinStatus.errors.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3">
          <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <div className="text-sm text-red-700 dark:text-red-400">
            <p>접근할 수 없는 디렉토리:</p>
            <ul className="mt-1 list-disc list-inside">
              {builtinStatus.errors.map((dir) => (
                <li key={dir} className="font-mono text-xs">{dir}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Allowed Directories */}
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-5">
        <h4 className="text-sm font-semibold mb-1">허용 디렉토리 (필수)</h4>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
          파일 시스템 도구가 접근할 수 있는 디렉토리를 선택하세요
        </p>

        {directories.length > 0 && (
          <div className="space-y-3 mb-4">
            {directories.map((dir, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={dir}
                  onChange={(e) => handleDirectoryChange(index, e.target.value)}
                  placeholder="디렉토리 경로"
                  autoFocus={dir === ''}
                  className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => handlePickDirectory(index)}
                  className="p-2 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <FolderOpen size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveDirectory(index)}
                  className="p-2 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={handleAddDirectory}
          className="flex items-center gap-1.5 text-sm text-primary dark:text-primary-400 hover:underline"
        >
          <Plus size={14} />
          디렉토리 추가
        </button>
      </div>

      {/* Tool Permissions */}
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-5">
        <h4 className="text-sm font-semibold mb-1">도구 권한</h4>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
          각 도구의 실행 권한을 설정합니다
        </p>

        <div className="space-y-2">
          {[...FILESYSTEM_TOOL_NAMES, ...(shellEnabled ? SHELL_TOOL_NAMES : [])].map((toolName) => {
            const current = toolPermissions[toolName] ?? DEFAULT_PERMISSIONS[toolName]
            return (
              <div key={toolName} className="flex items-center justify-between py-1.5">
                <span className="text-sm font-mono">{toolName}</span>
                <div className="flex items-center gap-1">
                  {([
                    { value: 'always' as const, icon: CircleCheck, title: '항상 허용' },
                    { value: 'confirm' as const, icon: Hand, title: '승인 필요' },
                    { value: 'blocked' as const, icon: Ban, title: '차단됨' }
                  ]).map(({ value, icon: Icon, title }) => (
                    <button
                      key={value}
                      type="button"
                      title={title}
                      onClick={() => handlePermissionChange(toolName, value)}
                      className={`p-1.5 rounded-md transition-colors ${
                        current === value
                          ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200'
                          : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <Icon size={16} />
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          type="button"
          disabled={saving || !loaded || !isDirsDirty}
          onClick={handleSave}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <span className="flex items-center gap-1.5">
              <Loader2 size={14} className="animate-spin" />
              저장 중...
            </span>
          ) : '저장'}
        </button>
      </div>
    </div>
  )
}

export function SettingsScreen(): React.JSX.Element {
  const closeSettings = useSettingsStore((s) => s.closeSettings)
  const [activeTab, setActiveTab] = useState<Tab>('general-top')

  const activeLabel = TABS.find((t) => t.id === activeTab)?.label ?? ''

  return (
    <div className="flex flex-1 min-h-0 bg-white dark:bg-neutral-900">
      {/* Left navigation */}
      <div className="w-[200px] shrink-0 border-r border-neutral-200 dark:border-neutral-700 overflow-y-auto py-4 px-2">
        <div className="flex items-center justify-between px-3 mb-3">
          <h2 className="text-base font-semibold">설정</h2>
          <button
            onClick={closeSettings}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-0.5">
          {TABS.map((tab) => (
            <div key={tab.id}>
              {tab.section && (
                <div className="px-3 pt-4 pb-1 text-xs text-neutral-500 font-medium">
                  {tab.section}
                </div>
              )}
              <button
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'bg-neutral-200 dark:bg-neutral-700 font-medium'
                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                {tab.label}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Right content */}
      <div className="flex-1 overflow-y-auto">
        <div className={`mx-auto px-8 py-6 ${activeTab === 'customization' ? 'h-full' : 'max-w-2xl'}`}>
          {activeTab === 'general-top' ? (
            <GeneralTopContent />
          ) : activeTab === 'usage' ? (
            <UsageContent />
          ) : activeTab === 'privacy' ? (
            <PrivacyContent />
          ) : activeTab === 'features' ? (
            <FeaturesContent onNavigate={setActiveTab} />
          ) : activeTab === 'customization' ? (
            <CustomizationContent />
          ) : activeTab === 'connectors' ? (
            <ConnectorsContent />
          ) : activeTab === 'extensions' ? (
            <ExtensionsContent onNavigate={setActiveTab} />
          ) : activeTab === 'developer' ? (
            <DeveloperContent />
          ) : activeTab === 'general' ? (
            <GeneralContent />
          ) : (
            <div className="text-sm text-neutral-500 dark:text-neutral-400">
              {activeLabel} 설정
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
