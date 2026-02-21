# 프론트엔드 컨벤션

## 아이콘 컨벤션

모든 아이콘은 `lucide-react` 컴포넌트를 사용. 이모지, 유니코드 문자, 인라인 SVG 사용 금지.

```tsx
import { Search, X, Check } from 'lucide-react'

<Search size={16} className="text-neutral-400" />
```

### 사이즈 규칙

| 용도 | size |
|------|------|
| 메시지 액션 (복사, 재생성, 편집) | `14` |
| 메뉴 아이템, 사이드바 내비, 검색바, 툴바 | `16` |
| 드롭다운 내부 chevron 인디케이터 | `12` |
| 홈 인사 sparkle | `32` |
| 설정 색상모드 아이콘 | `20` |

- 색상: lucide의 `className` prop으로 Tailwind 색상 적용 (예: `className="text-neutral-400"`)
- fill 오버라이드: `<Star size={16} fill={active ? 'currentColor' : 'none'} />`, `<Square size={16} fill="currentColor" stroke="none" />`

## 버튼 Border Radius

모든 버튼은 `rounded-lg` 사용. 예외:

- **토글 스위치**: 트랙 `rounded-full`, knob `rounded-full` (구조적 원형)
- **아바타**: `rounded-full` (프로필 이미지/이니셜)
- **장식 요소**: pulsing dot, progress bar 등 비인터랙티브 요소는 `rounded-full` 허용

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

## 입력 컴포넌트 패턴

- `autoFocus` 속성으로 초기 포커스 설정
- `useEffect`로 `currentSessionId` 변경 시 입력 필드에 focus 재설정
- 하단 바 레이아웃: 왼쪽 빈 `div` + 오른쪽 `flex items-center gap-2` (모델 셀렉터 + 전송 버튼)

## 화면 전환 흐름

`MainLayout.tsx`와 `ChatArea.tsx`의 라우팅 (우선순위 순서):

1. `settingsOpen === true` → SettingsScreen 표시 (MainLayout 레벨, ChatArea 대체)
2. `projectsOpen === true` → ProjectsScreen 표시
3. `allChatsOpen === true` → AllChatsScreen 표시
4. `currentSessionId === null` → HomeScreen 표시
5. `currentSessionId !== null` → MessageList + PromptInput 표시

- "새 채팅" 버튼: `closeSettings()` + `deselectSession()` → `currentSessionId = null`, `allChatsOpen = false`, `projectsOpen = false`
- 세션 선택: `closeSettings()` + `selectSession(id)` → `allChatsOpen = false`, `projectsOpen = false` (자동 복귀)
- "모든 채팅" 버튼: `openAllChats()` → `allChatsOpen = true`, `projectsOpen = false`, `currentSessionId = null`
- "프로젝트" 버튼: `openProjects()` → `projectsOpen = true`, `allChatsOpen = false`, `currentSessionId = null`
- HomeScreen에서 메시지 전송 시: `createSession` → `sendMessage` 순서로 호출

사이드바 네비게이션 시 `closeSettings()` 호출 필수. 누락 시 설정 화면이 닫히지 않음.

## 키보드 단축키

| 단축키 | 동작 | 등록 위치 |
|--------|------|-----------|
| `Cmd+K` / `Ctrl+K` | 검색 모달 토글 | `MainLayout.tsx` (글로벌 keydown 리스너) |
| `Cmd+,` / `Ctrl+,` | 설정 화면 토글 | `MainLayout.tsx` (글로벌 keydown 리스너) |

## 검색 모달 (SearchModal)

`src/renderer/components/search/SearchModal.tsx`

- **열기/닫기**: `chat.store`의 `searchOpen` / `openSearch()` / `closeSearch()` 사용
- **키보드 네비게이션**: `selectedIndex` 상태로 `ArrowUp`/`ArrowDown` 이동, `Enter`로 선택
- **선택 항목 표시**: 배경색 `bg-neutral-100 dark:bg-neutral-700` + 오른쪽 `CornerDownLeft` 아이콘
- **비선택 항목 표시**: 오른쪽에 `formatRelativeTime()` 상대 시간
- **검색어 하이라이트**: `highlightMatch()` 로컬 함수로 매칭 부분 `<strong>` 볼드 처리
- **자동 스크롤**: `selectedIndex` 변경 시 `scrollIntoView({ block: 'nearest' })`
- **마우스 연동**: `onMouseEnter`로 호버 시 `selectedIndex` 갱신
- **query 변경 시**: `selectedIndex`를 0으로 리셋 (`handleQueryChange` 래퍼)
- **React hooks 순서**: 모든 `useEffect`/`useCallback`은 early return (`if (!searchOpen) return null`) 위에 배치

## HomeScreen

`src/renderer/components/home/HomeScreen.tsx`

- **시간대 인사**: `getGreeting()` — 오전(6-12시)/오후(12-18시)/저녁(18-6시) 구분
- **퀵 액션**: `QUICK_ACTIONS` 배열 — "작성하기", "학습하기", "코드", "일상생활", "Claude의 선택" 프리셋 프롬프트

## 스트리밍 중단 (Stop Streaming)

`src/renderer/components/chat/PromptInput.tsx`

- **버튼 토글**: `isStreaming` 상태에 따라 전송 버튼 ↔ 중지 버튼 전환
  - `isStreaming === true` → 회색 정지(■) 버튼, `onClick={stopStream}`
  - `isStreaming === false` → 파란 전송(↑) 버튼, `onClick={handleSubmit}`
- **textarea**: 스트리밍 중에도 활성 상태 유지 (`disabled={!currentSessionId}`)
- **Enter 전송 차단**: `handleSubmit` 내에서 `isStreaming` 체크하여 스트리밍 중 전송 방지

## LLM SDK Abort 패턴

스트리밍 중단 시 AbortSignal을 SDK에 전달하는 방식. 각 SDK마다 signal 전달 위치가 다름.

**Anthropic** (`src/main/adapters/outbound/llm/anthropic.adapter.ts`):

```ts
const stream = this.client.messages.stream(
  { model, max_tokens, messages },  // body
  { signal }                         // SDK options (두 번째 인자)
)
```

- ⚠️ `stream.abort()` 수동 호출은 async iterator가 정상 종료되지 않아 hang 발생. 반드시 AbortSignal을 통해 중단할 것.

**OpenAI** (`src/main/adapters/outbound/llm/openai.adapter.ts`):

```ts
const stream = await this.client.chat.completions.create(
  { model, messages, stream: true },  // body
  { signal }                           // request options (두 번째 인자)
)
```

**IPC handler** (`src/main/adapters/inbound/ipc/chat.ipc-handler.ts`):

- `chat:stop-stream` → `this.abortController.abort()`
- abort 시에도 반드시 `STREAM_END` 전송 (catch 블록에서 `{ content: '' }`로 전송)
- UI가 `isStreaming` 상태에서 빠져나올 수 있도록 보장

## 채팅 영역 레이아웃

### 콘텐츠 너비 (반응형)

MessageList와 PromptInput은 동일한 반응형 max-width를 사용하여 너비를 일치시킴:

```
max-w-[90%] md:max-w-[80%] lg:max-w-[70%] mx-auto w-full
```

- 작은 화면 (< 768px): 90%
- 중간 화면 (768px~1024px): 80%
- 큰 화면 (≥ 1024px): 70%

두 컴포넌트의 max-width 클래스는 반드시 동일하게 유지할 것. 하나만 변경하면 정렬이 어긋남.

### 스크롤바 위치

`MessageList`는 2중 div 구조:
- **외부**: `flex-1 overflow-y-auto` — 전체 너비, 스크롤바는 오른쪽 끝에 위치
- **내부**: 반응형 max-width + `mx-auto` — 콘텐츠 가운데 정렬

```tsx
<div className="flex-1 overflow-y-auto">          {/* 스크롤 컨테이너: 전체 너비 */}
  <div className="max-w-[90%] md:max-w-[80%] lg:max-w-[70%] mx-auto w-full">
    {/* 콘텐츠 */}
  </div>
</div>
```

### 스크롤 컨테이너 내부 Sticky 요소

스크롤 컨테이너 안에서 조건부로 표시되는 sticky 요소(예: 스크롤 버튼)는 **조건부 렌더링 금지**. DOM mount/unmount가 `scrollHeight`를 변경하여 빠른 스크롤 시 위치 진동(떨림) 유발.

```tsx
// ❌ 조건부 렌더링 — scrollHeight 변동으로 빠른 스크롤 시 떨림
{showButton && <button className="sticky bottom-4 ...">}

// ✅ 항상 렌더링 + CSS 토글 — scrollHeight 일정
<button className={`sticky bottom-4 ... ${
  showButton ? 'opacity-100' : 'opacity-0 pointer-events-none'
}`}>
```

### 메시지 버블 스타일

- **User**: 파란 버블 — `max-w-[80%] rounded-2xl px-4 py-3 bg-blue-600 text-white`
- **Assistant**: 배경/테두리 없음 (Claude 앱 스타일) — `max-w-none py-1 text-neutral-900 dark:text-neutral-100`

### User 메시지 Hover 액션 바

User 버블 아래에 hover 시 나타나는 액션 바 (시간, 재시도, 편집, 복사):

- **구조**: 외부 `div`에 `group` 클래스, 액션 바에 `opacity-0 group-hover:opacity-100` (CodeBlock Copy 버튼과 동일 패턴)
- **복사 피드백**: `copied` state → 체크마크 아이콘 + `text-green-500` → 2초 후 원복. `copied` 상태일 때 `opacity-100` 유지
- **아이콘 규격**: lucide-react 컴포넌트, `size={14}` (RefreshCw, Pencil, Copy, Check)
- **재시도**: `onRegenerate?.(id!)` 호출 → `chat.store.regenerateMessage(messageId)` 실행
- **편집**: 아이콘만 렌더링 (기능 미구현, 추후 연결 예정)

### Assistant 메시지 액션 바

Assistant 버블 하단에 항상 표시되는 액션 바 (복사, 재생성):

- **복사**: User 버블과 동일한 `copied` state 패턴
- **재생성**: 모든 assistant 메시지에 표시 (마지막 메시지 제한 없음). `onRegenerate(id)` 호출

### 메시지 재생성 패턴 (Regeneration)

User/Assistant 모두 동일한 `regenerateMessage(messageId)` 경로를 사용하되, role에 따라 삭제 범위가 다름:

- **User "재시도"**: 대상 user 메시지 **유지**, 이후 메시지 모두 삭제 → 새 assistant 응답 스트리밍
- **Assistant "재생성"**: 대상 assistant 메시지 **포함** 이후 모두 삭제 → 새 assistant 응답 스트리밍

프론트엔드(`chat.store`)와 백엔드(`chat.service`) 양쪽에서 동일한 role 기반 분기 로직 적용:
```typescript
const keepCount = target.role === 'user' ? targetIndex + 1 : targetIndex
```

### 낙관적 업데이트와 메시지 ID 동기화

`sendMessage`는 즉각적인 UI 반영을 위해 `crypto.randomUUID()`로 프론트엔드 전용 user 메시지 ID를 생성 (낙관적 업데이트). 백엔드(`chat.service`)는 별도로 `generateId()`를 호출하여 DB에 저장하므로, 동일 메시지에 대해 프론트엔드/백엔드 ID가 다름.

`finishStream`에서 스트리밍 완료 후 `getMessages(sessionId)`로 DB를 re-fetch하여 프론트엔드 `messages` 배열의 ID를 백엔드 ID로 교체. 이 동기화가 없으면 재생성(`regenerateMessage`) 시 백엔드에서 메시지를 찾지 못함.

- **`sendMessage` 수정 시**: 낙관적 ID가 `finishStream` re-fetch 전까지만 유효함을 인지할 것
- **`finishStream` 수정 시**: re-fetch 로직 제거 금지. 제거 시 user 재생성이 깨짐
- **assistant 메시지**: `stream-end` 이벤트로 백엔드 ID가 직접 전달되므로 불일치 없음

### PromptInput 외부 패딩

`py-4`만 사용 (좌우 패딩 없음). 좌우 여백은 내부 콘텐츠 div의 `mx-auto` + max-width로 제어. 외부에 `px-*`를 넣으면 MessageList와 너비 불일치 발생.

## AllChatsScreen

`src/renderer/components/home/AllChatsScreen.tsx`

- **진입**: 사이드바 "모든 채팅" 버튼 (`openAllChats()`)
- **레이아웃**: 제목("채팅") + 검색 입력 + 개수 표시("채팅 N개") + 세션 리스트
- **검색**: SearchModal과 동일한 클라이언트 사이드 제목 필터링 (`title.toLowerCase().includes(query)`)
- **항목 클릭**: `selectSession(id)` 호출 → store에서 `allChatsOpen = false`로 자동 복귀

## 공유 모듈

`src/renderer/lib/` 디렉토리에 여러 컴포넌트가 공유하는 데이터/유틸 배치.

- `model-meta.ts` — 모델 표시명, 아이콘 등 UI 메타데이터
- `time.ts` — `formatRelativeTime(isoDate)` 상대 시간 한국어 포맷 ("5분 전", "2시간 전", "1주 전" 등), `formatTime(isoDate)` 시:분 포맷 ("오후 3:42")

## 사이드바 레이아웃 (Sidebar)

`src/renderer/components/layout/Sidebar.tsx`

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
│      Free 요금제 │
└─────────────────┘
```

- **상단 고정**: 새 채팅 + 검색 — 테두리 없는 텍스트 행 (`flex items-center gap-3`)
- **중간 스크롤**: 프로젝트 버튼 + 즐겨찾기 섹션(있을 때만) + "최근 항목" 라벨 + 세션 목록 (최대 30개)
- **하단 고정**: 프로필 영역 (아바타 + 이름 + 요금제) — 클릭 시 설정 메뉴

### 즐겨찾기 섹션

`sessions.some((s) => s.isFavorite)`가 true일 때만 "즐겨찾기" 라벨 + 즐겨찾기 세션 목록 표시. 즐겨찾기가 없으면 섹션 자체가 렌더링되지 않음. "최근 항목"은 `sessions.filter((s) => !s.isFavorite)`만 표시.

### 세션 목록 30개 제한

사이드바는 `sessions.filter((s) => !s.isFavorite).slice(0, 30)`으로 비즐겨찾기 최근 30개만 렌더링. 즐겨찾기 세션은 제한 없이 모두 표시. 비즐겨찾기가 30개 초과 시 목록 하단에 "💬 모든 채팅" 버튼 표시.

### 백그라운드 스트리밍 인디케이터

세션 목록에서 다른 세션이 스트리밍 중일 때 녹색 pulsing dot 표시:

- **위치**: 세션 제목 **왼쪽** (`mr-1.5`)
- **조건**: `streamingSessionIds.has(session.id) && session.id !== currentSessionId` — 현재 보고 있는 세션에는 미표시
- **스타일**: `h-2 w-2 shrink-0 rounded-full bg-green-500 animate-pulse`

## 코드 블록 (CodeBlock)

`src/renderer/components/chat/CodeBlock.tsx`

### Sticky 헤더

- 헤더(언어 라벨 + Copy 버튼)는 `sticky top-0 z-10`으로 스크롤 시 고정
- **래퍼에 `overflow-hidden` 사용 금지** — sticky가 동작하지 않음
- border/rounded를 헤더와 코드 본문에 각각 분리 적용:
  - 헤더: `rounded-t-lg border border-b-0`
  - 코드: `rounded-b-lg border border-t-0 overflow-x-auto`

### 배경색

- 헤더와 코드 본문이 동일한 배경색 사용 (inline style)
- dark: `#171717`, light: `#FAF9F7`
- Tailwind `bg-*` 대신 `style={{ background }}` 사용 (SyntaxHighlighter customStyle과 동일 값 유지)

### Copy 버튼

- 아이콘만 표시 (텍스트 없음)
- 래퍼에 `group`, 버튼에 `opacity-0 group-hover:opacity-100`으로 hover 시에만 표시
- 복사 완료(체크 아이콘) 상태에서는 `opacity-100`으로 항상 표시
