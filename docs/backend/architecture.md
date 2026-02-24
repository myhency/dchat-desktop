# 백엔드 아키텍처

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

### MCP Tool Use 루프 (ChatService)

`ChatService.execute()`/`regenerate()`에서 MCP 도구가 있을 때 `streamChatRaw()`를 반복 호출하는 루프:

1. `mcpClient.getAllTools()`로 모든 running 서버의 도구 수집 → `options.tools`에 전달
2. LLM이 `tool_use`로 응답하면 → `mcpClient.callTool(serverId, toolName, input)` 실행
3. `tool_result`를 메시지 히스토리에 추가 → 다시 LLM 호출
4. `MAX_TOOL_ITERATIONS = 25`로 무한 루프 방지
5. `stopReason !== 'tool_use'`이면 루프 종료

- `streamChatRaw`는 `LLMGateway`의 선택적 메서드. 구현되지 않은 어댑터는 tool use 미지원 (일반 `streamChat` 폴백)
- `LLMMessage.content`는 `string | LLMContentBlock[]` — tool use 시 배열 형태
- **ChatService 생성자 6번째 인자**: `mcpClient?: McpClientGateway` (optional, container.ts에서 주입)
- **ChatService 생성자 7번째 인자**: `memoryService?: MemoryService` (optional, container.ts에서 주입)

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

## 시스템 프롬프트 구성 (ChatService.buildSystemPrompt)

`packages/backend/src/domain/services/chat.service.ts`의 `buildSystemPrompt(projectId, userQuery?, excludeSessionId?)`가 LLM에 전달할 system prompt를 조합:

1. `projectId`가 있으면 → `projectRepo.findById` → `project.instructions` (비어있지 않으면 추가)
2. `settingsRepo.get('custom_instructions')` → 글로벌 커스텀 지침 (비어있지 않으면 추가)
3. `memoryService.buildMemoryContext(userQuery, excludeSessionId)` → 메모리 + 과거 대화 검색 결과 (활성화 시)
4. `memoryService.buildProjectMemoryContext(projectId)` → 프로젝트 메모리 (`<project_memory>` 태그, 비어있으면 생략)
5. 모든 파트를 `"\n\n"`으로 결합 (프로젝트 지침 → 프로젝트 메모리 → 글로벌 지침 → 메모리 컨텍스트 순서)

- **적용 범위**: `execute()`, `regenerate()` — 사용자 채팅에만 적용
- **미적용**: `generateTitle()` — 자체 하드코딩된 프롬프트 사용, `buildSystemPrompt` 호출하지 않음
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
