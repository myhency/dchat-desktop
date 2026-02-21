import { useState } from 'react'
import { useSettingsStore } from '../../stores/settings.store'

type Tab =
  | 'privacy'
  | 'billing'
  | 'usage'
  | 'features'
  | 'connectors'
  | 'claude-code'
  | 'collaboration'
  | 'general'
  | 'extensions'
  | 'developer'

const TABS: { section?: string; id: Tab; label: string }[] = [
  { id: 'privacy', label: '개인정보보호' },
  { id: 'billing', label: '결제' },
  { id: 'usage', label: '사용량' },
  { id: 'features', label: '기능' },
  { id: 'connectors', label: '커넥터' },
  { id: 'claude-code', label: 'Claude Code' },
  { id: 'collaboration', label: '협업' },
  { section: '데스크톱 앱', id: 'general', label: '일반' },
  { id: 'extensions', label: '확장 프로그램' },
  { id: 'developer', label: '개발자' }
]

const ROLES = [
  '소프트웨어 엔지니어',
  '데이터 사이언티스트',
  '프로덕트 매니저',
  '디자이너',
  '학생',
  '기타'
]

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
            { id: 'light' as const, label: '기본', icon: '☀️' },
            { id: 'auto' as const, label: '자동', icon: '🖥️' },
            { id: 'dark' as const, label: '다크', icon: '🌙' }
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
              <span className="text-lg">{mode.icon}</span>
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
  const [activeTab, setActiveTab] = useState<Tab>('privacy')

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
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
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
          {activeTab === 'privacy' ? (
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
