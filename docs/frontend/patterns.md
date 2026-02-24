# 프론트엔드 동작 패턴

## Quick Chat 모드 (`App.tsx`)

`App.tsx`에서 URL 쿼리 `?mode=quick-chat` 감지 시 `QuickChatPage`를 렌더링 (트레이 팝업 전용):

- **모듈 스코프에서 판별**: `const isQuickChatMode = new URLSearchParams(window.location.search).get('mode') === 'quick-chat'` — 렌더링 시점이 아닌 모듈 로드 시 결정
- **초기 로드 최소화**: 퀵챗 모드에서는 `loadSettings()`만 호출 (세션/프로젝트 로드 불필요)
- **navigate-to-session 리스너**: 퀵챗이 아닌 메인 윈도우에서만 `onNavigateToSession` 콜백 등록. 퀵챗에서 전송 → 메인 윈도우가 세션 이동 + 메시지 전송 수행

### 데스크톱 설정 → Electron IPC 즉시 반영 패턴

`setQuickAccessShortcut`, `setShowInMenuBar` 등 데스크톱 전용 설정은 백엔드 persist와 동시에 `window.electron` IPC를 호출하여 Electron main process에 즉시 반영:

```typescript
setQuickAccessShortcut: (v) => {
  set({ quickAccessShortcut: v })
  settingsApi.set('quick_access_shortcut', v)       // 백엔드 persist
  window.electron?.setQuickAccessShortcut(v)         // Electron main에 즉시 반영
}
```

웹 모드에서는 `window.electron`이 없으므로 optional chaining으로 안전하게 무시.

## 화면 전환 흐름

`MainLayout.tsx` (`widgets/main-layout/`)에서 뷰 디스패치 (우선순위 순서):

1. `settingsOpen === true` → SettingsScreen 표시
2. `projectsOpen === true` → `selectedProjectId` 존재 시 ProjectDetailScreen, 없으면 ProjectsScreen
3. `allChatsOpen === true` → AllChatsScreen 표시
4. `currentSessionId === null` → HomeScreen 표시
5. `currentSessionId !== null` → ChatPage 표시 (ChatHeader + MessageList + PromptInput)

- "새 채팅" 버튼: `closeSettings()` + `deselectSession()` → `currentSessionId = null`, `allChatsOpen = false`, `projectsOpen = false`
- 세션 선택: `closeSettings()` + `selectSession(id)` → `allChatsOpen = false`, `projectsOpen = false` (자동 복귀)
- "모든 채팅" 버튼: `openAllChats()` → `allChatsOpen = true`, `projectsOpen = false`, `currentSessionId = null`
- "프로젝트" 버튼: `openProjects()` → `projectsOpen = true`, `allChatsOpen = false`, `currentSessionId = null`, `selectedProjectId = null`
- 특정 프로젝트 상세로 직접 이동: `openProjects()` → `selectProject(id)` 순서로 호출 (Sidebar 프로젝트 항목 클릭, ChatHeader 프로젝트명 클릭에서 동일 패턴 사용)
- HomeScreen에서 메시지 전송 시: `createSession` → `sendMessage` 순서로 호출

사이드바 네비게이션 시 `closeSettings()` 호출 필수. 누락 시 설정 화면이 닫히지 않음.

## 키보드 단축키

| 단축키 | 동작 | 등록 위치 |
|--------|------|-----------|
| `Cmd+K` / `Ctrl+K` | 검색 모달 토글 | `MainLayout.tsx` (글로벌 keydown 리스너) |
| `Cmd+,` / `Ctrl+,` | 설정 화면 토글 | `MainLayout.tsx` (글로벌 keydown 리스너) |

## 한국어 IME 처리

`onKeyDown`에서 Enter 키 처리 시 반드시 `!e.nativeEvent.isComposing` 체크:

```tsx
onKeyDown={(e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
    e.preventDefault()
    handleSubmit()
  }
}}
```

누락 시 한글 조합 중 Enter가 두 번 발생하여 메시지 중복 전송 + 글자 소실.

## 검색 모달 (SearchModal)

`packages/frontend/src/features/search/ui/SearchModal.tsx`

- **열기/닫기**: `useSessionStore`의 `searchOpen` / `openSearch()` / `closeSearch()` 사용
- **키보드 네비게이션**: `selectedIndex` 상태로 `ArrowUp`/`ArrowDown` 이동, `Enter`로 선택
- **선택 항목 표시**: 배경색 `bg-neutral-100 dark:bg-neutral-700` + 오른쪽 `CornerDownLeft` 아이콘
- **비선택 항목 표시**: 오른쪽에 `formatRelativeTime()` 상대 시간
- **검색어 하이라이트**: `highlightMatch()` 로컬 함수로 매칭 부분 `<strong>` 볼드 처리
- **자동 스크롤**: `selectedIndex` 변경 시 `scrollIntoView({ block: 'nearest' })`
- **마우스 연동**: `onMouseEnter`로 호버 시 `selectedIndex` 갱신
- **query 변경 시**: `selectedIndex`를 0으로 리셋 (`handleQueryChange` 래퍼)
- **React hooks 순서**: 모든 `useEffect`/`useCallback`은 early return (`if (!searchOpen) return null`) 위에 배치

## 컨텍스트 메뉴 → 모달 브릿지 패턴

사이드바 컨텍스트 메뉴에서 모달을 열어야 할 때, 중간 상태(`moveToProjectSessionId`)를 사용하여 메뉴 닫기 → 모달 열기를 분리:

```tsx
// Sidebar.tsx
const [moveToProjectSessionId, setMoveToProjectSessionId] = useState<string | null>(null)

// 컨텍스트 메뉴 콜백: 메뉴 닫기 + 대상 ID 설정
onMoveToProject={() => {
  setMoveToProjectSessionId(menuSessionId)
  setMenuSessionId(null)      // 메뉴 닫기
  setMenuAnchor(null)
}}

// 모달: 대상 ID 존재 여부로 open 제어
<MoveToProjectModal
  open={moveToProjectSessionId !== null}
  onSelect={(projectId) => {
    updateSessionProjectId(moveToProjectSessionId!, projectId)
    setMoveToProjectSessionId(null)  // 모달 닫기
  }}
/>
```

- 컨텍스트 메뉴와 모달이 동시에 열리지 않도록 메뉴를 먼저 닫고 모달 대상 ID를 설정
- `SessionContextMenu`의 `projectId` prop에 따라 메뉴 항목이 조건부 렌더링됨 (`null` → "프로젝트에 추가", 非null → "프로젝트 변경" + "프로젝트에서 제거")

## MoveToProjectModal

`packages/frontend/src/features/manage-project/ui/MoveToProjectModal.tsx`

SearchModal과 동일한 UI 패턴을 따르는 프로젝트 선택 모달:

- **키보드 네비게이션**: `selectedIndex` + ArrowUp/Down/Enter/Escape (SearchModal과 동일)
- **필터링**: `useProjectStore.projects`를 query로 클라이언트 사이드 필터링
- **현재 프로젝트 제외**: `currentProjectId`와 일치하는 프로젝트는 리스트에서 제외
- **props 기반 open/close**: SearchModal과 달리 스토어가 아닌 부모 컴포넌트의 상태로 제어 (`open`, `onClose`, `onSelect`)

## HomeScreen

`packages/frontend/src/pages/home/HomeScreen.tsx`

- **시간대 인사**: `getGreeting()` — 오전(6-12시)/오후(12-18시)/저녁(18-6시) 구분
- **퀵 액션**: `QUICK_ACTIONS` 배열 — "작성하기", "학습하기", "코드", "일상생활", "Claude의 선택" 프리셋 프롬프트

## AllChatsScreen

`packages/frontend/src/pages/all-chats/AllChatsScreen.tsx`

- **진입**: 사이드바 "모든 채팅" 버튼 (`openAllChats()`)
- **레이아웃**: 제목("채팅") + 검색 입력 + 개수 표시("채팅 N개") + 세션 리스트
- **검색**: SearchModal과 동일한 클라이언트 사이드 제목 필터링 (`title.toLowerCase().includes(query)`)
- **항목 클릭**: `selectSession(id)` 호출 → store에서 `allChatsOpen = false`로 자동 복귀

## ProjectDetailScreen

`packages/frontend/src/pages/project-detail/ProjectDetailScreen.tsx`

- **진입**: `projectsOpen === true && selectedProjectId !== null` (ChatArea.tsx에서 분기)
- **우측 사이드바**: 지침(instructions) + 파일 섹션. 메모리 섹션은 없음.
- **지침 편집 패턴**: `isEditingInstructions` / `instructionsDraft` 상태로 보기↔편집 모드 전환
  - 내용 없을 때: 플레이스홀더 텍스트 + Plus 버튼 → 편집 모드 진입
  - 내용 있을 때: 텍스트 클릭 → 편집 모드 진입
  - 편집 모드: textarea + 취소/저장 버튼, Escape로 취소
  - 저장: `useProjectStore.updateInstructions(id, draft)` 호출

## 사이드바 레이아웃 (Sidebar)

`packages/frontend/src/widgets/sidebar/ui/Sidebar.tsx`

3-zone 고정/스크롤 구조:

```
┌─────────────────┐
│ [+] 새 채팅      │ ← shrink-0 (고정 상단)
│ [🔎] 검색        │
│─────────────────│
│ [📂] 프로젝트    │ ← flex-1 overflow-y-auto (스크롤)
│ 즐겨찾기          │
│  ★ 세션 A       │
│ 최근 항목         │
│  세션 1          │
│  세션 2          │
│─────────────────│
│ [DC] D Chat User│ ← shrink-0 border-t (고정 하단, 클릭→설정 메뉴)
└─────────────────┘
```

- **상단 고정**: 새 채팅 + 검색 — 테두리 없는 텍스트 행 (`flex items-center gap-3`)
- **중간 스크롤**: 프로젝트 버튼 + 즐겨찾기 섹션(있을 때만) + "최근 항목" 라벨 + 세션 목록 (최대 30개)
- **하단 고정**: 프로필 영역 (아바타 이니셜 + 이름) — 클릭 시 설정 메뉴. 이름과 아바타 이니셜은 `useSettingsStore`의 `fullName`에서 동적 추출 (미설정 시 "D Chat User" / "DC" 폴백)

### 즐겨찾기 섹션

`sessions.some((s) => s.isFavorite)`가 true일 때만 "즐겨찾기" 라벨 + 즐겨찾기 세션 목록 표시. 즐겨찾기가 없으면 섹션 자체가 렌더링되지 않음. "최근 항목"은 `sessions.filter((s) => !s.isFavorite)`만 표시.

### 세션 목록 30개 제한

사이드바는 `sessions.filter((s) => !s.isFavorite).slice(0, 30)`으로 비즐겨찾기 최근 30개만 렌더링. 즐겨찾기 세션은 제한 없이 모두 표시. 비즐겨찾기가 30개 초과 시 목록 하단에 "모든 채팅" 버튼 표시.

### 백그라운드 스트리밍 인디케이터

세션 목록에서 다른 세션이 스트리밍 중일 때 녹색 pulsing dot 표시:

- **위치**: 세션 제목 **왼쪽** (`mr-1.5`)
- **조건**: `streamingSessionIds.has(session.id) && session.id !== currentSessionId` — 현재 보고 있는 세션에는 미표시
- **스타일**: `h-2 w-2 shrink-0 rounded-full bg-green-500 animate-pulse`

## 스트리밍 중단 (Stop Streaming)

`packages/frontend/src/widgets/prompt-input/ui/PromptInput.tsx`

- **버튼 토글**: `isStreaming` 상태에 따라 전송 버튼 ↔ 중지 버튼 전환
  - `isStreaming === true` → 회색 정지(■) 버튼, `onClick={stopStream}`
  - `isStreaming === false` → 파란 전송(↑) 버튼, `onClick={handleSubmit}`
- **textarea**: 스트리밍 중에도 활성 상태 유지 (`disabled={!currentSessionId}`)
- **Enter 전송 차단**: `handleSubmit` 내에서 `isStreaming` 체크하여 스트리밍 중 전송 방지

## Artifact 자동 열기

스트리밍 완료 시 HTML 코드 블록이 있으면 아티팩트 패널을 자동으로 여는 로직. `MessageList.tsx`의 `useEffect`에서 처리.

- **위치**: `MessageList.tsx` — `prevStreamingRef`로 `isStreaming` true→false 전환 감지
- **스토어에 넣지 않는 이유**: `onEnd` 콜백 내에서 `artifactPanel`을 동시 업데이트하면 React 배치 렌더링에서 상태 불일치 발생. 컴포넌트 `useEffect`로 분리하여 메시지 반영 후 패널 열기 순서 보장.
- **수정 시 주의**: HTML 감지 정규식(`/```html\n([\s\S]*?)```/`)은 MessageBubble의 CodeBlock 파싱과 동일 패턴이어야 함

## 메시지 재생성 패턴 (Regeneration)

User/Assistant 모두 동일한 `regenerateMessage(messageId)` 경로를 사용하되, role에 따라 삭제 범위가 다름:

- **User "재시도"**: 대상 user 메시지 **유지**, 이후 메시지 모두 삭제 → 새 assistant 응답 스트리밍
- **Assistant "재생성"**: 대상 assistant 메시지 **포함** 이후 모두 삭제 → 새 assistant 응답 스트리밍

프론트엔드(`session.store`)와 백엔드(`chat.service`) 양쪽에서 동일한 role 기반 분기 로직 적용:
```typescript
const keepCount = target.role === 'user' ? targetIndex + 1 : targetIndex
```

## 낙관적 업데이트와 메시지 ID 동기화

`sendMessage`는 즉각적인 UI 반영을 위해 `crypto.randomUUID()`로 프론트엔드 전용 user 메시지 ID를 생성 (낙관적 업데이트). 백엔드(`chat.service`)는 별도로 `generateId()`를 호출하여 DB에 저장하므로, 동일 메시지에 대해 프론트엔드/백엔드 ID가 다름.

`onEnd` 콜백에서 스트리밍 완료 후 `chatApi.getMessages(sessionId)`로 DB를 re-fetch하여 프론트엔드 `messages` 배열의 ID를 백엔드 ID로 교체. 이 동기화가 없으면 재생성(`regenerateMessage`) 시 백엔드에서 메시지를 찾지 못함.

- **`sendMessage` 수정 시**: 낙관적 ID가 `onEnd` re-fetch 전까지만 유효함을 인지할 것
- **`onEnd` 수정 시**: re-fetch 로직 제거 금지. 제거 시 user 재생성이 깨짐
- **assistant 메시지**: SSE `end` 이벤트로 백엔드 ID가 직접 전달되므로 불일치 없음

## Filesystem Config — 디렉토리 인라인 편집 패턴

`SettingsScreen.tsx`의 `ExtensionsContent` — Filesystem MCP 서버 디렉토리 설정 UI:

- `directories` 상태 배열에 빈 문자열 `''`이 포함될 수 있음 = 아직 경로 미입력 행
- "+ directory 추가" → `setDirectories([...directories, ''])` (빈 행 추가)
- 각 행: 텍스트 input + `FolderOpen` 아이콘 버튼(picker) + `X` 버튼(삭제)
- `handlePickDirectory(index)`: `pickDirectory()` 호출 → 결과를 해당 인덱스에 설정
- `handleSave`: `directories.filter(d => d.trim())`로 빈 행 제거 후 서버에 저장
- `needsConfig`/저장 버튼 disabled 판별도 동일하게 빈 문자열 필터 후 체크
- **수정 시 주의**: `directories.length === 0` 대신 `directories.filter(d => d.trim()).length === 0`으로 유효 디렉토리 존재 여부 확인 (빈 행이 있을 수 있으므로)

## 백업 가져오기 후 스토어 갱신

`SettingsScreen`의 `PrivacyContent`에서 백업 가져오기(import) 성공 후 반드시 `loadSettings()` + `loadSessions()`를 순서대로 호출해야 함.

```typescript
await backupApi.importBackup(data)
await loadSettings()   // 복원된 설정 반영
await loadSessions()   // 복원된 세션을 사이드바에 표시
```

- `loadSettings()`만 호출하면 복원된 세션이 사이드바에 표시되지 않음
- `loadSessions()`만 호출하면 복원된 설정(테마, 프로필 등)이 UI에 반영되지 않음
