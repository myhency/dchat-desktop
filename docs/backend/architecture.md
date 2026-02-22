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

`packages/backend/src/domain/services/chat.service.ts`의 `buildSystemPrompt(projectId)`가 LLM에 전달할 system prompt를 조합:

1. `projectId`가 있으면 → `projectRepo.findById` → `project.instructions` (비어있지 않으면 추가)
2. `settingsRepo.get('custom_instructions')` → 글로벌 커스텀 지침 (비어있지 않으면 추가)
3. 둘 다 있으면 `"\n\n"`으로 결합 (프로젝트 지침 먼저, 글로벌 지침 뒤)

- **적용 범위**: `execute()`, `regenerate()` — 사용자 채팅에만 적용
- **미적용**: `generateTitle()` — 자체 하드코딩된 프롬프트 사용, `buildSystemPrompt` 호출하지 않음
- **수정 시 주의**: `buildSystemPrompt`는 도메인 서비스 내부 private 메서드. `ProjectRepository`를 생성자에서 주입받음 (`container.ts`에서 5번째 인자)
