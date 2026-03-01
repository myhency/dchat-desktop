# 프론트엔드 동작 패턴

## Zustand 셀렉터에서 안정적 참조 사용

Zustand 셀렉터에서 폴백 값(`?? []`, `?? {}`)을 인라인으로 쓰면 매 호출마다 새로운 참조가 생성되어 `useSyncExternalStore`가 무한 리렌더를 일으킴:

```tsx
// ❌ 매번 새 배열 참조 → 무한 루프
const segments = useSessionStore((s) => s.streamingSegments[id] ?? [])

// ✅ 모듈 스코프 상수 → 안정적 참조
const EMPTY_SEGMENTS: StreamingSegment[] = []
const segments = useSessionStore((s) => s.streamingSegments[id] ?? EMPTY_SEGMENTS)
```

`Record<string, T[]>` 같은 동적 키 구조에서 키가 없을 때 폴백을 반환하는 셀렉터를 작성할 때 반드시 적용할 것.

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
- **프로젝트 선택**: `selectedProject: { id, name } | null` 로컬 상태. PromptMenu의 `onProjectSelect` 콜백으로 설정, "+" 버튼 옆에 배지/칩으로 표시. `handleSubmit`에서 `createSession('New Chat', model, selectedProject?.id)` 전달. 성공 시 초기화, 실패 시 복원. 글로벌 스토어가 아닌 로컬 상태인 이유: 새 대화 생성 전에만 유효한 일시적 UI 상태

## AllChatsScreen

`packages/frontend/src/pages/all-chats/AllChatsScreen.tsx`

- **진입**: 사이드바 "모든 채팅" 버튼 (`openAllChats()`)
- **레이아웃**: 제목("채팅") + 검색 입력 + 개수 표시("채팅 N개") + 세션 리스트
- **검색**: SearchModal과 동일한 클라이언트 사이드 제목 필터링 (`title.toLowerCase().includes(query)`)
- **항목 클릭**: `selectSession(id)` 호출 → store에서 `allChatsOpen = false`로 자동 복귀

## ProjectDetailScreen

`packages/frontend/src/pages/project-detail/ProjectDetailScreen.tsx`

- **진입**: `projectsOpen === true && selectedProjectId !== null` (ChatArea.tsx에서 분기)
- **우측 사이드바**: 지침(instructions) + 프로젝트 기억 + 파일 섹션
- **지침 편집 패턴**: `isEditingInstructions` / `instructionsDraft` 상태로 보기↔편집 모드 전환
  - 내용 없을 때: 플레이스홀더 텍스트 + Plus 버튼 → 편집 모드 진입
  - 내용 있을 때: 텍스트 클릭 → 편집 모드 진입
  - 편집 모드: textarea + 취소/저장 버튼, Escape로 취소
  - 저장: `useProjectStore.updateInstructions(id, draft)` 호출
- **프로젝트 기억 카드**: `memoryContent` + `memoryUpdatedAt` 상태로 관리
  - 메모리 있을 때: 미리보기 텍스트 + "마지막 업데이트: N일 전" + 헤더에 Pencil 아이콘
  - 메모리 없을 때: 안내 텍스트만 표시, Pencil 아이콘 미표시
  - 카드 클릭 또는 Pencil 클릭 → `ProjectMemoryManageModal` 열림
  - "초기화" 링크 → `DeleteProjectMemoryModal` 열림
  - `onMemoryChange` 콜백: `(content: string, updatedAt: string) => void` — 글로벌 메모리 모달과 달리 `updatedAt`도 함께 전달
  - 삭제 확인 시 `memoryUpdatedAt`도 `null`로 리셋
- **ProjectMemoryManageModal / DeleteProjectMemoryModal**: `SettingsScreen`의 글로벌 `MemoryManageModal`/`DeleteMemoryModal`과 동일한 구조. 로컬 컴포넌트로 같은 파일에 정의

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

## sendMessage onEnd: 스트리밍 클리어와 메시지 로드의 원자적 업데이트

`sendMessage`의 `onEnd` 핸들러에서 현재 세션인 경우, 스트리밍 상태 클리어(`streamingSessionIds`, `streamingSegments`)와 DB 메시지 로드(`messages`)를 **반드시 한 번의 `set()` 호출**로 처리해야 함.

```typescript
// ❌ 2단계 set → 중간 상태에서 스트리밍 콘텐츠가 DOM에서 제거되어 스크롤 점프 발생
set({ streamingSessionIds: newIds, streamingSegments: rest })  // 콘텐츠 사라짐
chatApi.getMessages(sessionId).then((msgs) => set({ messages: msgs }))  // 뒤늦게 복원

// ✅ fetch 완료 후 한번에 set → 콘텐츠 높이가 유지됨
chatApi.getMessages(sessionId).then((msgs) => {
  set({ messages: msgs, streamingSessionIds: newIds, streamingSegments: rest })
})
```

**원인**: 1차 `set()`으로 `isStreaming`이 `false`가 되면 `MessageList`의 `{isStreaming && streamingSegments...}` 블록이 DOM에서 제거됨 → 콘텐츠 높이 급감 → 브라우저 scroll 이벤트가 "유저 위로 스크롤"로 오인 → `isNearBottom = false` → 2차 `set()` 후 auto-scroll 비활성화 → 사용자가 최상단에 고정됨.

**예외**: `regenerateMessage`/`editMessage`의 `onEnd`는 atomic `set()` 내에서 `messages: [...s.messages, message]`로 스트리밍 콘텐츠를 즉시 대체하므로 높이 급감이 없음. `stopStream`은 사용자 의도적 중단이므로 스크롤 위치 변경은 기대 동작.

## MessageList handleScroll: nearBottom 우선 체크

`handleScroll`에서 `nearBottom`을 `scrolledUp`보다 **먼저** 체크해야 함:

```typescript
// ✅ nearBottom 우선 → 콘텐츠 높이 변화로 scrollTop이 줄어도 하단이면 isNearBottom 유지
if (nearBottom) {
  isNearBottomRef.current = true
} else if (scrolledUp) {
  isNearBottomRef.current = false
}
```

`scrolledUp`을 먼저 체크하면 콘텐츠 높이가 변할 때(메시지 교체, 이미지 로드 등) `scrollTop` 감소를 "유저 스크롤업"으로 오인하여 auto-scroll이 꺼짐. `nearBottom` 우선 체크는 이에 대한 방어.

## 내장 도구 설정 (ExtensionsContent)

`SettingsScreen.tsx`의 `ExtensionsContent` — 내장 도구(Filesystem & Shell) 설정 UI:

- **저장 방식**: settings API 직접 사용 (`builtin_tools_allowed_dirs`, `builtin_tools_shell_enabled`). 외부 MCP 서버 API 미사용.
- `directories` 상태 배열에 빈 문자열 `''`이 포함될 수 있음 = 아직 경로 미입력 행
- "+ 디렉토리 추가" → `setDirectories([...directories, ''])` (빈 행 추가)
- 각 행: 텍스트 input + `FolderOpen` 아이콘 버튼(picker) + `X` 버튼(삭제)
- `handleSave`: `directories.filter(d => d.trim())`로 빈 행 제거 후 JSON으로 저장
- `hasDirectories` 판별: `directories.filter(d => d.trim()).length > 0` (빈 행이 있을 수 있으므로 length 비교)
- Shell 토글: `shellEnabled` boolean → `"true"/"false"` 문자열로 저장
- **상태 표시**: `builtinStatus` 상태로 `settingsApi.getBuiltinToolsStatus()` fetch → Filesystem 카드에 색상 dot + 라벨 (`실행 중`/`오류`/`비활성화`). `handleSave` 후에도 재fetch (`fetchBuiltinStatus()`).
- **에러 배너**: `builtinStatus.errors`가 있으면 filesystem 설정 뷰에서 접근 불가 디렉토리 목록을 빨간 배너로 표시
- **에러 핸들링**: `useEffect`의 `Promise.all([...]).catch(() => { setLoaded(true) })` — API 실패 시에도 loaded 상태 설정하여 무한 로딩 방지
- **dirty 추적 (Save 가드)**: `loadedDirsRef`에 API에서 로드된 원본 디렉토리를 저장. `isDirsDirty = JSON.stringify(현재) !== JSON.stringify(loadedDirsRef)`로 비교. Save 버튼은 `disabled={saving || !loaded || !isDirsDirty}`로 변경 전/로드 전 저장을 차단. `handleSave` 성공 후 `loadedDirsRef`를 동기화하여 dirty 플래그 리셋. 이 가드가 없으면 컴포넌트 마운트 시 `directories = []`인 상태에서 Save가 가능하여 기존 설정이 빈 배열로 덮어써짐

## MessageList 전송 시 스크롤: 사용자 메시지를 뷰포트 상단에 정렬

메시지 전송 시 force-scroll은 목록 최하단(`bottomRef`)이 아닌 **마지막 user 메시지**(`lastUserMsgRef`)의 상단 edge를 뷰포트 상단에 정렬:

```typescript
// force-scroll effect (messages.length 변경 시)
lastUserMsgRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
```

- **목적**: 사용자 메시지가 뷰포트 상단에 위치하면 스트리밍 응답이 아래로 자연스럽게 채워지는 UX
- **auto-scroll 연계**: force-scroll 시 `isNearBottomRef = true`로 설정하므로, 스트리밍 중 auto-scroll(`el.scrollTo({ top: el.scrollHeight })`)이 정상 작동
- **래퍼 div**: 비-segment 메시지는 `<div key={msg.id}>` 래퍼로 감싸여 있음. 마지막 user 메시지에만 `lastUserMsgRef` 할당. 이 래퍼를 제거하면 ref 할당 불가
- **"아래로 스크롤" 버튼**: 여전히 `bottomRef`를 사용하여 목록 최하단으로 스크롤 (변경 없음)

## 도구 호출 그룹핑 및 렌더링 (ToolCallGroup + ToolCallBlock)

연속된 tool 세그먼트를 `ToolCallGroup`으로 묶어 접기/펼치기가 가능한 그룹으로 렌더링. `MessageList.tsx`의 `groupSavedSegments()`/`groupStreamingSegments()` 헬퍼가 연속된 tool 세그먼트를 `toolGroup`으로 그룹핑.

```
[text] [tool] [tool] [tool] [text] [tool]
  →  text, toolGroup(3개), text, toolGroup(1개)
```

### ToolCallGroup (그룹 컨테이너)
- **헤더**: 도구 1개면 도구 이름, N개면 `"도구 N개 사용"` + 상태 요약
- **자동 동작**: 저장된 메시지(allDone)는 접힌 상태로 시작, 스트리밍 중은 펼친 상태. `confirming` 도구 발생 시 자동 펼침, 모든 도구 완료 시 자동 접힘.
- **스타일**: confirming 도구가 있으면 amber border/bg 적용 (그룹 전체)

### ToolCallBlock (그룹 내 개별 행)
- **컴팩트 레이아웃**: 왼쪽 첫 글자 원형 아이콘 + 도구 이름 + 상태 배지 (`결과`/`요청 중`/`확인 필요`/`오류`)
- **커넥터 라인**: `isLast` prop으로 제어. 마지막 아이템이 아니면 원형 아이콘 아래에 세로 라인 표시
- **펼침**: 클릭 시 입력 JSON, 결과, 확인 버튼 표시 (기존 상세 UI)

### 렌더링 경로
- **스트리밍 중**: `groupStreamingSegments(streamingSegments)` → `ToolCallGroup` with `isStreaming`
- **스트리밍 후**: `groupSavedSegments(msg.segments)` → `ToolCallGroup` without `isStreaming`
- **segments 없는 메시지**: 기존처럼 단일 `MessageBubble`로 렌더링 (하위 호환)
- **수정 시 주의**: `ToolCallBlock`은 `ToolCallGroup` 내부에서만 사용. `MessageList`는 `ToolCallGroup`만 import. 새 도구 상태 추가 시 `StatusBadge`(ToolCallBlock 내 로컬 컴포넌트)와 `ToolCallGroup` 헤더 상태 요약 양쪽 수정 필요.

## 도구 블록 즉시 표시 패턴 (tool_start → tool_use 폴백)

`session.store.ts`의 `sendMessage` 콜백에서 `onToolStart`와 `onToolUse`가 협력하여 도구 블록을 즉시 표시:

- **`onToolStart`**: 빈 input(`{}`)으로 tool 세그먼트를 즉시 생성 → UI에 스피너 즉시 표시
- **`onToolUse`**: 동일 `toolUseId`의 세그먼트가 이미 존재하면 `updateToolInSegments`로 `toolInput`만 업데이트. 존재하지 않으면(폴백) 새 세그먼트 생성.
- **폴백이 필요한 이유**: `tool_start`를 보내지 않는 LLM 어댑터(OpenAI 등)에서도 `onToolUse`만으로 기존 동작 유지.
- **ToolCallBlock 빈 input 처리**: `Object.keys(toolInput).length === 0`이면 "입력 생성 중..." 텍스트 표시. `tool_use` 수신 시 실제 JSON으로 교체.
- **수정 시 주의**: `onToolStart`와 `onToolUse`에서 세그먼트 존재 여부 확인이 `toolUseId` 기준. ID 체계가 변경되면 양쪽 모두 수정 필요.

## 도구 확인 UI (ToolCallBlock)

`ToolCallBlock.tsx` — 위험한 도구 실행 시 사용자 승인/거부 UI (ToolCallGroup 내부 개별 행의 펼침 상태에서 표시):

- **`ToolCallInfo.status`**: `'calling' | 'done' | 'error' | 'confirming'` — `confirming`은 승인 대기 상태
- **자동 확장**: `confirming` 상태 전환 시 `useEffect`로 `setExpanded(true)` 호출. `useState(isConfirming)` 초기값만으로는 마운트 이후 `calling → confirming` 전환을 감지하지 못함 (동일 `key`의 컴포넌트 인스턴스이므로 `useState` 초기값 무시됨)
- **승인/거부 버튼**: `confirmTool(toolUseId, approved)` → `chatApi.confirmTool()` 호출 + UI 상태 갱신
  - 승인 시: `status → 'calling'` (도구 실행 계속)
  - 거부 시: `status → 'error'`, `result: 'User denied the tool execution.'`
- **SSE 이벤트**: `onToolConfirm` 콜백으로 `activeToolCalls`에서 동일 `toolUseId`를 가진 기존 항목의 `status`를 `'confirming'`으로 업데이트 (새 항목 추가가 아님)
- **렌더링 순서 제약** (`MessageList.tsx`): 스트리밍 텍스트 버블을 tool blocks **위에** 렌더링해야 함. tool blocks가 최하단에 위치해야 auto-scroll 영역에서 확인 버튼이 보임. 순서가 반대면 스트리밍 텍스트가 tool blocks를 화면 밖으로 밀어내어 확인 버튼이 보이지 않고, 60초 타임아웃으로 자동 거부됨

## 메모리 관리 UI (FeaturesContent)

`SettingsScreen.tsx`의 `FeaturesContent` — 메모리 카드 + 2개 모달:

### 메모리 카드

- `memoryData` 상태: `{ content: string; updatedAt: string | null } | null`
- `hasMemory` 조건: `memoryData && memoryData.content` (빈 문자열이면 falsy)
- 카드 클릭 → `MemoryManageModal` 열림
- 휴지통 아이콘: 카드 내부 중첩 `<button>` + `e.stopPropagation()`으로 카드 클릭 이벤트 전파 방지 → `DeleteMemoryModal` 열림
- **수정 시 주의**: 중첩 버튼 구조에서 `stopPropagation` 제거 시 삭제 클릭이 모달 열기로 전파됨

### DeleteMemoryModal

- 확인 모달 패턴: 오버레이 클릭/Escape → 닫기
- 확인 시 `memoryApi.delete()` → `memoryData`를 `{ content: '', updatedAt: null }`로 리셋 (카드 숨김)

### MemoryManageModal

- `memoryContent`를 `## ` 기준으로 split하여 섹션별 렌더링 (헤더 bold + 본문)
- 하단 입력바: 자연어 지시사항 입력 → `memoryApi.edit({ instruction, model })` 호출 (30초 타임아웃)
- `model`: `useSettingsStore((s) => s.selectedModel)`에서 가져옴
- 응답으로 `onMemoryChange(content)` 콜백 → 부모의 `memoryData` 갱신
- 로딩 중 Escape/오버레이 닫기 비활성화

## 첨부파일 미리보기: 이미지 vs 문서 분기

`MessageBubble.tsx`의 `AttachmentPreview` 컴포넌트와 `PromptInput.tsx`에서 첨부파일 타입에 따라 렌더링을 분기:

- **이미지** (`mimeType.startsWith('image/')`) → `<img>` 태그로 base64 미리보기
- **문서** (PDF, DOCX 등) → `FileText` 아이콘 + 파일명 텍스트

```tsx
// MessageBubble.tsx — AttachmentPreview 컴포넌트
if (attachment.mimeType.startsWith('image/')) {
  return <img src={`data:${mimeType};base64,${base64Data}`} ... />
}
return <div><FileText /><span>{attachment.fileName}</span></div>
```

- **수정 시 주의**: `PromptInput.tsx`에도 동일한 분기가 인라인으로 존재. 새 파일 타입 추가 시 양쪽 모두 수정 필요.
- **웹 모드 파일 선택** (`native.ts`): `input.accept`에 문서 MIME 타입 포함. `MIME_FALLBACK` 맵으로 확장자 기반 폴백 MIME 감지 (브라우저가 비이미지 파일의 `file.type`을 비워두는 경우 대비).

## ErrorBoundary 에러 저장

`packages/frontend/src/shared/ui/ErrorBoundary.tsx` — 앱 전역 에러 캐치 + fallback UI.

- **위치**: `main.tsx`에서 `<App />` 감싸기 (`<ErrorBoundary><App /></ErrorBoundary>`)
- **"오류 저장하기" 버튼**: `apiFetch('/api/error-reports', { method: 'POST', body: ... })` 호출 → `~/.dchat/crash-reports/`에 파일 저장
- **상태 머신**: `saveState: 'idle' | 'saved' | 'failed'` — 버튼 텍스트/아이콘이 상태에 따라 전환, 2초 후 `idle`로 복귀
- **수정 시 주의**: ErrorBoundary fallback은 React 트리 외부에서 렌더링되므로, Zustand 스토어나 Context에 의존하지 않음. `apiFetch`만 직접 import하여 사용

## PromptMenu 서브메뉴 패턴

`packages/frontend/src/widgets/prompt-input/ui/PromptMenu.tsx`

"프로젝트에 추가" 메뉴 항목에 호버 시 프로젝트 목록 서브메뉴가 오른쪽에 표시. SettingsMenu의 "자세히 알아보기" 서브메뉴와 동일한 패턴:

```tsx
<div ref={itemRef} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
  <button>메뉴 항목 <ChevronRight /></button>
  {show && (() => {
    const rect = itemRef.current?.getBoundingClientRect()
    return <div className="fixed z-50 ..." style={{ top: rect.top, left: rect.right + 4 }}>
      {/* 서브메뉴 내용 */}
    </div>
  })()}
</div>
```

- **위치 계산**: `itemRef`의 `getBoundingClientRect()`로 서브메뉴를 항목 오른쪽에 정렬 (`left: rect.right + 4`)
- **호버 시 배경**: `showProjects ? 'bg-neutral-100' : 'hover:bg-neutral-100'` — 서브메뉴 열림 상태일 때 배경 고정
- **optional callback**: `onProjectSelect?.(id, name)` — HomeScreen에서만 전달, ChatPage의 PromptInput에서는 미전달
- **수정 시 주의**: 새 서브메뉴 추가 시 이 패턴(SettingsMenu + PromptMenu)을 참조. `onMouseEnter/Leave`는 래퍼 div에, 서브메뉴는 `fixed z-50`으로 래퍼 밖에 배치

## 설정 탭 간 이동 (onNavigate 패턴)

설정 내 한 탭에서 다른 탭으로 이동하려면 `onNavigate: (tab: Tab) => void` prop을 사용. `SettingsScreen`에서 `setActiveTab`을 전달:

```tsx
// FeaturesContent에서 "사용자 지정" 탭으로 이동
function FeaturesContent({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  return <button onClick={() => onNavigate('customization')}>사용자 지정으로 이동</button>
}

// SettingsScreen에서
activeTab === 'features' ? <FeaturesContent onNavigate={setActiveTab} />
```

- 기존 적용: `ExtensionsContent`(확장 → 개발자 탭 이동), `FeaturesContent`(기능 → 사용자 지정 탭 이동)
- `customization` 탭은 `max-w` 없이 `h-full` 사용 (2-column 레이아웃이 가용 폭을 모두 채우고, 파일 프리뷰만 내부 스크롤). 나머지 탭은 `max-w-2xl`

## CustomizationContent (사용자 지정 탭)

`SettingsScreen.tsx`의 `CustomizationContent` — 스킬 전용 관리 페이지:

- **2-column 레이아웃**: 왼쪽 스킬 리스트(`w-[300px] shrink-0`) + 오른쪽 상세 패널(`flex-1 min-w-0`, border-l 구분)
- **높이 체인 (내부 스크롤)**: 콘텐츠 래퍼(`h-full`) → 스킬 레이아웃(`h-full`) → 우측 패널(`h-full`) → 프리뷰 컨테이너(`flex-1 flex flex-col min-h-0`) → 프리뷰 스크롤(`flex-1 overflow-y-auto`). 이 체인이 끊기면 파일 프리뷰 대신 전체 페이지가 스크롤됨. 헤더/설명은 고정, 파일 내용만 스크롤.
- **왼쪽 패널**: 검색, `+` 드롭다운(3가지 생성 방법), "내 스킬"/"예시 스킬" 탭, 스킬 리스트
- **오른쪽 패널**: 선택된 스킬의 이름, 설명, 활성 토글, 지시사항 미리보기(monospace pre), 수정/삭제 버튼. 미선택 시 빈 상태
- **3가지 스킬 생성**: Claude와 함께 창작하기(설정 닫고 새 채팅), 스킬 지침 작성(모달), 스킬 업로드(파일 파싱)
- **파일 업로드 파싱** (`parseSkillMarkdown`): YAML frontmatter(`---name/description---`) 파싱 → 없으면 첫 heading을 이름으로 사용
- **수정 시 주의**: 스킬 삭제 시 `selectedSkillId`가 삭제 대상이면 null로 리셋 필요

## 백업 가져오기 후 스토어 갱신

`SettingsScreen`의 `PrivacyContent`에서 백업 가져오기(import) 성공 후 반드시 `loadSettings()` + `loadSessions()`를 순서대로 호출해야 함.

```typescript
await backupApi.importBackup(data)
await loadSettings()   // 복원된 설정 반영
await loadSessions()   // 복원된 세션을 사이드바에 표시
```

- `loadSettings()`만 호출하면 복원된 세션이 사이드바에 표시되지 않음
- `loadSessions()`만 호출하면 복원된 설정(테마, 프로필 등)이 UI에 반영되지 않음
