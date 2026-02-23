import { useState, useRef, useEffect, useCallback } from 'react'
import { X, ChevronDown, Shield, ExternalLink, RefreshCw, Eye, EyeOff, Loader2, Check, Upload, Download, Trash2, Play, Square, RotateCw, FileText, FolderOpen } from 'lucide-react'
import { useSettingsStore, settingsApi } from '@/entities/settings'
import { useSessionStore } from '@/entities/session'
import { useMcpStore } from '@/entities/mcp'
import { backupApi } from '@/entities/settings/api/backup.api'
import { openFile } from '@/shared/lib/native'

type Tab =
  | 'general-top'
  | 'privacy'
  | 'usage'
  | 'features'
  | 'connectors'
  | 'general'
  | 'extensions'
  | 'developer'

const TABS: { section?: string; id: Tab; label: string }[] = [
  { id: 'general-top', label: '일반' },
  { id: 'privacy', label: '개인정보보호' },
  { id: 'usage', label: '사용량' },
  { id: 'features', label: '기능' },
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

const QUICK_ACCESS_OPTIONS = [
  { value: 'double-option', label: 'Option 키 두 번 누르기' },
  { value: 'option-space', label: 'Option+Space' },
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

/** Convert Electron accelerator string to Mac symbol display */
function acceleratorToDisplay(accelerator: string): string {
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
  return parts
    .map((p) => modMap[p] ?? p)
    .join('')
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
        <div className="max-w-2xl mx-auto px-8 py-6">
          {activeTab === 'general-top' ? (
            <GeneralTopContent />
          ) : activeTab === 'usage' ? (
            <UsageContent />
          ) : activeTab === 'privacy' ? (
            <PrivacyContent />
          ) : activeTab === 'connectors' ? (
            <ConnectorsContent />
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
