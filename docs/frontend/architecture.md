# 프론트엔드 아키텍처

## FSD (Feature-Sliced Design) 아키텍처

프론트엔드는 FSD 레이어 구조를 사용. 모든 소스는 `packages/frontend/src/` 아래 6개 레이어에 배치.

### 레이어 및 import 방향

```
app/      → pages, widgets, features, entities, shared
pages/    → widgets, features, entities, shared
widgets/  → features, entities, shared  (예외: main-layout은 pages/ import 허용)
features/ → entities, shared
entities/ → shared  (+ 동일 레이어 sibling 참조 허용)
shared/   → 외부 패키지만
```

**위반 금지**: 하위 레이어에서 상위 레이어를 import하면 순환 의존성 발생. `tsc --noEmit`으로는 잡히지 않으므로 수동 확인 필요.

### 파일 배치 규칙

- 각 슬라이스는 `index.ts` barrel로 외부 노출 API 제어
- 슬라이스 내부: 상대 경로 (`./Component`)
- 슬라이스 간/레이어 간: `@/` alias + barrel (`@/entities/session`, `@/widgets/sidebar`)
- 새 파일 추가 시 적절한 레이어 판단: UI 블록 → widgets, 사용자 액션 → features, 데이터/스토어 → entities

### 스토어 이름

- `useSessionStore` (`entities/session`) — 세션, 메시지, 스트리밍, UI 뷰 상태
- `useProjectStore` (`entities/project`) — 프로젝트 CRUD
- `useSettingsStore` (`entities/settings`) — 설정, 테마, API 키
- `useMcpStore` (`entities/mcp`) — MCP 서버 목록/상태, 로그, 설정 파일 경로

## 프로젝트 구조 (frontend/src/)

```
src/
├── app/                                 # 진입점, 글로벌 설정
│   ├── main.tsx                         # ReactDOM 렌더링
│   ├── App.tsx                          # 헬스체크 폴링 + 데이터 로드
│   ├── env.d.ts                         # Vite 환경변수 + window.electron 타입
│   └── styles/globals.css
├── pages/                               # 페이지 컴포지션
│   ├── home/HomeScreen.tsx
│   ├── chat/                            # ChatPage.tsx + ChatHeader.tsx (로컬)
│   ├── all-chats/AllChatsScreen.tsx
│   ├── projects/ProjectsScreen.tsx
│   ├── project-detail/ProjectDetailScreen.tsx
│   ├── quick-chat/QuickChatPage.tsx             # 트레이 팝업 전용 경량 입력 페이지
│   └── settings/SettingsScreen.tsx
├── widgets/                             # 독립 UI 블록
│   ├── main-layout/                     # MainLayout (뷰 디스패치 포함)
│   ├── sidebar/                         # Sidebar, SessionContextMenu, SettingsMenu, SettingsPanel
│   ├── message-list/                    # MessageList, MessageBubble, CodeBlock, HtmlArtifactCard, StreamingIndicator, ToolCallBlock
│   ├── prompt-input/                    # PromptInput, PromptMenu, ModelSelector
│   └── artifact-panel/                  # ArtifactPanel
├── features/                            # 사용자 인터랙션
│   ├── search/                          # SearchModal
│   └── manage-project/                  # ProjectContextMenu, MoveToProjectModal
├── entities/                            # 비즈니스 엔티티 (api/ + model/ + index.ts barrel)
│   ├── session/                         # sessionApi, chatApi, useSessionStore
│   ├── project/                         # projectApi, useProjectStore
│   ├── settings/                        # settingsApi, memoryApi, useSettingsStore
│   └── mcp/                             # mcpApi, useMcpStore
└── shared/                              # 인프라, 유틸
    ├── api/                             # client.ts (apiFetch, apiSSE), models.api.ts
    └── lib/                             # native.ts, model-meta.ts, time.ts
```

## API 클라이언트

`packages/frontend/src/shared/api/`에 공용 HTTP/SSE 클라이언트, 각 엔티티별 API 모듈은 `entities/*/api/`에 배치.

### 핵심 함수 (`shared/api/client.ts`)

| 함수 | 설명 |
|------|------|
| `apiFetch<T>(path, options?)` | JSON 요청/응답. 10초 타임아웃. 에러 시 throw |
| `apiSSE(path, body, callbacks)` | SSE 스트리밍. `AbortController` 반환 |
| `API_BASE` | Electron: `window.electron.getApiUrl()`, 웹: `import.meta.env.VITE_API_URL` 또는 상대 경로 |

### API 모듈 (5개)

| 모듈 | 주요 함수 |
|------|-----------|
| `entities/session/api/chat.api.ts` | `getMessages`, `sendMessage` (SSE), `regenerate` (SSE), `stopStream` |
| `entities/session/api/session.api.ts` | `create`, `list`, `listByProject`, `get`, `delete`, `updateModel`, `updateTitle`, `updateProjectId`, `toggleFavorite` |
| `entities/project/api/project.api.ts` | `create`, `list`, `delete`, `update`, `updateInstructions`, `toggleFavorite` |
| `entities/settings/api/settings.api.ts` | `getAll`, `get`, `set`, `testConnection` |
| `entities/settings/api/backup.api.ts` | `exportBackup`, `importBackup` |
| `entities/settings/api/memory.api.ts` | `get`, `delete`, `edit` |
| `entities/mcp/api/mcp.api.ts` | `listServers`, `getStatuses`, `createServer`, `updateServer`, `deleteServer`, `startServer`, `stopServer`, `restartServer`, `getLogs`, `getConfigPath`, `reload` |
| `shared/api/models.api.ts` | `list` |

### Electron/웹 이중 지원 (`shared/lib/native.ts`)

| 함수 | Electron | 웹 |
|------|----------|-----|
| `pickImage()` | `window.electron.pickImage()` → 파일 다이얼로그 | `<input type="file">` → FileReader base64 |
| `openInBrowser(html)` | `window.electron.openInBrowser()` → temp 파일 | `URL.createObjectURL(Blob)` → 30초 후 revoke |
| `openFile(path)` | `window.electron.openFile()` → shell.openPath | no-op (웹에서 미지원) |

## Zustand 스토어 상태

### session.store.ts (entities/session/model/)

| 필드/액션 | 타입 | 설명 |
|-----------|------|------|
| `sessions` | `Session[]` | 전체 세션 목록 |
| `currentSessionId` | `string \| null` | 현재 선택된 세션 ID |
| `messages` | `Message[]` | 현재 세션 메시지 |
| `streamingSessionIds` | `Set<string>` | 스트리밍 진행 중인 세션 ID 집합 (멀티세션 지원) |
| `streamingSegments` | `Record<string, StreamingSegment[]>` | 세션별 스트리밍 세그먼트 (텍스트/도구호출 시간순) |
| `error` | `string \| null` | 에러 메시지 |
| `searchOpen` | `boolean` | 검색 모달 열림 상태 |
| `allChatsOpen` | `boolean` | 전체 채팅 목록 페이지 열림 상태 |
| `projectsOpen` | `boolean` | 프로젝트 페이지 열림 상태 |
| `artifactPanel` | `{ code, title } \| null` | 아티팩트 패널 상태 |
| `loadSessions()` | action | 세션 목록 로드 |
| `createSession(title, model, projectId?)` | action | 세션 생성 + 선택 |
| `selectSession(id)` | action | 세션 선택 + 메시지 로드 + 모달 닫기 |
| `deselectSession()` | action | 세션 선택 해제 → HomeScreen |
| `deleteSession(id)` | action | 세션 삭제 + 다음 세션 자동 선택 |
| `sendMessage(content, attachments?)` | action | 메시지 전송 + SSE 스트리밍 시작 |
| `regenerateMessage(messageId)` | action | 메시지 재생성 (role 기반 삭제 + 스트리밍) |
| `stopStream()` | action | SSE 스트리밍 중단 (AbortController.abort) |
| `updateSessionTitle(sessionId, title)` | action | 세션 제목 업데이트 |
| `updateSessionModel(sessionId, model)` | action | 세션 모델 업데이트 |
| `toggleSessionFavorite(id)` | action | 세션 즐겨찾기 토글 (낙관적 업데이트) |
| `updateSessionProjectId(id, projectId)` | action | 세션-프로젝트 연결 변경 |
| `openSearch()` / `closeSearch()` | action | 검색 모달 열기/닫기 |
| `openAllChats()` / `closeAllChats()` | action | 전체 채팅 목록 열기/닫기 |
| `openProjects()` / `closeProjects()` | action | 프로젝트 페이지 열기/닫기 |
| `openArtifact(code, title)` / `closeArtifact()` | action | 아티팩트 패널 열기/닫기 |
| `setSessionTitleLocal(sessionId, title)` | action | 세션 제목 낙관적 업데이트 |

### settings.store.ts (entities/settings/model/)

| 필드/액션 | 타입 | 설명 |
|-----------|------|------|
| `anthropicApiKey` | `string` | Anthropic API 키 |
| `anthropicBaseUrl` | `string` | Anthropic 커스텀 엔드포인트 |
| `anthropicVerified` | `boolean` | Anthropic 연결 테스트 통과 여부 |
| `openaiApiKey` | `string` | OpenAI API 키 |
| `openaiBaseUrl` | `string` | OpenAI 커스텀 엔드포인트 |
| `openaiVerified` | `boolean` | OpenAI 연결 테스트 통과 여부 |
| `selectedModel` | `string` | 기본 선택 모델 (default: `claude-opus-4-6`) |
| `colorMode` | `'light' \| 'auto' \| 'dark'` | 테마 모드 |
| `darkMode` | `boolean` | 실제 적용된 다크모드 여부 (colorMode + 시스템 설정에서 결정) |
| `settingsOpen` | `boolean` | 설정 화면 열림 상태 |
| `sidebarOpen` | `boolean` | 사이드바 열림 상태 |
| `fullName` | `string` | 사용자 이름 |
| `nickname` | `string` | 사용자 닉네임 |
| `role` | `string` | 사용자 역할 |
| `customInstructions` | `string` | 글로벌 커스텀 지침 |
| `responseNotif` | `boolean` | 응답 알림 |
| `codeEmailNotif` | `boolean` | 코드/이메일 알림 |
| `loadSettings()` | action | 전체 설정 + 모델 목록 로드, 다크모드 적용, 레거시 키 마이그레이션 |
| `setApiKey(provider, key)` | action | API 키 설정 + 미인증 상태로 변경 |
| `setSelectedModel(model)` | action | 기본 모델 변경 |
| `setAnthropicBaseUrl(url)` | action | Anthropic 커스텀 엔드포인트 설정 |
| `setOpenaiBaseUrl(url)` | action | OpenAI 커스텀 엔드포인트 설정 |
| `setColorMode(mode)` | action | 테마 모드 변경 (즉시 적용, `auto` 시 시스템 리스너 등록) |
| `setFullName(v)` / `setNickname(v)` / `setRole(v)` / `setCustomInstructions(v)` | action | 프로필/지침 변경 (500ms 디바운스 persist) |
| `setResponseNotif(v)` / `setCodeEmailNotif(v)` | action | 알림 설정 변경 |
| `launchAtStartup` | `boolean` | 시작 시 자동 실행 |
| `quickAccessShortcut` | `string` | 퀵챗 단축키 (`double-option`, `option-space`, `custom:{accelerator}`, `none`) |
| `showInMenuBar` | `boolean` | 메뉴 바 트레이 아이콘 표시 |
| `setLaunchAtStartup(v)` | action | 자동 실행 설정 변경 |
| `setQuickAccessShortcut(v)` | action | 단축키 변경 + Electron IPC로 즉시 반영 |
| `setShowInMenuBar(v)` | action | 트레이 표시 변경 + Electron IPC로 즉시 반영 |
| `memoryEnabled` | `boolean` | 메모리 자동 추출 활성화 |
| `chatSearchEnabled` | `boolean` | 채팅 검색(과거 대화 참조) 활성화 |
| `setMemoryEnabled(v)` | action | 메모리 활성화 변경 |
| `setChatSearchEnabled(v)` | action | 채팅 검색 활성화 변경 |
| `setProviderVerified(provider, verified)` | action | 연결 테스트 결과 반영 |
| `openSettings()` / `closeSettings()` / `toggleSettings()` | action | 설정 화면 열기/닫기/토글 |
| `toggleSidebar()` | action | 사이드바 토글 + persist |

### project.store.ts (entities/project/model/)

| 필드/액션 | 타입 | 설명 |
|-----------|------|------|
| `projects` | `Project[]` | 전체 프로젝트 목록 |
| `selectedProjectId` | `string \| null` | 현재 선택된 프로젝트 ID (ProjectDetailScreen 진입용) |
| `loadProjects()` | action | 프로젝트 목록 로드 |
| `createProject(name, desc)` | action | 프로젝트 생성 |
| `deleteProject(id)` | action | 프로젝트 삭제 (선택 중이면 해제) |
| `updateProject(id, name, desc)` | action | 프로젝트 수정 |
| `updateInstructions(id, instructions)` | action | 프로젝트 지침 수정 |
| `toggleFavorite(id)` | action | 프로젝트 즐겨찾기 토글 (낙관적 업데이트) |
| `selectProject(id)` | action | 프로젝트 선택 → ProjectDetailScreen 진입 |
| `deselectProject()` | action | 프로젝트 선택 해제 → ProjectsScreen 복귀 |

## Cross-Store 접근 패턴

Zustand 스토어 간 직접 호출이 필요한 경우 `useOtherStore.getState()` 또는 `useOtherStore.setState()`를 사용:

```ts
// session.store.ts 내부
useProjectStore.getState().deselectProject()  // 액션 호출
useSettingsStore.setState({ sidebarOpen: false })  // 직접 상태 변경
```

- React 컴포넌트 밖(스토어 액션)에서만 사용. 컴포넌트 내에서는 각 스토어의 hook을 개별 구독.
- 현재 사용처: `openProjects()` → 프로젝트 선택 해제, `openArtifact()` → 사이드바 닫기
