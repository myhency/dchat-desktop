import { useState, useRef, useEffect } from 'react'
import { Sun, Monitor, Moon, X, ChevronDown } from 'lucide-react'
import { useSettingsStore } from '../../stores/settings.store'

type Tab =
  | 'general-top'
  | 'account'
  | 'privacy'
  | 'usage'
  | 'features'
  | 'connectors'
  | 'general'
  | 'extensions'
  | 'developer'

const TABS: { section?: string; id: Tab; label: string }[] = [
  { id: 'general-top', label: '일반' },
  { id: 'account', label: '계정' },
  { id: 'privacy', label: '개인정보보호' },
  { id: 'usage', label: '사용량' },
  { id: 'features', label: '기능' },
  { id: 'connectors', label: '커넥터' },
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
        checked ? 'bg-blue-600' : 'bg-neutral-300 dark:bg-neutral-600'
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
        className="w-full flex items-center justify-between rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
                  ? 'border-blue-500'
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

function PrivacyContent(): React.JSX.Element {
  const [role, setRole] = useState('소프트웨어 엔지니어')
  const [customInstructions, setCustomInstructions] = useState('')
  const [emailNotif, setEmailNotif] = useState(true)
  const [desktopNotif, setDesktopNotif] = useState(false)
  const [colorMode, setColorMode] = useState<'light' | 'auto' | 'dark'>('auto')
  const [chatFont, setChatFont] = useState<'default' | 'mono'>('default')

  return (
    <div className="space-y-8">
      {/* 직무 */}
      <div>
        <h3 className="text-sm font-medium mb-1">직무</h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
          Claude가 더 관련성 높은 응답을 제공하도록 직무를 선택하세요.
        </p>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* 개인 맞춤 설정 */}
      <div>
        <h3 className="text-sm font-medium mb-1">개인 맞춤 설정</h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
          Claude가 모든 대화에서 참고할 내용을 입력하세요. 예: 선호하는 답변
          스타일, 자주 사용하는 언어, 전문 분야 등.
        </p>
        <textarea
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
          placeholder="예: 항상 한국어로 답변해줘. 코드는 TypeScript를 기본으로 해줘."
          rows={4}
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* 알림 */}
      <div>
        <h3 className="text-sm font-medium mb-3">알림</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-sm">이메일 알림</span>
            <button
              type="button"
              role="switch"
              aria-checked={emailNotif}
              onClick={() => setEmailNotif(!emailNotif)}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                emailNotif ? 'bg-blue-600' : 'bg-neutral-300 dark:bg-neutral-600'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                  emailNotif ? 'translate-x-[18px]' : 'translate-x-[3px]'
                }`}
              />
            </button>
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">데스크톱 알림</span>
            <button
              type="button"
              role="switch"
              aria-checked={desktopNotif}
              onClick={() => setDesktopNotif(!desktopNotif)}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                desktopNotif ? 'bg-blue-600' : 'bg-neutral-300 dark:bg-neutral-600'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                  desktopNotif ? 'translate-x-[18px]' : 'translate-x-[3px]'
                }`}
              />
            </button>
          </label>
        </div>
      </div>

      {/* 모양 */}
      <div>
        <h3 className="text-sm font-medium mb-3">모양</h3>

        {/* 색상 모드 */}
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
          색상 모드
        </p>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {([
            { id: 'light' as const, label: '기본', icon: <Sun size={20} /> },
            { id: 'auto' as const, label: '자동', icon: <Monitor size={20} /> },
            { id: 'dark' as const, label: '다크', icon: <Moon size={20} /> }
          ]).map((mode) => (
            <button
              key={mode.id}
              onClick={() => setColorMode(mode.id)}
              className={`flex flex-col items-center gap-2 rounded-lg border px-4 py-3 text-sm transition-colors ${
                colorMode === mode.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700'
              }`}
            >
              {mode.icon}
              <span>{mode.label}</span>
            </button>
          ))}
        </div>

        {/* 채팅 글꼴 */}
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
          채팅 글꼴
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setChatFont('default')}
            className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
              chatFont === 'default'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700'
            }`}
          >
            기본
          </button>
          <button
            onClick={() => setChatFont('mono')}
            className={`rounded-lg border px-4 py-2 text-sm font-mono transition-colors ${
              chatFont === 'mono'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700'
            }`}
          >
            모노스페이스
          </button>
        </div>
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
        <div className="max-w-2xl mx-auto px-8 py-6">
          {activeTab === 'general-top' ? (
            <GeneralTopContent />
          ) : activeTab === 'privacy' ? (
            <PrivacyContent />
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
