# 아키텍처 상세 레퍼런스

## 기술 스택

| 분류 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | Electron | ^33.2.0 |
| 빌드 | electron-vite | ^2.3.0 |
| 프론트엔드 | React + TypeScript | ^18.3.1 / ^5.7.0 |
| 상태관리 | Zustand | ^5.0.11 |
| 스타일링 | Tailwind CSS | ^3.4.17 |
| DB | better-sqlite3 | ^11.7.0 |
| LLM (Anthropic) | @anthropic-ai/sdk | ^0.39.0 |
| LLM (OpenAI) | openai | ^4.78.0 |
| 마크다운 | react-markdown + remark-gfm | ^10.1.0 / ^4.0.1 |
| 텍스트 입력 | react-textarea-autosize | ^8.5.9 |
| 아이콘 | lucide-react | ^0.575.0 |
| ID 생성 | crypto.randomUUID() | Node built-in |

## 프로젝트 구조

```
src/
├── main/
│   ├── index.ts                              # Electron 앱 진입점
│   ├── container.ts                          # 컴포지션 루트 (DI 와이어링)
│   ├── domain/                               # 순수 도메인 — 외부 의존성 ZERO
│   │   ├── entities/
│   │   │   ├── message.ts                    # { id, sessionId, role, content, createdAt }
│   │   │   ├── session.ts                    # { id, title, model, projectId, isFavorite, createdAt, updatedAt }
│   │   │   ├── project.ts                    # { id, name, description, instructions, createdAt, updatedAt }
│   │   │   └── model-info.ts                 # { id, name, provider }
│   │   ├── ports/
│   │   │   ├── inbound/                      # 유스케이스 인터페이스
│   │   │   │   ├── send-message.usecase.ts   # execute(sessionId, content, onChunk, signal?)
│   │   │   │   ├── generate-title.usecase.ts # execute(sessionId)
│   │   │   │   ├── regenerate-message.usecase.ts # regenerate(sessionId, messageId, onChunk, signal?)
│   │   │   │   ├── manage-session.usecase.ts # create, list, listByProjectId, getById, delete, updateProjectId, toggleFavorite
│   │   │   │   ├── manage-project.usecase.ts # create, list, delete, update, updateInstructions
│   │   │   │   └── manage-settings.usecase.ts# get, set, getAll
│   │   │   └── outbound/                     # 리포지토리/게이트웨이 인터페이스
│   │   │       ├── llm.gateway.ts            # streamChat, listModels
│   │   │       ├── llm-gateway.resolver.ts   # getGateway(model), listAllModels()
│   │   │       ├── message.repository.ts
│   │   │       ├── session.repository.ts
│   │   │       ├── project.repository.ts
│   │   │       ├── settings.repository.ts
│   │   │       └── file-system.gateway.ts
│   │   └── services/                         # 도메인 서비스 (포트 구현)
│   │       ├── chat.service.ts               # → SendMessageUseCase, RegenerateMessageUseCase, GenerateTitleUseCase
│   │       ├── session.service.ts            # → ManageSessionUseCase
│   │       ├── project.service.ts            # → ManageProjectUseCase
│   │       ├── settings.service.ts           # → ManageSettingsUseCase
│   │       └── id.ts                         # generateId()
│   └── adapters/
│       ├── inbound/ipc/                      # Electron IPC 핸들러
│       │   ├── channels.ts                   # IPC_CHANNELS 상수 정의
│       │   ├── chat.ipc-handler.ts
│       │   ├── session.ipc-handler.ts
│       │   ├── project.ipc-handler.ts
│       │   └── settings.ipc-handler.ts
│       └── outbound/
│           ├── persistence/sqlite/           # SQLite 리포지토리
│           │   ├── connection.ts             # DB 연결 (WAL 모드)
│           │   ├── schema.ts                 # DDL (sessions, messages, settings)
│           │   ├── message.repository.impl.ts
│           │   ├── session.repository.impl.ts
│           │   ├── project.repository.impl.ts
│           │   └── settings.repository.impl.ts
│           ├── llm/                          # LLM 어댑터
│           │   ├── llm-adapter.factory.ts    # → LLMGatewayResolver
│           │   ├── anthropic.adapter.ts      # → LLMGateway
│           │   └── openai.adapter.ts         # → LLMGateway
│           └── filesystem/
│               └── node-fs.adapter.ts        # → FileSystemGateway
├── preload/
│   └── index.ts                              # contextBridge → window.hchat API
└── renderer/                                 # React 프론트엔드
    ├── index.html
    ├── main.tsx
    ├── App.tsx
    ├── styles/globals.css
    ├── stores/
    │   ├── chat.store.ts                     # 세션/메시지 상태 (Zustand)
    │   ├── project.store.ts                  # 프로젝트 CRUD 상태 (Zustand)
    │   └── settings.store.ts                 # 설정/모델 상태 (Zustand)
    ├── hooks/
    │   └── useIpc.ts                         # 스트리밍 이벤트 리스너 관리
    ├── lib/
    │   ├── model-meta.ts                    # 모델 UI 메타데이터 (공유)
    │   └── time.ts                          # formatRelativeTime(), formatTime() — 시간 포맷 유틸
    └── components/
        ├── chat/
        │   ├── ChatArea.tsx
        │   ├── MessageList.tsx
        │   ├── MessageBubble.tsx
        │   ├── CodeBlock.tsx                  # 코드 블록 (syntax highlight, sticky 헤더)
        │   ├── ArtifactPanel.tsx              # 아티팩트 사이드 패널 (코드 뷰어)
        │   ├── HtmlArtifactCard.tsx           # HTML 아티팩트 인라인 카드
        │   ├── ModelSelector.tsx
        │   ├── PromptInput.tsx
        │   └── StreamingIndicator.tsx
        ├── home/
        │   ├── HomeScreen.tsx               # 세션 미선택 시 홈 화면 (퀵 액션, 시간대 인사)
        │   ├── AllChatsScreen.tsx           # 전체 채팅 목록 페이지 (검색, 세션 리스트)
        │   ├── ProjectsScreen.tsx           # 프로젝트 관리 페이지 (CRUD)
        │   └── ProjectDetailScreen.tsx      # 프로젝트 상세 페이지 (selectedProjectId 기반)
        ├── search/
        │   └── SearchModal.tsx              # Cmd+K 검색 모달 (세션 검색, 키보드 네비게이션)
        ├── settings/
        │   └── SettingsScreen.tsx           # 설정 화면 (API 키, 모델 선택, 다크모드)
        └── layout/
            ├── MainLayout.tsx               # 글로벌 키보드 단축키 (Cmd+K, Cmd+,)
            ├── Sidebar.tsx
            ├── SettingsPanel.tsx             # 설정 모달 (API 키, 모델 선택)
            ├── SettingsMenu.tsx              # 프로필 클릭 팝오버 메뉴
            └── SessionContextMenu.tsx        # 세션 우클릭/⋯ 컨텍스트 메뉴
```

## 데이터 흐름

### 1. 채팅 메시지 전송 (스트리밍)

```
Renderer: chat.store.sendMessage()
  → IPC invoke: chat:send-message(sessionId, content)
    → ChatIpcHandler (AbortController 생성, this.abortController에 보관)
      → ChatService.execute(sessionId, content, onChunk, signal)
        1. sessionRepo.findById(sessionId)
        2. messageRepo.save(userMessage)
        3. messageRepo.findBySessionId(sessionId)  // 히스토리
        4. llmResolver.getGateway(session.model)    // Anthropic or OpenAI
        5. gateway.streamChat(history, options, signal)  // AsyncIterable<StreamChunk>
           → 각 chunk마다 onChunk 콜백 호출
             → webContents.send('chat:stream-chunk', chunk)  // Renderer로 push
             → 첫 번째 청크 도착 시 generateTitle() fire-and-forget
        6. messageRepo.save(assistantMessage)       // 빈 내용이면 저장 생략
      → webContents.send('chat:stream-end', message)
Renderer: useIpc 훅이 stream-chunk/stream-end 이벤트 수신 → store 업데이트

### 1-2. 메시지 재생성

```
Renderer: chat.store.regenerateMessage(messageId)
  → role 기반으로 messages 잘라내기 (user: 본인 유지, assistant: 본인 제거)
  → IPC invoke: chat:regenerate(sessionId, messageId)
    → ChatIpcHandler (AbortController 생성)
      → ChatService.regenerate(sessionId, messageId, onChunk, signal)
        1. messageRepo.findBySessionId(sessionId)         // 전체 조회
        2. 대상 메시지 findIndex → role 기반 keepCount 결정
        3. 이후 메시지 deleteById 루프로 삭제
        4. 남은 history로 gateway.streamChat()             // 스트리밍
        5. messageRepo.save(assistantMessage)
      → webContents.send('chat:stream-end', message)
```

중단 흐름:
Renderer: chat.store.stopStream()
  → IPC invoke: chat:stop-stream
    → ChatIpcHandler: this.abortController.abort()
      → signal.aborted = true → streamChat의 async iterator 종료
      → catch에서 abort 감지 → webContents.send('chat:stream-end', { content: '' })
```

### 2. 세션 CRUD

```
Renderer: Sidebar → chat.store.createSession() / deleteSession() / selectSession()
  → IPC invoke: session:create / session:delete / session:list / session:get
    → SessionIpcHandler → SessionService → SqliteSessionRepository
    (삭제 시 messageRepo.deleteBySessionId 연쇄 삭제)
```

### 3. 설정 및 API 키

```
Renderer: SettingsPanel → settings.store.setSetting(key, value)
  → IPC invoke: settings:set(key, value)
    → SettingsIpcHandler
      1. settingsService.set(key, value) → SqliteSettingsRepository
      2. if key === 'anthropic_api_key' → llmFactory.setAnthropicKey(value)
         if key === 'openai_api_key'   → llmFactory.setOpenAIKey(value)
         (즉시 새 어댑터 인스턴스 생성)
```

## IPC 채널 레퍼런스

채널 상수: `src/main/adapters/inbound/ipc/channels.ts` (`IPC_CHANNELS`)
Preload 노출: `window.hchat` (`src/preload/index.ts`)

### invoke (Renderer → Main, 요청-응답)

| 채널 | 인자 | 반환 | 설명 |
|------|------|------|------|
| `chat:send-message` | `sessionId, content` | `Message` | 메시지 전송 + 스트리밍 시작 |
| `chat:stop-stream` | (없음) | `void` | 스트리밍 중단 |
| `chat:get-messages` | `sessionId` | `Message[]` | 세션 메시지 조회 |
| `chat:regenerate` | `sessionId, messageId` | `Message` | 메시지 재생성 (role 기반 삭제 + 스트리밍) |
| `session:create` | `title, model, projectId?` | `Session` | 새 세션 생성 |
| `session:list` | (없음) | `Session[]` | 전체 세션 목록 |
| `session:get` | `id` | `Session \| null` | 세션 단건 조회 |
| `session:delete` | `id` | `void` | 세션 삭제 (메시지 연쇄 삭제) |
| `settings:get` | `key` | `string \| null` | 설정값 조회 |
| `settings:set` | `key, value` | `void` | 설정값 저장 (API 키 시 어댑터 갱신) |
| `settings:get-all` | (없음) | `Record<string, string>` | 전체 설정 조회 |
| `session:update-model` | `id, model` | `Session` | 세션 모델 변경 |
| `session:update-title` | `id, title` | `Session` | 세션 제목 변경 |
| `session:toggle-favorite` | `id` | `Session` | 세션 즐겨찾기 토글 |
| `session:list-by-project` | `projectId` | `Session[]` | 프로젝트별 세션 목록 |
| `session:update-project` | `id, projectId` | `Session` | 세션-프로젝트 연결 변경 |
| `project:create` | `name, description` | `Project` | 프로젝트 생성 |
| `project:list` | (없음) | `Project[]` | 프로젝트 목록 |
| `project:delete` | `id` | `void` | 프로젝트 삭제 |
| `project:update` | `id, name, description` | `Project` | 프로젝트 수정 |
| `project:update-instructions` | `id, instructions` | `Project` | 프로젝트 지침 수정 |
| `llm:list-models` | (없음) | `ModelInfo[]` | 사용 가능 모델 목록 |

### send (Main → Renderer, 단방향 이벤트)

| 채널 | 데이터 | 설명 |
|------|--------|------|
| `chat:stream-chunk` | `StreamChunk { type, content }` | 스트리밍 텍스트 청크 |
| `chat:stream-end` | `Message` | 스트리밍 완료 + 최종 메시지 |
| `chat:stream-error` | `string` | 스트리밍 에러 메시지 |
| `session:title-updated` | `sessionId, title` | 자동 생성된 세션 제목 전달 |

## DB 스키마

DB 위치: `{userData}/hchat.db` (WAL 모드, FK 활성)

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
| `openai_api_key` | string | (없음) | OpenAI API 인증 |
| `selected_model` | string | `claude-opus-4-6` | 기본 선택 모델 |
| `dark_mode` | `"true"` / `"false"` | `"true"` | 다크 모드 토글 |
| `custom_instructions` | string | (없음) | 글로벌 커스텀 지침 (system prompt에 포함) |

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
   - Anthropic: `src/main/adapters/outbound/llm/anthropic.adapter.ts`
   - OpenAI: `src/main/adapters/outbound/llm/openai.adapter.ts`

### 새 LLM Provider 추가

1. `LLMGateway` 구현 어댑터 작성 → `src/main/adapters/outbound/llm/`
2. `LLMAdapterFactory`에 `set{Provider}Key()`, `getGateway()` 라우팅 분기 추가
3. `SettingsIpcHandler.register()`에 API 키 변경 시 팩토리 갱신 코드 추가
4. `container.ts`의 `restoreApiKeys()`에 키 복원 코드 추가

### 새 IPC 채널 추가

1. `src/main/adapters/inbound/ipc/channels.ts`에 채널 상수 추가
2. 해당 IPC 핸들러(또는 새 핸들러)에 `ipcMain.handle()` 등록
3. `src/preload/index.ts`에 `ipcRenderer.invoke()` 래퍼 추가
4. 새 핸들러인 경우 `container.ts`에 인스턴스 생성 + `registerIpc()`에 등록

### 새 도메인 엔티티 / 포트 추가

1. 엔티티 타입 정의 → `src/main/domain/entities/`
2. 포트 인터페이스 정의 → `src/main/domain/ports/outbound/` (리포지토리) 또는 `inbound/` (유스케이스)
3. 도메인 서비스 구현 → `src/main/domain/services/` (외부 의존성 import 금지)
4. 아웃바운드 어댑터 구현 → `src/main/adapters/outbound/`
5. `container.ts`에서 와이어링

### Renderer 컴포넌트 추가

1. `src/renderer/components/` 하위에 컴포넌트 파일 작성
2. 필요 시 Zustand 스토어 (`src/renderer/stores/`) 업데이트
3. IPC 호출은 `window.hchat.*` API 사용 (직접 `ipcRenderer` import 금지)

## Zustand 스토어 상태

### chat.store.ts

| 필드/액션 | 타입 | 설명 |
|-----------|------|------|
| `sessions` | `Session[]` | 전체 세션 목록 |
| `currentSessionId` | `string \| null` | 현재 선택된 세션 ID |
| `messages` | `Message[]` | 현재 세션 메시지 |
| `isStreaming` | `boolean` | 스트리밍 진행 중 여부 |
| `streamingContent` | `string` | 스트리밍 중 누적 텍스트 |
| `searchOpen` | `boolean` | 검색 모달 열림 상태 |
| `allChatsOpen` | `boolean` | 전체 채팅 목록 페이지 열림 상태 |
| `projectsOpen` | `boolean` | 프로젝트 페이지 열림 상태 |
| `openSearch()` | action | 검색 모달 열기 |
| `closeSearch()` | action | 검색 모달 닫기 |
| `openAllChats()` | action | 전체 채팅 목록 열기 (`projectsOpen = false`, `currentSessionId = null`) |
| `closeAllChats()` | action | 전체 채팅 목록 닫기 |
| `openProjects()` | action | 프로젝트 페이지 열기 (`allChatsOpen = false`, `currentSessionId = null`) |
| `closeProjects()` | action | 프로젝트 페이지 닫기 |
| `toggleSessionFavorite(id)` | action | 세션 즐겨찾기 토글 (IPC 호출 + 낙관적 업데이트) |
| `selectSession(id)` | action | 세션 선택 + 메시지 로드 + `allChatsOpen = false`, `projectsOpen = false` |
| `deselectSession()` | action | 세션 선택 해제 + `allChatsOpen = false`, `projectsOpen = false` → HomeScreen |
| `createSession(title, model, projectId?)` | action | 새 세션 생성 |
| `deleteSession(id)` | action | 세션 삭제 |
| `sendMessage(content)` | action | 메시지 전송 + 스트리밍 시작 |
| `regenerateMessage(messageId)` | action | 메시지 재생성 (role 기반 삭제 + 스트리밍) |
| `stopStream()` | action | 스트리밍 중단 (IPC로 abort 요청) |
| `updateSessionProjectId(id, projectId)` | action | 세션-프로젝트 연결 변경 |

### settings.store.ts

| 필드/액션 | 타입 | 설명 |
|-----------|------|------|
| `settings` | `Record<string, string>` | 전체 설정값 |
| `models` | `ModelInfo[]` | 사용 가능 모델 목록 |
| `settingsOpen` | `boolean` | 설정 화면 열림 상태 |
| `openSettings()` | action | 설정 화면 열기 |
| `closeSettings()` | action | 설정 화면 닫기 |
| `toggleSettings()` | action | 설정 화면 토글 |
| `loadSettings()` | action | 설정 + 모델 목록 로드 |
| `setSetting(key, value)` | action | 설정값 저장 |

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
| `selectProject(id)` | action | 프로젝트 선택 → ProjectDetailScreen 진입 |
| `deselectProject()` | action | 프로젝트 선택 해제 → ProjectsScreen 복귀 |
