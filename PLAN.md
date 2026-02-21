# D Chat Desktop 개발 계획

## Context

D Chat Desktop은 Anthropic의 Claude Code Desktop과 유사한 크로스 플랫폼 데스크톱 채팅 애플리케이션입니다. 사용자가 로컬 PC의 파일을 읽고, AI와 대화하며, 코드 리뷰와 편집을 수행할 수 있는 도구를 목표로 합니다. **헥사고날 아키텍처(Ports & Adapters)**를 적용하여 도메인 로직과 외부 의존성을 명확히 분리합니다.

---

## 아키텍처 개요: 헥사고날 아키텍처

```
                    ┌─────────────────────────────────────┐
                    │         Inbound Adapters             │
                    │  (IPC Handlers, Electron Menu)       │
                    └──────────────┬──────────────────────┘
                                   │ calls
                    ┌──────────────▼──────────────────────┐
                    │         Inbound Ports                │
                    │  (Use Case Interfaces)               │
                    │  SendMessage, CreateSession, ...     │
                    └──────────────┬──────────────────────┘
                                   │ implements
                    ┌──────────────▼──────────────────────┐
                    │         Domain Core                  │
                    │  (Entities, Services)                │
                    │  Message, Session, ChatService       │
                    │  ※ 외부 의존성 ZERO                   │
                    └──────────────┬──────────────────────┘
                                   │ depends on (interface)
                    ┌──────────────▼──────────────────────┐
                    │         Outbound Ports               │
                    │  (Repository / Gateway Interfaces)   │
                    │  LLMGateway, MessageRepository, ...  │
                    └──────────────┬──────────────────────┘
                                   │ implements
                    ┌──────────────▼──────────────────────┐
                    │         Outbound Adapters            │
                    │  (SQLite, Anthropic SDK, OpenAI SDK) │
                    │  (Node.js fs)                        │
                    └─────────────────────────────────────┘
```

**의존성 규칙**: Domain Core는 어떤 외부 라이브러리에도 의존하지 않는다. 모든 외부 의존은 Outbound Port 인터페이스를 통해서만 이루어진다.

---

## 기술 스택

| 영역 | 선택 | 이유 |
|------|------|------|
| Desktop Shell | **Electron** (electron-vite) | Node.js fs 직접 접근, 성숙한 생태계 |
| Frontend | **React 18 + TypeScript** | 컴포넌트 기반, 타입 안전성 |
| 빌드 도구 | **electron-vite** | Electron에 최적화된 Vite 기반 빌드 |
| UI 라이브러리 | **shadcn/ui + Radix UI + Tailwind CSS** | 커스터마이징 가능한 모던 UI |
| 상태 관리 | **Zustand** | 간결한 API, 보일러플레이트 최소 |
| DB | **better-sqlite3** | 세션/메시지 영속 저장 |
| 마크다운 | **react-markdown + remark-gfm** | 채팅 메시지 렌더링 |
| 코드 하이라이팅 | **Shiki** | 정확한 문법 하이라이팅 |
| AI SDK | **Anthropic SDK + OpenAI SDK** | 멀티 LLM, Outbound Adapter로 래핑 |
| 패키징 | **electron-builder** | 크로스 플랫폼 빌드 및 배포 |

---

## 프로젝트 구조

```
hchat-desktop/
├── electron.vite.config.ts
├── package.json
├── tsconfig.json
├── tailwind.config.js
│
├── src/
│   ├── main/                                    # Electron Main Process
│   │   ├── index.ts                             # 앱 진입점, BrowserWindow 생성
│   │   ├── container.ts                         # ★ 컴포지션 루트 (DI 와이어링)
│   │   │
│   │   ├── domain/                              # ── Domain Core (외부 의존 ZERO) ──
│   │   │   ├── entities/
│   │   │   │   ├── message.ts                   # Message 엔티티
│   │   │   │   ├── session.ts                   # Session 엔티티
│   │   │   │   └── model-info.ts                # ModelInfo 값 객체
│   │   │   │
│   │   │   ├── ports/
│   │   │   │   ├── inbound/                     # ── Inbound Ports (Use Cases) ──
│   │   │   │   │   ├── send-message.usecase.ts  # SendMessage 유스케이스 인터페이스
│   │   │   │   │   ├── manage-session.usecase.ts # 세션 CRUD 유스케이스 인터페이스
│   │   │   │   │   └── manage-settings.usecase.ts
│   │   │   │   │
│   │   │   │   └── outbound/                    # ── Outbound Ports (인터페이스) ──
│   │   │   │       ├── llm.gateway.ts           # LLM 통신 인터페이스
│   │   │   │       ├── message.repository.ts    # 메시지 저장소 인터페이스
│   │   │   │       ├── session.repository.ts    # 세션 저장소 인터페이스
│   │   │   │       ├── settings.repository.ts   # 설정 저장소 인터페이스
│   │   │   │       └── file-system.gateway.ts   # 파일 시스템 접근 인터페이스
│   │   │   │
│   │   │   └── services/                        # ── Domain Services ──
│   │   │       ├── chat.service.ts              # 채팅 핵심 로직 (Inbound Port 구현)
│   │   │       ├── session.service.ts           # 세션 관리 로직
│   │   │       └── settings.service.ts          # 설정 관리 로직
│   │   │
│   │   ├── adapters/
│   │   │   ├── inbound/                         # ── Inbound Adapters ──
│   │   │   │   └── ipc/
│   │   │   │       ├── channels.ts              # IPC 채널명 상수
│   │   │   │       ├── chat.ipc-handler.ts      # 채팅 IPC 핸들러
│   │   │   │       ├── session.ipc-handler.ts   # 세션 IPC 핸들러
│   │   │   │       └── settings.ipc-handler.ts  # 설정 IPC 핸들러
│   │   │   │
│   │   │   └── outbound/                        # ── Outbound Adapters ──
│   │   │       ├── llm/
│   │   │       │   ├── anthropic.adapter.ts     # Anthropic SDK → LLMGateway 구현
│   │   │       │   ├── openai.adapter.ts        # OpenAI SDK → LLMGateway 구현
│   │   │       │   └── llm-adapter.factory.ts   # 모델명 → 어댑터 매핑 팩토리
│   │   │       │
│   │   │       ├── persistence/
│   │   │       │   └── sqlite/
│   │   │       │       ├── connection.ts        # SQLite 연결 관리
│   │   │       │       ├── schema.ts            # 테이블 스키마 및 마이그레이션
│   │   │       │       ├── message.repository.impl.ts
│   │   │       │       ├── session.repository.impl.ts
│   │   │       │       └── settings.repository.impl.ts
│   │   │       │
│   │   │       └── filesystem/
│   │   │           └── node-fs.adapter.ts       # Node.js fs → FileSystemGateway 구현
│   │   │
│   │   └── shared/                              # Main 프로세스 공유 타입
│   │       └── types.ts
│   │
│   ├── preload/                                 # Preload Script (보안 브릿지)
│   │   └── index.ts                             # contextBridge API 노출
│   │
│   └── renderer/                                # React Frontend (Inbound Adapter)
│       ├── index.html
│       ├── main.tsx
│       ├── App.tsx
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Sidebar.tsx
│       │   │   └── MainLayout.tsx
│       │   ├── chat/
│       │   │   ├── ChatArea.tsx
│       │   │   ├── MessageList.tsx
│       │   │   ├── MessageBubble.tsx
│       │   │   ├── PromptInput.tsx
│       │   │   └── StreamingIndicator.tsx
│       │   └── ui/                              # shadcn/ui 컴포넌트
│       ├── stores/
│       │   ├── chat.store.ts
│       │   └── settings.store.ts
│       ├── hooks/
│       │   └── useIpc.ts
│       └── lib/
│           └── utils.ts
│
├── resources/
└── build/
```

---

## 핵심 인터페이스 설계

### Outbound Port: LLM Gateway

```typescript
// src/main/domain/ports/outbound/llm.gateway.ts
export interface StreamChunk {
  type: 'text' | 'error' | 'done';
  content: string;
}

export interface ChatOptions {
  model: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface LLMGateway {
  streamChat(messages: Message[], options: ChatOptions): AsyncIterable<StreamChunk>;
  listModels(): ModelInfo[];
}
```

### Outbound Port: Repositories

```typescript
// src/main/domain/ports/outbound/message.repository.ts
export interface MessageRepository {
  findBySessionId(sessionId: string): Promise<Message[]>;
  save(message: Message): Promise<void>;
  deleteBySessionId(sessionId: string): Promise<void>;
}

// src/main/domain/ports/outbound/session.repository.ts
export interface SessionRepository {
  findAll(): Promise<Session[]>;
  findById(id: string): Promise<Session | null>;
  save(session: Session): Promise<void>;
  delete(id: string): Promise<void>;
}
```

### Inbound Port: Use Cases

```typescript
// src/main/domain/ports/inbound/send-message.usecase.ts
export interface SendMessageUseCase {
  execute(
    sessionId: string,
    content: string,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<Message>;
}
```

### 컴포지션 루트 (DI 와이어링)

```typescript
// src/main/container.ts — 모든 의존성 조립이 이 파일 하나에서 이루어짐
export function createContainer(db: Database) {
  // Outbound Adapters
  const messageRepo = new SqliteMessageRepository(db);
  const sessionRepo = new SqliteSessionRepository(db);
  const settingsRepo = new SqliteSettingsRepository(db);
  const fileSystem = new NodeFsAdapter();
  const llmFactory = new LLMAdapterFactory();

  // Domain Services (Outbound Port 주입)
  const chatService = new ChatService(messageRepo, llmFactory);
  const sessionService = new SessionService(sessionRepo);
  const settingsService = new SettingsService(settingsRepo);

  // Inbound Adapters (Domain Service 주입)
  const chatIpcHandler = new ChatIpcHandler(chatService);
  const sessionIpcHandler = new SessionIpcHandler(sessionService);
  const settingsIpcHandler = new SettingsIpcHandler(settingsService);

  return { chatIpcHandler, sessionIpcHandler, settingsIpcHandler };
}
```

---

## 개발 단계

### Phase 1: 프로젝트 초기 설정 + 헥사고날 스캐폴딩

**목표**: Electron 앱 스캐폴딩 + 헥사고날 디렉토리 구조 생성

1. electron-vite로 프로젝트 초기화
2. 핵심 의존성 설치
3. tsconfig.json 설정 (main, preload, renderer)
4. Tailwind CSS + PostCSS 설정
5. 헥사고날 디렉토리 구조 생성 (`domain/`, `adapters/`, `ports/`)
6. `container.ts` 컴포지션 루트 스켈레톤 작성
7. Electron 윈도우 기본 실행 확인

### Phase 2: Domain Core + Outbound Ports 정의

**목표**: 도메인 엔티티와 포트 인터페이스 정의 (외부 의존성 없는 순수 코드)

1. 도메인 엔티티 정의: `Message`, `Session`, `ModelInfo`
2. Outbound Port 인터페이스 정의: `LLMGateway`, `MessageRepository`, `SessionRepository`, `SettingsRepository`, `FileSystemGateway`
3. Inbound Port (Use Case) 인터페이스 정의: `SendMessageUseCase`, `ManageSessionUseCase`, `ManageSettingsUseCase`
4. Domain Service 스켈레톤 작성: `ChatService`, `SessionService`, `SettingsService`

### Phase 3: Outbound Adapters 구현

**목표**: 도메인이 의존하는 외부 시스템 어댑터 구현

1. SQLite 연결 및 스키마 마이그레이션 (`connection.ts`, `schema.ts`)
2. `SqliteMessageRepository` — `MessageRepository` 포트 구현
3. `SqliteSessionRepository` — `SessionRepository` 포트 구현
4. `SqliteSettingsRepository` — `SettingsRepository` 포트 구현
5. `AnthropicAdapter` — `LLMGateway` 포트 구현 (스트리밍)
6. `OpenAIAdapter` — `LLMGateway` 포트 구현 (스트리밍)
7. `LLMAdapterFactory` — 모델명 기반 어댑터 생성
8. `NodeFsAdapter` — `FileSystemGateway` 포트 구현

### Phase 4: Inbound Adapters (IPC) + Preload

**목표**: Renderer↔Main 통신 체계 구축

1. IPC 채널 상수 정의 (`channels.ts`)
2. `ChatIpcHandler` — 메시지 전송, 스트리밍 청크 push
3. `SessionIpcHandler` — 세션 CRUD
4. `SettingsIpcHandler` — API 키, 모델 설정
5. Preload 스크립트 — `contextBridge`로 타입 안전한 API 노출
6. `container.ts`에서 모든 의존성 와이어링 완성

### Phase 5: Renderer UI

**목표**: React 프론트엔드 구현

1. `MainLayout.tsx` — 사이드바 + 채팅 영역 분할
2. `Sidebar.tsx` — 세션 목록, 새 세션 생성
3. `ChatArea.tsx` — 메시지 목록 + 입력창
4. `PromptInput.tsx` — Enter 전송, Shift+Enter 줄바꿈
5. `MessageBubble.tsx` — 사용자/AI 메시지 구분, 마크다운 렌더링
6. `StreamingIndicator.tsx` — 스트리밍 중 표시
7. Zustand 스토어 — IPC를 통한 상태 관리
8. 모델 선택 드롭다운, API 키 설정 화면
9. 다크모드/라이트모드 토글
10. react-markdown + Shiki 코드 하이라이팅

### Phase 6 (후속): 고급 기능

MVP 이후 순차적으로 추가:
- 파일 첨부 및 드래그 앤 드롭
- Diff 뷰어 (코드 변경사항 시각화)
- @-mention 파일 컨텍스트
- Permission 모드 (Ask, Code, Plan, Act)
- 로컬 파일 트리 탐색기
- MCP 서버 연동
- electron-builder 크로스 플랫폼 패키징

---

## 핵심 파일 설명

| 파일 | 역할 |
|------|------|
| `src/main/container.ts` | **컴포지션 루트**. 모든 의존성 와이어링이 여기서 이루어짐 |
| `src/main/domain/ports/outbound/llm.gateway.ts` | LLM 아웃바운드 포트. 멀티 LLM 추상화의 근간 |
| `src/main/domain/services/chat.service.ts` | 채팅 도메인 서비스. 핵심 비즈니스 로직 |
| `src/main/adapters/inbound/ipc/chat.ipc-handler.ts` | IPC 인바운드 어댑터. Renderer 요청 → 유스케이스 변환 |
| `src/main/adapters/outbound/persistence/sqlite/message.repository.impl.ts` | SQLite 메시지 Repository 구현 |
| `src/main/adapters/outbound/llm/anthropic.adapter.ts` | Anthropic SDK 래핑 어댑터 |
| `src/renderer/components/chat/ChatArea.tsx` | 메인 채팅 UI 컴포넌트 |

---

## 검증 방법

### Phase 1 검증
```bash
npm run dev  # Electron 윈도우가 뜨고 React 앱 로드 확인
```

### Phase 2 검증
- 도메인 엔티티와 포트 인터페이스가 **외부 import 없이** 컴파일되는지 확인
- `domain/` 디렉토리 내부에서 `electron`, `better-sqlite3`, `@anthropic-ai/sdk` 등의 import가 없어야 함

### Phase 3 검증
- SQLite에 세션/메시지 CRUD가 정상 동작하는지 확인
- Anthropic/OpenAI 어댑터에서 스트리밍 응답 수신 확인

### Phase 4 검증
- Renderer에서 IPC를 통해 세션 생성 → Main에서 DB 저장 → Renderer에 응답 반환
- 메시지 전송 → 스트리밍 청크가 Renderer로 전달되는지 확인

### Phase 5 검증
- 전체 플로우: 세션 생성 → 메시지 입력 → AI 스트리밍 응답 → 마크다운 렌더링
- 앱 재시작 후 세션/메시지 유지 확인
- 모델 전환 후 정상 동작 확인
