# 아키텍처 상세 레퍼런스

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
│       │   │   └── model-info.ts
│       │   ├── ports/
│       │   │   ├── inbound/                     # 유스케이스 인터페이스
│       │   │   │   ├── send-message.usecase.ts
│       │   │   │   ├── regenerate-message.usecase.ts
│       │   │   │   ├── generate-title.usecase.ts
│       │   │   │   ├── manage-session.usecase.ts
│       │   │   │   ├── manage-project.usecase.ts
│       │   │   │   └── manage-settings.usecase.ts
│       │   │   └── outbound/                    # 리포지토리/게이트웨이 인터페이스
│       │   │       ├── llm.gateway.ts
│       │   │       ├── llm-gateway.resolver.ts
│       │   │       ├── message.repository.ts
│       │   │       ├── session.repository.ts
│       │   │       ├── project.repository.ts
│       │   │       ├── settings.repository.ts
│       │   │       └── file-system.gateway.ts
│       │   └── services/                        # 도메인 서비스 (포트 구현)
│       │       ├── chat.service.ts              # → SendMessage, Regenerate, GenerateTitle
│       │       ├── session.service.ts           # → ManageSession
│       │       ├── project.service.ts           # → ManageProject
│       │       ├── settings.service.ts          # → ManageSettings
│       │       └── id.ts                        # generateId()
│       └── adapters/
│           ├── inbound/http/                    # Express 라우트 핸들러 (REST + SSE)
│           │   ├── chat.routes.ts               # 메시지 CRUD + SSE 스트리밍
│           │   ├── session.routes.ts            # 세션 CRUD + 즐겨찾기 + 프로젝트 연결
│           │   ├── project.routes.ts            # 프로젝트 CRUD + 지침 + 즐겨찾기
│           │   ├── settings.routes.ts           # 설정 조회/저장 + 연결 테스트
│           │   └── models.routes.ts             # 모델 목록 조회
│           └── outbound/
│               ├── persistence/sqlite/          # SQLite 리포지토리
│               │   ├── connection.ts            # DB 연결 (WAL 모드, DCHAT_DB_PATH 오버라이드)
│               │   ├── schema.ts                # DDL + 마이그레이션
│               │   ├── message.repository.impl.ts
│               │   ├── session.repository.impl.ts
│               │   ├── project.repository.impl.ts
│               │   └── settings.repository.impl.ts
│               └── llm/                         # LLM 어댑터
│                   ├── llm-adapter.factory.ts   # → LLMGatewayResolver
│                   ├── anthropic.adapter.ts     # → LLMGateway
│                   └── openai.adapter.ts        # → LLMGateway
├── frontend/                                    # React SPA (Vite)
│   ├── vite.config.ts                           # Vite 설정 (proxy → localhost:3131)
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── env.d.ts                             # Vite 환경변수 + window.electron 타입
│       ├── api/                                 # HTTP/SSE 클라이언트
│       │   ├── client.ts                        # apiFetch(), apiSSE(), API_BASE 결정
│       │   ├── index.ts                         # re-export
│       │   ├── chat.api.ts                      # 메시지/스트리밍/재생성/중단
│       │   ├── session.api.ts                   # 세션 CRUD
│       │   ├── project.api.ts                   # 프로젝트 CRUD
│       │   ├── settings.api.ts                  # 설정 조회/저장/연결 테스트
│       │   └── models.api.ts                    # 모델 목록
│       ├── stores/
│       │   ├── chat.store.ts                    # 세션/메시지/스트리밍 상태 (Zustand)
│       │   ├── project.store.ts                 # 프로젝트 CRUD 상태 (Zustand)
│       │   └── settings.store.ts                # 설정/모델/테마 상태 (Zustand)
│       ├── lib/
│       │   ├── native.ts                        # Electron/웹 이중 지원 (pickImage, openInBrowser)
│       │   ├── model-meta.ts                    # 모델 UI 메타데이터
│       │   └── time.ts                          # formatRelativeTime(), formatTime()
│       ├── styles/
│       │   └── globals.css
│       └── components/
│           ├── chat/
│           │   ├── ChatArea.tsx
│           │   ├── MessageList.tsx
│           │   ├── MessageBubble.tsx
│           │   ├── CodeBlock.tsx
│           │   ├── ArtifactPanel.tsx
│           │   ├── HtmlArtifactCard.tsx
│           │   ├── ModelSelector.tsx
│           │   ├── PromptInput.tsx
│           │   ├── PromptMenu.tsx
│           │   └── StreamingIndicator.tsx
│           ├── home/
│           │   ├── HomeScreen.tsx
│           │   ├── AllChatsScreen.tsx
│           │   ├── ProjectsScreen.tsx
│           │   ├── ProjectDetailScreen.tsx
│           │   └── ProjectContextMenu.tsx
│           ├── search/
│           │   └── SearchModal.tsx
│           ├── settings/
│           │   └── SettingsScreen.tsx
│           └── layout/
│               ├── MainLayout.tsx
│               ├── Sidebar.tsx
│               ├── SettingsPanel.tsx
│               ├── SettingsMenu.tsx
│               └── SessionContextMenu.tsx
└── electron/                                    # Thin Electron 쉘
    ├── electron.vite.config.ts
    └── src/
        ├── main.ts                              # 백엔드 spawn + BrowserWindow + native IPC
        └── preload.ts                           # contextBridge → window.electron API
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
          4. buildSystemPrompt(projectId)              // 프로젝트 지침 + 글로벌 지침
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

## REST API 레퍼런스

Base URL: `/api` (기본 포트 3131)

### Health

| 메서드 | 경로 | Body | 응답 | 설명 |
|--------|------|------|------|------|
| GET | `/api/health` | — | `{ status: 'ok' }` | 서버 상태 확인 |

### Chat

| 메서드 | 경로 | Body | 응답 | 설명 |
|--------|------|------|------|------|
| GET | `/api/chat/:sessionId/messages` | — | `Message[]` | 세션 메시지 조회 |
| POST | `/api/chat/:sessionId/messages` | `{ content, attachments? }` | SSE 스트림 | 메시지 전송 + 스트리밍 |
| POST | `/api/chat/:sessionId/messages/:messageId/regenerate` | — | SSE 스트림 | 메시지 재생성 |
| POST | `/api/chat/:sessionId/stop` | `{ content }` | `{ ok: true }` | 스트리밍 중단 + 부분 저장 |

### Session

| 메서드 | 경로 | Body | 응답 | 설명 |
|--------|------|------|------|------|
| POST | `/api/sessions` | `{ title, model, projectId? }` | `Session` | 세션 생성 |
| GET | `/api/sessions` | query: `projectId?` | `Session[]` | 전체 세션 목록 (is_favorite DESC, updated_at DESC) |
| GET | `/api/sessions/:id` | — | `Session` | 세션 단건 조회 |
| DELETE | `/api/sessions/:id` | — | `{ ok: true }` | 세션 삭제 (메시지 연쇄 삭제) |
| PATCH | `/api/sessions/:id/model` | `{ model }` | `Session` | 세션 모델 변경 |
| PATCH | `/api/sessions/:id/title` | `{ title }` | `Session` | 세션 제목 변경 |
| PATCH | `/api/sessions/:id/favorite` | — | `Session` | 즐겨찾기 토글 |
| PATCH | `/api/sessions/:id/project` | `{ projectId }` | `Session` | 세션-프로젝트 연결 변경 |

### Project

| 메서드 | 경로 | Body | 응답 | 설명 |
|--------|------|------|------|------|
| POST | `/api/projects` | `{ name, description }` | `Project` | 프로젝트 생성 |
| GET | `/api/projects` | — | `Project[]` | 프로젝트 목록 |
| DELETE | `/api/projects/:id` | — | `{ ok: true }` | 프로젝트 삭제 |
| PUT | `/api/projects/:id` | `{ name, description }` | `Project` | 프로젝트 수정 |
| PUT | `/api/projects/:id/instructions` | `{ instructions }` | `Project` | 프로젝트 지침 수정 |
| PATCH | `/api/projects/:id/favorite` | — | `Project` | 프로젝트 즐겨찾기 토글 |

### Settings

| 메서드 | 경로 | Body | 응답 | 설명 |
|--------|------|------|------|------|
| GET | `/api/settings` | — | `Record<string, string>` | 전체 설정 조회 |
| GET | `/api/settings/:key` | — | `{ value: string \| null }` | 설정값 단건 조회 |
| PUT | `/api/settings/:key` | `{ value }` | `{ ok: true }` | 설정값 저장 (API 키 시 어댑터 갱신) |
| POST | `/api/settings/connection-test` | `{ provider }` | `{ ok: true }` | LLM 연결 테스트 |

### Models

| 메서드 | 경로 | Body | 응답 | 설명 |
|--------|------|------|------|------|
| GET | `/api/models` | — | `ModelInfo[]` | 사용 가능 모델 목록 |

### SSE 스트리밍 이벤트

`POST /api/chat/:sessionId/messages` 및 `POST /api/chat/:sessionId/messages/:messageId/regenerate`는 SSE(Server-Sent Events)로 응답.

| 이벤트 | 데이터 | 설명 |
|--------|--------|------|
| `chunk` | `{ type: "text", content: string }` | 스트리밍 텍스트 청크 |
| `title` | `{ sessionId: string, title: string }` | 자동 생성된 세션 제목 |
| `end` | `{ id, sessionId, role, content, attachments, createdAt }` | 스트리밍 완료 + 최종 assistant 메시지 |
| `error` | `{ message: string }` | 스트리밍 에러 |

SSE 원시 포맷:
```
event: chunk
data: {"type":"text","content":"Hello "}

event: title
data: {"sessionId":"abc123","title":"인사말 대화"}

event: end
data: {"id":"msg789","sessionId":"abc123","role":"assistant","content":"Hello world","attachments":[],"createdAt":"2026-02-22T..."}
```

## Electron 쉘

`packages/electron/`은 thin shell로 백엔드를 child process로 spawn하고 BrowserWindow로 프론트엔드를 로드.

### 백엔드 Spawn

- Production: 랜덤 가용 포트, `node`로 빌드된 백엔드 실행
- Dev: 포트 3131 고정, `npx tsx`로 TypeScript 직접 실행
- DB 경로: `${app.getPath('userData')}/hchat.db` (환경변수 `DCHAT_DB_PATH`로 오버라이드 가능)
- 백엔드 stdout/stderr → `[backend]` 프리픽스로 로깅
- Graceful shutdown: `SIGTERM`/`SIGINT`/`will-quit` 시 백엔드 프로세스 kill

### Health 폴링

백엔드 프로세스 spawn 후 `GET /api/health`를 200ms 간격으로 최대 30회 폴링. 응답 수신 시 BrowserWindow 로드 시작.

### Native IPC (3개)

Electron의 `ipcMain.handle()`로 등록, preload의 `contextBridge`를 통해 `window.electron`으로 노출.

| 채널 | 인자 | 반환 | 설명 |
|------|------|------|------|
| `native:pick-image` | — | `ImageAttachment[]` | 파일 다이얼로그 (png, jpg, gif, webp) → base64 인코딩 |
| `native:open-in-browser` | `htmlContent: string` | `void` | HTML을 temp 파일로 쓰고 시스템 브라우저에서 열기 |
| `native:get-api-url` / `native:get-api-url-sync` | — | `string` | `http://localhost:${backendPort}` 반환 |

### BrowserWindow

- 크기: 1200x800 (최소 800x600)
- macOS: `titleBarStyle: 'hiddenInset'`
- Dev: `ELECTRON_RENDERER_URL` 환경변수에서 로드 + Meta+Alt+I로 DevTools 토글
- Production: `../frontend/dist/index.html` 로드

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
- `HealthResponse`

SSE 이벤트 타입:
- `SSEEventType`: `'chunk' | 'title' | 'end' | 'error'`
- `SSEChunkEvent`: `{ type: 'text' | 'error' | 'done', content }`
- `SSETitleEvent`: `{ sessionId, title }`
- `SSEEndEvent`: `{ id, sessionId, role, content, attachments, createdAt }`
- `SSEErrorEvent`: `{ message }`

## 프론트엔드 API 클라이언트

`packages/frontend/src/api/`에 백엔드와의 HTTP/SSE 통신을 담당하는 모듈 배치.

### 핵심 함수 (`client.ts`)

| 함수 | 설명 |
|------|------|
| `apiFetch<T>(path, options?)` | JSON 요청/응답. 10초 타임아웃. 에러 시 throw |
| `apiSSE(path, body, callbacks)` | SSE 스트리밍. `AbortController` 반환 |
| `API_BASE` | Electron: `window.electron.getApiUrl()`, 웹: `import.meta.env.VITE_API_URL` 또는 상대 경로 |

### API 모듈 (5개)

| 모듈 | 주요 함수 |
|------|-----------|
| `chat.api.ts` | `getMessages`, `sendMessage` (SSE), `regenerate` (SSE), `stopStream` |
| `session.api.ts` | `create`, `list`, `listByProject`, `get`, `delete`, `updateModel`, `updateTitle`, `updateProjectId`, `toggleFavorite` |
| `project.api.ts` | `create`, `list`, `delete`, `update`, `updateInstructions`, `toggleFavorite` |
| `settings.api.ts` | `getAll`, `get`, `set`, `testConnection` |
| `models.api.ts` | `list` |

### Electron/웹 이중 지원 (`lib/native.ts`)

| 함수 | Electron | 웹 |
|------|----------|-----|
| `pickImage()` | `window.electron.pickImage()` → 파일 다이얼로그 | `<input type="file">` → FileReader base64 |
| `openInBrowser(html)` | `window.electron.openInBrowser()` → temp 파일 | `URL.createObjectURL(Blob)` → 30초 후 revoke |

## DB 스키마

DB 위치: `~/.dchat/dchat.db` (환경변수 `DCHAT_DB_PATH`로 오버라이드 가능, Electron에서는 `{userData}/hchat.db`)
모드: WAL, FK 활성

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  model TEXT NOT NULL,
  project_id TEXT DEFAULT NULL,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  attachments TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);
CREATE INDEX idx_messages_session_id ON messages(session_id);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  instructions TEXT NOT NULL DEFAULT '',
  is_favorite INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### 마이그레이션

`schema.ts`에서 `ALTER TABLE ... ADD COLUMN`을 try-catch로 감싸서 기존 DB 호환성 유지. 컬럼이 이미 있으면 무시.

### 알려진 settings 키

| 키 | 값 타입 | 기본값 | 용도 |
|----|---------|--------|------|
| `anthropic_api_key` | string | (없음) | Anthropic API 인증 |
| `anthropic_base_url` | string | (없음) | Anthropic 커스텀 엔드포인트 |
| `anthropic_verified` | `"true"` / `"false"` | `"false"` | Anthropic 연결 테스트 상태 |
| `openai_api_key` | string | (없음) | OpenAI API 인증 |
| `openai_base_url` | string | (없음) | OpenAI 커스텀 엔드포인트 |
| `openai_verified` | `"true"` / `"false"` | `"false"` | OpenAI 연결 테스트 상태 |
| `selected_model` | string | `claude-opus-4-6` | 기본 선택 모델 |
| `color_mode` | `"light"` / `"auto"` / `"dark"` | `"auto"` | 테마 모드 (`dark_mode` 대체) |
| `sidebar_open` | `"true"` / `"false"` | `"true"` | 사이드바 열림 상태 |
| `full_name` | string | (없음) | 사용자 프로필 이름 |
| `nickname` | string | (없음) | 사용자 프로필 닉네임 |
| `role` | string | (없음) | 사용자 역할 |
| `custom_instructions` | string | (없음) | 글로벌 커스텀 지침 (system prompt에 포함) |
| `response_notif` | `"true"` / `"false"` | `"true"` | 응답 알림 설정 |
| `code_email_notif` | `"true"` / `"false"` | `"true"` | 코드/이메일 알림 설정 |

## 지원 모델

| 모델 ID | 이름 | Provider | 라우팅 규칙 |
|---------|------|----------|------------|
| `claude-opus-4-6` | Claude Opus 4.6 | anthropic | `claude-*` 프리픽스 |
| `claude-sonnet-4-6` | Claude Sonnet 4.6 | anthropic | `claude-*` 프리픽스 |
| `claude-haiku-4-5` | Claude Haiku 4.5 | anthropic | `claude-*` 프리픽스 |
| `gpt-4o` | GPT-4o | openai | `gpt-*` 프리픽스 |
| `gpt-4o-mini` | GPT-4o Mini | openai | `gpt-*` 프리픽스 |
| `o3-mini` | o3-mini | openai | `o3*` 프리픽스 |

## 자주 하는 변경 작업 가이드

### 새 LLM 모델 추가 (기존 Provider)

1. 해당 어댑터의 `listModels()` 배열에 `ModelInfo` 추가
   - Anthropic: `packages/backend/src/adapters/outbound/llm/anthropic.adapter.ts`
   - OpenAI: `packages/backend/src/adapters/outbound/llm/openai.adapter.ts`

### 새 LLM Provider 추가

1. `LLMGateway` 구현 어댑터 작성 → `packages/backend/src/adapters/outbound/llm/`
2. `LLMAdapterFactory`에 `set{Provider}Key()`, `getGateway()` 라우팅 분기 추가
3. `packages/backend/src/adapters/inbound/http/settings.routes.ts`에 API 키 변경 시 팩토리 갱신 코드 추가
4. `packages/backend/src/container.ts`의 `restoreApiKeys()`에 키 복원 코드 추가

### 새 REST 엔드포인트 추가

1. `packages/backend/src/adapters/inbound/http/`에 라우트 파일 작성 (또는 기존 파일에 추가)
2. `packages/backend/src/server.ts`에 라우트 등록
3. `packages/frontend/src/api/`에 API 클라이언트 함수 추가
4. 새 Request/Response DTO가 필요하면 `packages/shared/src/api-types.ts`에 추가

### 새 도메인 엔티티 / 포트 추가

1. 엔티티 타입 정의 → `packages/shared/src/entities/` (공유) + `packages/backend/src/domain/entities/` (내부용)
2. 포트 인터페이스 정의 → `packages/backend/src/domain/ports/outbound/` (리포지토리) 또는 `inbound/` (유스케이스)
3. 도메인 서비스 구현 → `packages/backend/src/domain/services/` (외부 의존성 import 금지)
4. 아웃바운드 어댑터 구현 → `packages/backend/src/adapters/outbound/`
5. `packages/backend/src/container.ts`에서 와이어링

### 프론트엔드 컴포넌트 추가

1. `packages/frontend/src/components/` 하위에 컴포넌트 파일 작성
2. 필요 시 Zustand 스토어 (`packages/frontend/src/stores/`) 업데이트
3. 백엔드 호출은 `packages/frontend/src/api/` 모듈 사용

## Zustand 스토어 상태

### chat.store.ts

| 필드/액션 | 타입 | 설명 |
|-----------|------|------|
| `sessions` | `Session[]` | 전체 세션 목록 |
| `currentSessionId` | `string \| null` | 현재 선택된 세션 ID |
| `messages` | `Message[]` | 현재 세션 메시지 |
| `streamingSessionIds` | `Set<string>` | 스트리밍 진행 중인 세션 ID 집합 (멀티세션 지원) |
| `streamingContents` | `Record<string, string>` | 세션별 스트리밍 중 누적 텍스트 |
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

### settings.store.ts

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
| `setProviderVerified(provider, verified)` | action | 연결 테스트 결과 반영 |
| `openSettings()` / `closeSettings()` / `toggleSettings()` | action | 설정 화면 열기/닫기/토글 |
| `toggleSidebar()` | action | 사이드바 토글 + persist |

### project.store.ts

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
