# 아키텍처 개요

## 기술 스택

| 분류 | 기술 | 버전 | 패키지 |
|------|------|------|--------|
| 런타임 | Node.js + TypeScript | ^5.7.0 | 전체 |
| 모노레포 | npm workspaces | built-in | 루트 |
| 병렬 실행 | concurrently | ^9.1.0 | 루트 (devDep) |
| 공유 타입 | @dchat/shared | workspace | `packages/shared` |
| 백엔드 | Express | ^4.x | `packages/backend` |
| CORS | cors | ^2.x | `packages/backend` |
| DB | better-sqlite3 | ^11.7.0 | `packages/backend` |
| LLM (Anthropic) | @anthropic-ai/sdk | ^0.39.0 | `packages/backend` |
| LLM (OpenAI) | openai | ^4.78.0 | `packages/backend` |
| 프레임워크 | Electron | ^33.2.0 | `packages/electron` |
| 프론트엔드 | React + TypeScript | ^18.3.1 / ^5.7.0 | `packages/frontend` |
| 빌드 (프론트엔드) | Vite | ^5.x | `packages/frontend` |
| 상태관리 | Zustand | ^5.0.11 | `packages/frontend` |
| 스타일링 | Tailwind CSS | ^3.4.17 | `packages/frontend` |
| 마크다운 | react-markdown + remark-gfm | ^10.1.0 / ^4.0.1 | `packages/frontend` |
| 텍스트 입력 | react-textarea-autosize | ^8.5.9 | `packages/frontend` |
| 아이콘 | lucide-react | ^0.575.0 | `packages/frontend` |
| ID 생성 | crypto.randomUUID() | Node built-in | `packages/backend` |

## 프로젝트 구조

```
packages/
├── shared/                                      # 공유 TypeScript 타입 (@dchat/shared)
│   └── src/
│       ├── index.ts                             # 전체 re-export
│       ├── api-types.ts                         # Request/Response DTO + SSE 이벤트 타입
│       └── entities/
│           ├── index.ts
│           ├── message.ts                       # { id, sessionId, role, content, attachments, createdAt }
│           ├── session.ts                       # { id, title, model, projectId, isFavorite, createdAt, updatedAt }
│           ├── project.ts                       # { id, name, description, instructions, isFavorite, createdAt, updatedAt }
│           └── model-info.ts                    # { id, name, provider }
├── backend/                                     # Express 서버 (REST + SSE)
│   └── src/
│       ├── index.ts                             # 서버 진입점 (graceful shutdown)
│       ├── server.ts                            # Express 앱 생성 + 라우트 등록
│       ├── container.ts                         # 컴포지션 루트 (DI 와이어링)
│       ├── domain/                              # 순수 도메인 — 외부 의존성 ZERO
│       │   ├── entities/
│       │   │   ├── message.ts
│       │   │   ├── session.ts
│       │   │   ├── project.ts
│       │   │   ├── model-info.ts
│       │   │   └── mcp-server.ts                # MCP 서버 설정 + 상태 타입
│       │   ├── ports/
│       │   │   ├── inbound/                     # 유스케이스 인터페이스
│       │   │   │   ├── send-message.usecase.ts
│       │   │   │   ├── regenerate-message.usecase.ts
│       │   │   │   ├── generate-title.usecase.ts
│       │   │   │   ├── manage-session.usecase.ts
│       │   │   │   ├── manage-project.usecase.ts
│       │   │   │   ├── manage-settings.usecase.ts
│       │   │   │   ├── backup-restore.usecase.ts
│       │   │   │   ├── manage-mcp-servers.usecase.ts
│       │   │   │   └── manage-memory.usecase.ts
│       │   │   └── outbound/                    # 리포지토리/게이트웨이 인터페이스
│       │   │       ├── llm.gateway.ts           # + streamChatRaw (tool use), LLMMessage, LLMContentBlock
│       │   │       ├── llm-gateway.resolver.ts
│       │   │       ├── message.repository.ts
│       │   │       ├── session.repository.ts
│       │   │       ├── project.repository.ts
│       │   │       ├── settings.repository.ts
│       │   │       ├── file-system.gateway.ts
│       │   │       ├── mcp-server.repository.ts # JSON 파일 기반 설정 저장
│       │   │       └── mcp-client.gateway.ts    # MCP 서버 프로세스 관리 + 도구 호출
│       │   └── services/                        # 도메인 서비스 (포트 구현)
│       │       ├── chat.service.ts              # → SendMessage, Regenerate, GenerateTitle (+ tool use 루프)
│       │       ├── session.service.ts           # → ManageSession
│       │       ├── project.service.ts           # → ManageProject
│       │       ├── settings.service.ts          # → ManageSettings
│       │       ├── backup.service.ts           # → BackupRestore
│       │       ├── mcp-server.service.ts        # → ManageMcpServers
│       │       ├── memory.service.ts            # → ManageMemory (메모리 추출/검색/편집)
│       │       └── id.ts                        # generateId()
│       └── adapters/
│           ├── inbound/http/                    # Express 라우트 핸들러 (REST + SSE)
│           │   ├── chat.routes.ts               # 메시지 CRUD + SSE 스트리밍
│           │   ├── session.routes.ts            # 세션 CRUD + 즐겨찾기 + 프로젝트 연결
│           │   ├── project.routes.ts            # 프로젝트 CRUD + 지침 + 즐겨찾기
│           │   ├── settings.routes.ts           # 설정 조회/저장 + 연결 테스트
│           │   ├── backup.routes.ts            # 백업 내보내기/가져오기
│           │   ├── models.routes.ts             # 모델 목록 조회
│           │   ├── mcp-server.routes.ts         # MCP 서버 CRUD + 상태/로그/리로드
│           │   └── memory.routes.ts            # 메모리 조회/삭제/편집
│           └── outbound/
│               ├── persistence/sqlite/          # SQLite 리포지토리
│               │   ├── connection.ts            # DB 연결 (WAL 모드, DCHAT_DB_PATH 오버라이드)
│               │   ├── schema.ts                # DDL + 마이그레이션
│               │   ├── message.repository.impl.ts
│               │   ├── session.repository.impl.ts
│               │   ├── project.repository.impl.ts
│               │   └── settings.repository.impl.ts
│               ├── persistence/json/            # JSON 파일 기반 저장
│               │   └── mcp-config.repository.ts # ~/.dchat/mcp_config.json
│               ├── mcp/                         # MCP 클라이언트
│               │   └── stdio-mcp-client.manager.ts  # stdio 프로세스 기반 MCP 서버 관리
│               └── llm/                         # LLM 어댑터
│                   ├── llm-adapter.factory.ts   # → LLMGatewayResolver
│                   ├── anthropic.adapter.ts     # → LLMGateway (+ streamChatRaw for tool use)
│                   ├── openai.adapter.ts        # → LLMGateway (+ streamChatRaw for tool use)
│                   └── document-text-extractor.ts  # 문서 텍스트 추출 (PDF, DOCX, XLSX, PPTX, CSV)
├── frontend/                                    # React SPA (Vite, FSD 아키텍처)
│   ├── vite.config.ts                           # Vite 설정 (proxy → localhost:3131, @ alias)
│   ├── index.html                               # 진입점: /src/app/main.tsx
│   └── src/                                     # Feature-Sliced Design (레이어별 구조)
│       ├── app/                                 # 진입점, 글로벌 설정
│       │   ├── main.tsx                         # ReactDOM 렌더링
│       │   ├── App.tsx                          # 헬스체크 폴링 + 데이터 로드
│       │   ├── env.d.ts                         # Vite 환경변수 + window.electron 타입
│       │   └── styles/globals.css
│       ├── pages/                               # 페이지 컴포지션
│       │   ├── home/HomeScreen.tsx
│       │   ├── chat/                            # ChatPage.tsx + ChatHeader.tsx (로컬)
│       │   ├── all-chats/AllChatsScreen.tsx
│       │   ├── projects/ProjectsScreen.tsx
│       │   ├── project-detail/ProjectDetailScreen.tsx
│       │   └── settings/SettingsScreen.tsx
│       ├── widgets/                             # 독립 UI 블록
│       │   ├── main-layout/                     # MainLayout (뷰 디스패치 포함)
│       │   ├── sidebar/                         # Sidebar, SessionContextMenu, SettingsMenu, SettingsPanel
│       │   ├── message-list/                    # MessageList, MessageBubble, CodeBlock, HtmlArtifactCard, StreamingIndicator, ToolCallGroup, ToolCallBlock
│       │   ├── prompt-input/                    # PromptInput, PromptMenu, ModelSelector
│       │   └── artifact-panel/                  # ArtifactPanel
│       ├── features/                            # 사용자 인터랙션
│       │   ├── search/                          # SearchModal
│       │   └── manage-project/                  # ProjectContextMenu
│       ├── entities/                            # 비즈니스 엔티티 (api/ + model/ + index.ts barrel)
│       │   ├── session/                         # sessionApi, chatApi, useSessionStore
│       │   ├── project/                         # projectApi, useProjectStore
│       │   ├── settings/                        # settingsApi, backupApi, memoryApi, useSettingsStore
│       │   └── mcp/                             # mcpApi, useMcpStore (MCP 서버 관리)
│       └── shared/                              # 인프라, 유틸
│           ├── api/                             # client.ts (apiFetch, apiSSE), models.api.ts
│           └── lib/                             # native.ts, model-meta.ts, time.ts
└── electron/                                    # Thin Electron 쉘
    ├── electron.vite.config.ts
    └── src/
        ├── main.ts                              # 백엔드 spawn + BrowserWindow + native IPC
        ├── preload.ts                           # contextBridge → window.electron API
        ├── shortcut.ts                          # 글로벌 단축키 (uiohook-napi + globalShortcut)
        └── tray.ts                              # 트레이 아이콘 + 퀵챗 팝업 BrowserWindow
```

## 데이터 흐름

### 1. 채팅 메시지 전송 (SSE 스트리밍)

```
Frontend: chat.store.sendMessage(content, attachments?)
  → 낙관적 업데이트: 프론트엔드 전용 user 메시지 ID 생성 (crypto.randomUUID())
  → chatApi.sendMessage(sessionId, content, attachments, callbacks)
    → POST /api/chat/:sessionId/messages (SSE)
      → chat.routes.ts (AbortController 생성, per-session 보관)
        → ChatService.execute(sessionId, content, attachments, onChunk, signal)
          1. sessionRepo.findById(sessionId)
          2. messageRepo.save(userMessage)
          3. messageRepo.findBySessionId(sessionId)  // 히스토리
          4. buildSystemPrompt(projectId, content, sessionId)  // 프로젝트 지침 + 글로벌 지침 + 메모리/채팅검색
          5. llmResolver.getGateway(session.model)     // Anthropic or OpenAI
          6. gateway.streamChat(history, options, signal)
             → 각 chunk마다 onChunk 콜백 호출
               → SSE event: chunk { type: "text", content: "..." }
               → 첫 번째 청크 도착 시 generateTitle() (Promise 캡처)
          7. messageRepo.save(assistantMessage)
        → titlePromise가 있으면 await (제목 생성 완료 대기)
        → SSE event: title { sessionId, title }  // 제목이 생성된 경우
        → SSE event: end { id, sessionId, role, content, attachments, createdAt }
        → res.end()
Frontend: apiSSE 파서가 이벤트 수신 → callbacks 호출 → store 업데이트
  → onChunk: streamingContents 누적
  → onTitle: 세션 제목 업데이트
  → onEnd: messages re-fetch (백엔드 ID 동기화), 스트리밍 상태 해제
```

### 1-2. 메시지 재생성

```
Frontend: chat.store.regenerateMessage(messageId)
  → role 기반 messages 잘라내기 (user: 본인 유지, assistant: 본인 제거)
  → chatApi.regenerate(sessionId, messageId, callbacks)
    → POST /api/chat/:sessionId/messages/:messageId/regenerate (SSE)
      → ChatService.regenerate(sessionId, messageId, onChunk, signal)
        1. messageRepo.findBySessionId(sessionId)
        2. 대상 메시지 findIndex → role 기반 keepCount 결정
        3. 이후 메시지 deleteById 루프로 삭제
        4. 남은 history로 gateway.streamChat()
        5. messageRepo.save(assistantMessage)
      → SSE event: end { ... }
```

### 1-3. 스트리밍 중단

```
Frontend: chat.store.stopStream()
  → chatApi.stopStream(sessionId, partialContent)
    → POST /api/chat/:sessionId/stop  { content: "부분 텍스트" }
      → AbortController.abort()
        → signal.aborted = true → streamChat async iterator 종료
        → 부분 content가 있으면 assistant 메시지로 저장
      → { ok: true }
```

### 2. 세션 CRUD

```
Frontend: Sidebar → chat.store.createSession() / deleteSession() / selectSession()
  → sessionApi.create / delete / list / get
    → REST 엔드포인트 → SessionService → SqliteSessionRepository
    (삭제 시 messageRepo.deleteBySessionId 연쇄 삭제)
```

### 3. 설정 및 API 키

```
Frontend: SettingsScreen → settings.store.setApiKey(provider, key)
  → settingsApi.set(key, value)
    → PUT /api/settings/:key  { value }
      → settings.routes.ts
        1. settingsService.set(key, value)
        2. if key === 'anthropic_api_key' / 'anthropic_base_url'
           → llmFactory.setAnthropicKey(key, baseUrl)
        3. if key === 'openai_api_key' / 'openai_base_url'
           → llmFactory.setOpenAIKey(key, baseUrl)
           (즉시 새 어댑터 인스턴스 생성)
```

## 공유 타입 패키지 (@dchat/shared)

`packages/shared/`는 프론트엔드와 백엔드가 공유하는 TypeScript 타입을 정의. npm workspace로 참조 (`@dchat/shared`).

### Entities

| 파일 | 주요 타입 | 설명 |
|------|-----------|------|
| `entities/message.ts` | `Message`, `ImageAttachment` | 메시지 + 이미지 첨부 |
| `entities/session.ts` | `Session` | 채팅 세션 |
| `entities/project.ts` | `Project` | 프로젝트 (instructions, isFavorite 포함) |
| `entities/model-info.ts` | `ModelInfo` | 모델 정보 (id, name, provider) |

### API DTO (`api-types.ts`)

Request/Response DTO:
- `CreateSessionRequest`, `UpdateModelRequest`, `UpdateTitleRequest`, `UpdateProjectRequest`
- `SendMessageRequest` (content + attachments?)
- `StopStreamRequest` (content)
- `SetSettingRequest` (value)
- `CreateProjectRequest`, `UpdateProjectRequest`, `UpdateInstructionsRequest`
- `BackupData` (version, exportedAt, data: settings/projects/sessions/messages)
- `HealthResponse`

SSE 이벤트 타입:
- `SSEEventType`: `'chunk' | 'title' | 'end' | 'error'`
- `SSEChunkEvent`: `{ type: 'text' | 'error' | 'done', content }`
- `SSETitleEvent`: `{ sessionId, title }`
- `SSEEndEvent`: `{ id, sessionId, role, content, attachments, createdAt }`
- `SSEErrorEvent`: `{ message }`

## Electron 쉘

`packages/electron/`은 thin shell로 백엔드를 child process로 spawn하고 BrowserWindow로 프론트엔드를 로드.

### 백엔드 Spawn

- Production: 랜덤 가용 포트, `process.execPath` + `ELECTRON_RUN_AS_NODE=1`로 빌드된 백엔드 실행
- Dev: 포트 3131 고정, `npx tsx`로 TypeScript 직접 실행
- DB 경로: Production에서 `${app.getPath('userData')}/dchat.db` (`DCHAT_DB_PATH` 환경변수로 설정). Dev에서는 `DCHAT_DB_PATH` 미설정 → 백엔드 폴백 경로(`~/.dchat/dchat.db`) 사용하여 `npm run dev` (웹 모드)와 동일 DB 공유
- 백엔드 stdout/stderr → `[backend]` 프리픽스로 로깅
- Graceful shutdown: `SIGTERM`/`SIGINT`/`will-quit` 시 백엔드 프로세스 kill

### Health 폴링

백엔드 프로세스 spawn 후 `GET /api/health`를 200ms 간격으로 최대 30회 폴링. 응답 수신 시 BrowserWindow 로드 시작.

### Native IPC (3개)

Electron의 `ipcMain.handle()`로 등록, preload의 `contextBridge`를 통해 `window.electron`으로 노출.

| 채널 | 인자 | 반환 | 설명 |
|------|------|------|------|
| `native:pick-image` | — | `ImageAttachment[]` | 파일 다이얼로그 (이미지 + 문서) → base64 인코딩. 기본 필터 "All Supported Files"로 이미지와 문서 모두 선택 가능 |
| `native:open-in-browser` | `htmlContent: string` | `void` | HTML을 temp 파일로 쓰고 시스템 브라우저에서 열기 |
| `native:open-file` | `filePath: string` | `void` | 파일을 시스템 기본 앱으로 열기 (MCP 설정 파일 편집용) |
| `native:get-api-url` / `native:get-api-url-sync` | — | `string` | `http://localhost:${backendPort}` 반환 |
| `native:open-log-folder` | — | `void` | 로그 폴더를 시스템 파일 관리자로 열기 |
| `native:set-show-in-menu-bar` | `visible: boolean` | `void` | 트레이 아이콘 생성/제거 |
| `native:set-quick-access-shortcut` | `shortcut: string` | `void` | 글로벌 단축키 활성화/비활성화 |
| `native:quick-chat-send` | `text: string, model: string` | `string` (sessionId) | 퀵챗에서 세션 생성 → 메인 윈도우에 전달 |
| `native:navigate-to-session` | `sessionId, message` | — | main→renderer 단방향. 퀵챗 전송 후 메인 윈도우에 세션 이동 + 메시지 전송 지시 |

### 글로벌 단축키 시스템 (`packages/electron/src/shortcut.ts`)

퀵챗 팝업을 여는 글로벌 단축키. settings 키 `quick_access_shortcut` 값에 따라 두 가지 방식:

| 값 | 방식 | 라이브러리 |
|---|---|---|
| `double-option` | Option 키 두 번 탭 감지 | `uiohook-napi` (OS-level 키보드 훅) |
| `option-space` | Alt+Space | Electron `globalShortcut` |
| `custom:{accelerator}` | 사용자 지정 (예: `custom:Shift+Command+Space`) | Electron `globalShortcut` |
| `none` | 비활성화 | — |

- **`double-option` 제약**: macOS에서 `uiohook-napi`는 접근성 권한 필요. `systemPreferences.isTrustedAccessibilityClient(true)`로 권한 요청 다이얼로그 트리거
- **수정 시 주의**: `activateShortcut()`은 이전 리스너를 `deactivateShortcut()`으로 정리한 뒤 새로 등록. uiohook과 globalShortcut은 동시에 하나만 활성화됨

### 퀵챗 트레이 팝업 (`packages/electron/src/tray.ts`)

메뉴 바 트레이 아이콘 클릭 또는 글로벌 단축키로 열리는 경량 입력 팝업.

- **BrowserWindow**: `480x160`, `frame: false`, `transparent: true`, `alwaysOnTop: true`, macOS `vibrancy: 'popover'`
- **URL**: 프론트엔드와 동일한 SPA를 `?mode=quick-chat` 쿼리로 로드
- **위치**: 커서가 있는 디스플레이의 작업 영역 가로 중앙, 세로 3/4 지점
- **숨기기**: blur 이벤트 시 자동 숨김
- **트레이 아이콘**: 22×22 PNG를 런타임에 생성 (외부 이미지 파일 없음). `setTemplateImage(true)`로 macOS 다크/라이트 메뉴바 자동 대응
- **전송 흐름**: `native:quick-chat-send` IPC → 백엔드 API로 세션 생성 → 팝업 숨김 → 메인 윈도우 표시 → `native:navigate-to-session`으로 렌더러에 세션 이동 + 메시지 전송 지시

### Preload Navigate 이벤트 패턴 (`packages/electron/src/preload.ts`)

`native:navigate-to-session` main→renderer 이벤트는 레이스 컨디션 방지를 위해 preload 모듈 스코프에서 리스너를 즉시 등록:

```ts
// preload.ts (모듈 스코프)
let navigateCallback: ((sessionId, message) => void) | null = null
let pendingNavigate: { sessionId, message } | null = null

ipcRenderer.on('native:navigate-to-session', (_event, sessionId, message) => {
  if (navigateCallback) navigateCallback(sessionId, message)  // 콜백 있으면 즉시 실행
  else pendingNavigate = { sessionId, message }                // 없으면 보관
})
```

렌더러가 `onNavigateToSession(callback)`으로 콜백을 등록하면 보관된 이벤트를 즉시 전달. 메인 윈도우가 아직 로드 중일 때 이벤트가 유실되는 것을 방지.

### BrowserWindow

- 크기: 1200x800 (최소 800x600)
- macOS: `titleBarStyle: 'hiddenInset'`
- Dev: `ELECTRON_RENDERER_URL` 환경변수에서 로드 + Meta+Alt+I로 DevTools 토글
- Production: `../frontend/dist/index.html` 로드

## 지원 모델

| 모델 ID | 이름 | Provider | 라우팅 규칙 |
|---------|------|----------|------------|
| `claude-opus-4-6` | Claude Opus 4.6 | anthropic | `claude-*` 프리픽스 |
| `claude-sonnet-4-6` | Claude Sonnet 4.6 | anthropic | `claude-*` 프리픽스 |
| `claude-haiku-4-5` | Claude Haiku 4.5 | anthropic | `claude-*` 프리픽스 |
| `gpt-4o` | GPT-4o | openai | `gpt-*` 프리픽스 |
| `gpt-4o-mini` | GPT-4o Mini | openai | `gpt-*` 프리픽스 |
| `o3-mini` | o3-mini | openai | `o3*` 프리픽스 |
