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
│       │   ├── message-list/                    # MessageList, MessageBubble, CodeBlock, HtmlArtifactCard, StreamingIndicator
│       │   ├── prompt-input/                    # PromptInput, PromptMenu, ModelSelector
│       │   └── artifact-panel/                  # ArtifactPanel
│       ├── features/                            # 사용자 인터랙션
│       │   ├── search/                          # SearchModal
│       │   └── manage-project/                  # ProjectContextMenu
│       ├── entities/                            # 비즈니스 엔티티 (api/ + model/ + index.ts barrel)
│       │   ├── session/                         # sessionApi, chatApi, useSessionStore
│       │   ├── project/                         # projectApi, useProjectStore
│       │   └── settings/                        # settingsApi, useSettingsStore
│       └── shared/                              # 인프라, 유틸
│           ├── api/                             # client.ts (apiFetch, apiSSE), models.api.ts
│           └── lib/                             # native.ts, model-meta.ts, time.ts
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

## 지원 모델

| 모델 ID | 이름 | Provider | 라우팅 규칙 |
|---------|------|----------|------------|
| `claude-opus-4-6` | Claude Opus 4.6 | anthropic | `claude-*` 프리픽스 |
| `claude-sonnet-4-6` | Claude Sonnet 4.6 | anthropic | `claude-*` 프리픽스 |
| `claude-haiku-4-5` | Claude Haiku 4.5 | anthropic | `claude-*` 프리픽스 |
| `gpt-4o` | GPT-4o | openai | `gpt-*` 프리픽스 |
| `gpt-4o-mini` | GPT-4o Mini | openai | `gpt-*` 프리픽스 |
| `o3-mini` | o3-mini | openai | `o3*` 프리픽스 |
