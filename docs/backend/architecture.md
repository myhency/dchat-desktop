# 백엔드 아키텍처

## DB 스키마

DB 위치: `~/.dchat/dchat.db` (환경변수 `DCHAT_DB_PATH`로 오버라이드 가능). Electron dev 모드에서는 `DCHAT_DB_PATH` 미설정 → 백엔드 폴백 사용 (`npm run dev`와 동일 DB 공유). Electron 프로덕션에서만 `${app.getPath('userData')}/dchat.db`로 설정.
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
  segments TEXT DEFAULT NULL,
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
  memory_content TEXT NOT NULL DEFAULT '',
  memory_updated_at TEXT DEFAULT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### Repository `deleteAll()` 패턴

모든 리포지토리 포트(Message, Session, Project, Settings)에 `deleteAll()` 메서드가 존재. 백업 가져오기(`BackupService.importBackup`) 시 기존 데이터를 전체 삭제한 뒤 복원 데이터를 삽입하는 용도.

FK 제약 조건에 따른 삭제 순서: **messages → sessions → projects → settings**

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
| `launch_at_startup` | `"true"` / `"false"` | `"false"` | 시작 시 자동 실행 (데스크톱) |
| `quick_access_shortcut` | string | `"double-option"` | 퀵챗 단축키 (`double-option`, `option-space`, `custom:{accelerator}`, `none`) |
| `show_in_menu_bar` | `"true"` / `"false"` | `"true"` | 메뉴 바 트레이 아이콘 표시 (데스크톱) |
| `memory_enabled` | `"true"` / `"false"` | `"false"` | 메모리 자동 추출 활성화 |
| `chat_search_enabled` | `"true"` / `"false"` | `"false"` | 채팅 검색(과거 대화 참조) 활성화 |
| `memory_content` | string | (없음) | 메모리 내용 (4-section 마크다운: Work/Personal/Top of mind/Brief history) |
| `memory_updated_at` | ISO 8601 string | (없음) | 메모리 마지막 업데이트 시각 |
| `builtin_tools_allowed_dirs` | JSON string (string[]) | `"[]"` | 내장 파일시스템 도구가 접근 가능한 디렉토리 목록 |
| `builtin_tools_shell_enabled` | `"true"` / `"false"` | `"false"` | 내장 셸 명령어 실행 도구 활성화 |
| `builtin_tools_permissions` | JSON string (Record<string, ToolPermission>) | `"{}"` | 도구별 권한 (`"always"` / `"confirm"` / `"blocked"`). 미설정 키는 `isDangerous` 기반 기본값 사용 |

## MCP 서버 설정 파일

MCP 서버 설정은 SQLite가 아닌 JSON 파일로 관리. 사용자가 직접 편집할 수 있도록 의도된 설계.

- 위치: `~/.dchat/mcp_config.json` (환경변수 `DCHAT_MCP_CONFIG_PATH`로 오버라이드 가능)
- 어댑터: `JsonFileMcpServerRepository` (`adapters/outbound/persistence/json/mcp-config.repository.ts`)

```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
      "env": { "OPTIONAL_VAR": "value" }
    }
  }
}
```

- 서버 `id` = JSON 키 (server-name). 별도 ID 필드 없음
- `enabled` 필드 없음 — JSON에 존재하면 enabled, 삭제하면 disabled
- `createdAt`/`updatedAt`는 파일 mtime에서 도출 (DB 저장하지 않음)
- **수정 시 주의**: `save()`에서 `id !== name`이면 rename case로 판단하여 이전 키 삭제

## 내장 도구 (Built-in Tools)

외부 MCP 서버 없이 백엔드 자체적으로 제공하는 도구. `adapters/outbound/builtin-tools/`에 위치.

### 구조

- **`BuiltInToolProvider`**: settings에서 `builtin_tools_allowed_dirs`/`builtin_tools_shell_enabled` 읽어 사용 가능한 도구 목록과 실행 제공. 도구별 파일은 `tools/` 하위 디렉토리.
- **`CompositeMcpClientGateway`**: `BuiltInToolProvider` + `StdioMcpClientManager`를 합성하여 `McpClientGateway` 인터페이스 구현. `container.ts`에서 `mcpClient`로 주입.
- **도구 식별**: 내장 도구의 `serverId`는 `"__builtin__"`. `callTool` 시 이 ID로 내장/외부 분기.

### 도구 확인(Confirmation) 흐름

위험한 도구 실행(파일 쓰기, 셸 명령어 등) 시 사용자 승인을 요청하는 패턴:

1. `CompositeMcpClientGateway.callTool()` → `confirmationHandler(toolUseId, toolName, input)` 호출
2. `chat.routes.ts`에서 SSE `tool_confirm` 이벤트 전송 + `pendingConfirmations` Map에 Promise 등록
3. 프론트엔드에서 `POST /api/chat/:sessionId/tool-confirm` 으로 승인/거부 응답
4. `pendingConfirmations`의 resolve가 호출되어 도구 실행 계속/중단
5. 타임아웃(`CONFIRM_TIMEOUT_MS = 60초`) 경과 시 자동 거부

- **상태 API**: `GET /api/builtin-tools/status` → `BuiltinToolsStatusDTO` 반환. 각 디렉토리에 `fs.access()` 수행하여 `running`/`error`/`disabled` 판별. 라우트: `builtin-tools.routes.ts`, 로직: `BuiltInToolProvider.getStatus()`.
- **`setConfirmationHandler` / `clearConfirmationHandler`**: SSE 스트림 시작/종료 시 설정/해제. 각 SSE 라우트(send, regenerate, edit)에서 동일 패턴 반복.
- **클라이언트 연결 끊김**: `res.on('close')`에서 모든 pending confirmation을 자동 거부
- **수정 시 주의**: `McpClientGateway.getAllTools()`는 `Promise<McpToolDefinition[]>` 반환 (내장 도구가 settings를 비동기로 읽으므로). 호출 측에서 반드시 `await` 필요.

### MCP Tool Use 루프 (ChatService)

`ChatService.execute()`/`regenerate()`에서 MCP 도구가 있을 때 `streamChatRaw()`를 반복 호출하는 루프:

1. `mcpClient.getAllTools()`로 모든 running 서버의 도구 수집 → `options.tools`에 전달
2. LLM이 `tool_use`로 응답하면 → `mcpClient.callTool(serverId, toolName, input)` 실행
3. `tool_result`를 메시지 히스토리에 추가 → 다시 LLM 호출
4. `MAX_TOOL_ITERATIONS = 25`로 무한 루프 방지
5. `stopReason === 'max_tokens'`이면 assistant 텍스트를 히스토리에 추가 + "Continue" 요청으로 이어서 생성
6. `stopReason !== 'tool_use'`이면 루프 종료

- `streamChatRaw`는 `LLMGateway`의 선택적 메서드. 구현되지 않은 어댑터는 tool use 미지원 (일반 `streamChat` 폴백)
- `LLMMessage.content`는 `string | LLMContentBlock[]` — tool use 시 배열 형태
- **ChatService 생성자 6번째 인자**: `mcpClient?: McpClientGateway` (optional, container.ts에서 주입)
- **ChatService 생성자 7번째 인자**: `memoryService?: MemoryService` (optional, container.ts에서 주입)

### Tool SSE 이벤트 라이프사이클

LLM이 tool_use content block을 생성할 때 3단계 SSE 이벤트가 순서대로 전송됨:

1. **`tool_start`** — `content_block_start` 시점에 즉시 yield. `toolUseId` + `toolName`만 포함 (input 없음). 프론트엔드에서 즉시 스피너 표시용.
2. **`tool_use`** — `content_block_stop` 시점에 yield. 누적된 JSON input이 파싱된 후 전송. `toolUseId` + `toolName` + `toolInput` 포함.
3. **`tool_result`** — 도구 실행 완료 후 전송. `toolUseId` + `toolName` + `content` + `isError` 포함.

- **`tool_start`가 필요한 이유**: `input_json_delta`로 토큰 단위 JSON 누적이 수 초 걸리는 도구(예: `sequentialthinking`)에서, `tool_use`만으로는 프론트엔드에 무응답 구간이 발생.
- **`chat.service.ts`에서의 처리**: `trackingOnChunk` 래퍼는 `tool_start`를 별도 처리하지 않음. DB 세그먼트 추적은 `tool_use` 기준. `tool_start`는 `onChunk(chunk)`로 SSE 라우트까지 투과.
- **OpenAI 어댑터**: tool use 미지원 상태이므로 `tool_start` 미발생.
- **수정 시 주의**: `sendChunkSSE`에서 `tool_start` → `tool_use` → `tool_result` 순서로 분기. 새 chunk 타입 추가 시 `ExtendedStreamChunk` union과 `sendChunkSSE` 양쪽에 추가 필요.

### 세그먼트 추적 (MessageSegment)

도구 사용이 있는 대화에서 텍스트와 도구 블록의 인터리브 순서를 DB에 보존하기 위한 구조.

- **`MessageSegment`** 타입: `{ type: 'text'; content: string }` 또는 `{ type: 'tool'; toolUseId, toolName, toolInput, result?, isError? }`
- **타입 정의 위치**: `packages/shared/src/entities/message.ts` (프론트엔드용) + `packages/backend/src/domain/entities/message.ts` (백엔드용). 동일 구조를 양쪽에 유지.
- **저장**: `messages.segments` 컬럼 (JSON TEXT, nullable). 도구 사용이 없으면 `NULL`.
- **추적 방식**: `ChatService.execute()`/`regenerate()`에서 `onChunk` 콜백을 `trackingOnChunk`로 래핑. text 청크는 직전 text 세그먼트에 누적, tool_use/tool_result는 별도 세그먼트로 추가. 래핑은 agentic path (도구가 있을 때)에서만 적용.
- **프론트엔드 렌더링**: `MessageList.tsx`에서 `msg.segments`가 있으면 `MessageBubble`과 `ToolCallBlock`을 인터리브로 렌더링. 없으면 기존 단일 텍스트 버블.
- **수정 시 주의**: `content` 필드는 여전히 전체 텍스트를 누적 저장 (하위 호환). `segments`는 추가 정보로만 사용. `segments`가 `NULL`인 기존 메시지도 정상 렌더링됨.

### 세션 스코프 도구 허용 (Session Tool Permissions)

`chat.routes.ts`의 `sessionToolPermissions` Map (`Map<string, Set<string>>`) — 세션별로 "항상 허용"된 도구 이름 집합을 메모리에 보관.

- **동작**: 사용자가 도구 확인 시 `alwaysAllow: true`로 승인하면, 해당 세션+도구 이름이 Map에 등록. 이후 같은 세션에서 같은 도구는 확인 없이 자동 승인.
- **수명**: 서버 재시작 시 초기화 (DB 미저장). 의도적으로 영구 저장하지 않음.
- **수정 시 주의**: `sessionToolPermissions`는 `export`로 노출됨 (테스트에서 접근 필요). 확인 핸들러 내부에서 Map 체크가 `pendingConfirmations` 등록보다 먼저 수행되어야 함.

## SSE 비동기 작업 패턴

SSE 라우트(`chat.routes.ts`)에서 스트리밍 콜백 내부의 비동기 작업(예: `generateTitle`)은 **반드시 Promise를 캡처하여 `res.end()` 전에 await**해야 함. fire-and-forget으로 실행하면 `sendMessage.execute()` 완료 → `res.end()` 호출 후 닫힌 응답에 SSE 이벤트를 쓰게 되어 무시됨.

```typescript
// ❌ fire-and-forget — 응답 닫힌 후 title 이벤트 유실
let triggered = false
onChunk(chunk) {
  if (!triggered) { triggered = true; generateTitle(id).then(...) }
}
await sendMessage.execute(...)
res.end()  // generateTitle 아직 실행 중 → title 이벤트 유실

// ✅ Promise 캡처 + await — null 체크로 중복 호출 방지 겸용
let titlePromise: Promise<void> | null = null
onChunk(chunk) {
  if (!titlePromise) { titlePromise = generateTitle(id).then(...).catch(() => {}) }
}
await sendMessage.execute(...)
if (titlePromise) await titlePromise  // 제목 생성 완료 대기
res.end()
```

## LLM SDK Abort 패턴

스트리밍 중단 시 AbortSignal을 SDK에 전달하는 방식. 각 SDK마다 signal 전달 위치가 다름.

**Anthropic** (`packages/backend/src/adapters/outbound/llm/anthropic.adapter.ts`):

```ts
const stream = this.client.messages.stream(
  { model, max_tokens, messages },  // body
  { signal }                         // SDK options (두 번째 인자)
)
```

- ⚠️ `stream.abort()` 수동 호출은 async iterator가 정상 종료되지 않아 hang 발생. 반드시 AbortSignal을 통해 중단할 것.

**OpenAI** (`packages/backend/src/adapters/outbound/llm/openai.adapter.ts`):

```ts
const stream = await this.client.chat.completions.create(
  { model, messages, stream: true },  // body
  { signal }                           // request options (두 번째 인자)
)
```

**HTTP 라우트** (`packages/backend/src/adapters/inbound/http/chat.routes.ts`):

- `POST /api/chat/:sessionId/stop` → per-session `AbortController.abort()`
- abort 시에도 반드시 SSE `end` 이벤트 전송 (catch 블록에서 부분 content 저장)
- UI가 스트리밍 상태에서 빠져나올 수 있도록 보장
- **maxListeners**: `AbortController` 생성 직후 `setMaxListeners(30, abortController.signal)` 호출 필수. agentic loop에서 동일 signal을 매 `streamChatRaw()` 호출마다 SDK에 전달하므로, 11회 이상 반복 시 Node.js 기본 `maxListeners=10` 초과 경고 발생. 3개 SSE 라우트(send, regenerate, edit) 모두 동일 적용.

## 시스템 프롬프트 구성 (ChatService.buildSystemPrompt)

`packages/backend/src/domain/services/chat.service.ts`의 `buildSystemPrompt(projectId, userQuery?, excludeSessionId?, hasTools?)`가 LLM에 전달할 system prompt를 조합:

1. `projectId`가 있으면 → `projectRepo.findById` → `project.instructions` (비어있지 않으면 추가)
2. `settingsRepo.get('custom_instructions')` → 글로벌 커스텀 지침 (비어있지 않으면 추가)
3. `memoryService.buildMemoryContext(userQuery, excludeSessionId)` → 메모리 + 과거 대화 검색 결과 (활성화 시)
4. `memoryService.buildProjectMemoryContext(projectId)` → 프로젝트 메모리 (`<project_memory>` 태그, 비어있으면 생략)
5. `hasTools`가 true이면 → `<tool_usage_guidelines>` 블록 추가 (파일시스템 도구의 명시적 요청 시에만 사용하도록 제한)
6. 모든 파트를 `"\n\n"`으로 결합 (프로젝트 지침 → 프로젝트 메모리 → 글로벌 지침 → 메모리 컨텍스트 → 도구 가이드라인 순서)

- **적용 범위**: `execute()`, `regenerate()` — 사용자 채팅에만 적용
- **미적용**: `generateTitle()` — 자체 하드코딩된 프롬프트 사용, `buildSystemPrompt` 호출하지 않음
- **도구 가이드라인**: `allTools.length > 0`일 때 `hasTools=true`로 전달. LLM이 도구 존재만으로 파일을 생성하지 않도록 명시적 요청 시에만 사용하라는 지침 포함
- **수정 시 주의**: `buildSystemPrompt`는 도메인 서비스 내부 private 메서드. `ProjectRepository`를 생성자에서 주입받음 (`container.ts`에서 5번째 인자)

## MemoryService

`packages/backend/src/domain/services/memory.service.ts` — 대화 기록에서 장기 메모리 추출 + 과거 대화 키워드 검색 기능 제공.

### 메모리 추출 (extractMemory)

- `ChatService.execute()`/`regenerate()` 완료 후 fire-and-forget으로 호출 (`.catch(() => {})`)
- `memory_enabled` 설정이 `"true"`일 때만 동작
- 세션 메시지가 4개 미만이면 스킵 (최소 대화 요건)
- 최근 10개 메시지를 LLM에 전달 → 4-section 마크다운 형태로 메모리 생성/갱신
- 4 sections: `## Work context`, `## Personal context`, `## Top of mind`, `## Brief history`
- 결과를 `memory_content` + `memory_updated_at` settings 키에 저장

### 메모리 컨텍스트 빌드 (buildMemoryContext)

- `buildSystemPrompt`에서 호출 → system prompt에 추가
- 메모리가 있으면 `<memory>` 태그로 감싸서 포함
- `chat_search_enabled`가 `"true"`이면 사용자 쿼리에서 키워드 추출 → `MessageRepository.searchByKeywords()`로 과거 대화 검색 → `<relevant_past_conversations>` 태그로 포함
- 키워드 추출: 불용어(한/영) 필터, 2글자 미만 제거, 최대 5개

### MessageRepository.searchByKeywords

- `searchByKeywords(keywords, excludeSessionId, limit)` — 현재 세션을 제외하고 키워드와 매칭되는 메시지를 LIKE 검색
- SQL: `content LIKE ?` OR 조합, `session_id != ?`, `ORDER BY created_at DESC LIMIT ?`

### 메모리 삭제 (deleteMemory)

- `memory_content`, `memory_short_term`, `memory_long_term`, `memory_updated_at` 4개 키 모두 삭제
- 이전 포맷 키도 함께 삭제하여 마이그레이션 재실행 방지

### 메모리 편집 (editMemory)

- 사용자의 자연어 지시사항 + 현재 메모리를 LLM에 전달 → 수정된 4-section 문서 반환
- `EDIT_PROMPT` 사용 (추출과 별도 프롬프트)
- 파싱 실패 시 에러 throw (추출과 달리 사용자 요청이므로 에러 반환)

### 이전 포맷 자동 마이그레이션

`getMemory()`에서 `memory_content`가 null일 때 이전 `memory_short_term`/`memory_long_term` 키를 읽어 4-section 포맷으로 변환 후 `memory_content`에 저장. 마이그레이션 매핑:
- `memory_long_term` → `## Work context` 본문
- `memory_short_term` → `## Top of mind` 본문
- `## Personal context`, `## Brief history`는 빈 섹션으로 생성

### 수정 시 주의

- `MemoryService`는 도메인 서비스이나 `LLMGatewayResolver`에 의존 (LLM 호출 필요). `domain/` 내 다른 서비스와 달리 외부 게이트웨이를 직접 사용
- **생성자**: `(messageRepo, settingsRepo, llmResolver, projectRepo?)` — 4번째 인자 `ProjectRepository`는 optional (프로젝트 메모리 기능에 필요)
- `extractMemory`는 비동기 fire-and-forget. 실패해도 채팅 응답에 영향 없음
- `editMemory`는 동기적 — 실패 시 에러를 라우트로 전파 (사용자 대면 기능)
- `parseExtractionResult`: LLM 응답에서 `## ` 헤더 이전 텍스트를 제거하고 최대 8000자로 자름. 파싱 실패 시 null 반환 → 기존 메모리 유지
- `memory_short_term`/`memory_long_term` 키는 더 이상 쓰기에 사용하지 않음. 마이그레이션 읽기 + 삭제 시에만 참조

### 프로젝트 메모리

프로젝트별 메모리. `Project` 엔티티의 `memoryContent`/`memoryUpdatedAt` 필드에 저장 (글로벌 메모리와 달리 settings 키가 아닌 projects 테이블).

- **추출 (`extractProjectMemory`)**: `ChatService.execute()`/`regenerate()` 완료 후 `session.projectId`가 있으면 fire-and-forget 호출
  - 4 sections: `## Project goals`, `## Key decisions`, `## Current status`, `## History`
  - 글로벌 메모리를 참조하여 중복 방지 (프롬프트에 `{global_content}` 포함)
- **편집 (`editProjectMemory`)**: `POST /api/projects/:id/memory/edit` 라우트에서 호출. 결과를 `{ content, updatedAt }` 형태로 반환
- **빌드 (`buildProjectMemoryContext`)**: `ChatService.buildSystemPrompt`에서 호출 → `<project_memory>` 태그로 감싸서 system prompt에 포함
- **라우트**: `project.routes.ts`에서 `memoryService`를 직접 주입받음 (`createProjectRoutes(projectService, memoryService)`)
- **수정 시 주의**: 글로벌 메모리(`settings` 키)와 프로젝트 메모리(`projects` 테이블) 저장 위치가 다름. `getProjectMemory`/`deleteProjectMemory`는 `ProjectRepository`를 통해 직접 읽기/쓰기
