# REST API 레퍼런스

Base URL: `/api` (기본 포트 3131)

## Health

| 메서드 | 경로 | Body | 응답 | 설명 |
|--------|------|------|------|------|
| GET | `/api/health` | — | `{ status: 'ok' }` | 서버 상태 확인 |

## Chat

| 메서드 | 경로 | Body | 응답 | 설명 |
|--------|------|------|------|------|
| GET | `/api/chat/:sessionId/messages` | — | `Message[]` | 세션 메시지 조회 |
| POST | `/api/chat/:sessionId/messages` | `{ content, attachments? }` | SSE 스트림 | 메시지 전송 + 스트리밍 |
| POST | `/api/chat/:sessionId/messages/:messageId/regenerate` | — | SSE 스트림 | 메시지 재생성 |
| POST | `/api/chat/:sessionId/stop` | `{ content }` | `{ ok: true }` | 스트리밍 중단 + 부분 저장 |
| POST | `/api/chat/:sessionId/tool-confirm` | `{ toolUseId, approved }` | `{ ok: true }` | 도구 실행 승인/거부 |

## Session

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

## Project

| 메서드 | 경로 | Body | 응답 | 설명 |
|--------|------|------|------|------|
| POST | `/api/projects` | `{ name, description }` | `Project` | 프로젝트 생성 |
| GET | `/api/projects` | — | `Project[]` | 프로젝트 목록 |
| DELETE | `/api/projects/:id` | — | `{ ok: true }` | 프로젝트 삭제 |
| PUT | `/api/projects/:id` | `{ name, description }` | `Project` | 프로젝트 수정 |
| PUT | `/api/projects/:id/instructions` | `{ instructions }` | `Project` | 프로젝트 지침 수정 |
| PATCH | `/api/projects/:id/favorite` | — | `Project` | 프로젝트 즐겨찾기 토글 |
| GET | `/api/projects/:id/memory` | — | `ProjectMemoryResponse` | 프로젝트 메모리 조회 (`{ content, updatedAt }`) |
| DELETE | `/api/projects/:id/memory` | — | `{ ok: true }` | 프로젝트 메모리 삭제 |
| POST | `/api/projects/:id/memory/edit` | `EditProjectMemoryRequest` | `ProjectMemoryResponse` | LLM으로 프로젝트 메모리 수정 (`{ instruction, model }`) |

## Settings

| 메서드 | 경로 | Body | 응답 | 설명 |
|--------|------|------|------|------|
| GET | `/api/settings` | — | `Record<string, string>` | 전체 설정 조회 |
| GET | `/api/settings/:key` | — | `{ value: string \| null }` | 설정값 단건 조회 |
| PUT | `/api/settings/:key` | `{ value }` | `{ ok: true }` | 설정값 저장 (API 키 시 어댑터 갱신) |
| POST | `/api/settings/connection-test` | `{ provider }` | `{ ok: true }` | LLM 연결 테스트 |

## Models

| 메서드 | 경로 | Body | 응답 | 설명 |
|--------|------|------|------|------|
| GET | `/api/models` | — | `ModelInfo[]` | 사용 가능 모델 목록 |

## Backup

| 메서드 | 경로 | Body | 응답 | 설명 |
|--------|------|------|------|------|
| GET | `/api/backup/export` | — | `BackupData` | 전체 데이터 내보내기 (settings, projects, sessions, messages) |
| POST | `/api/backup/import` | `BackupData` | `{ ok: true }` | 데이터 가져오기 (기존 데이터 전체 삭제 후 복원) |

## MCP Server

| 메서드 | 경로 | Body | 응답 | 설명 |
|--------|------|------|------|------|
| GET | `/api/mcp/servers` | — | `McpServerConfig[]` | 서버 목록 (설정만) |
| GET | `/api/mcp/servers/status` | — | `McpServerStatusDTO[]` | 서버 상태 + 도구 목록 |
| POST | `/api/mcp/servers` | `CreateMcpServerRequest` | `McpServerConfig` (201) | 서버 추가 + 자동 시작 |
| PUT | `/api/mcp/servers/:id` | `UpdateMcpServerRequest` | `McpServerConfig` | 서버 수정 (command/args/env 변경 시 자동 재시작) |
| DELETE | `/api/mcp/servers/:id` | — | `{ ok: true }` | 서버 삭제 (실행 중이면 중지 후 삭제) |
| POST | `/api/mcp/servers/:id/start` | — | `{ ok: true }` | 서버 시작 |
| POST | `/api/mcp/servers/:id/stop` | — | `{ ok: true }` | 서버 중지 |
| POST | `/api/mcp/servers/:id/restart` | — | `{ ok: true }` | 서버 재시작 |
| GET | `/api/mcp/servers/:id/logs` | — | `string[]` | stderr 로그 (최대 500줄) |
| GET | `/api/mcp/config-path` | — | `{ path: string }` | 설정 파일 경로 |
| POST | `/api/mcp/reload` | — | `{ ok: true }` | 전체 종료 후 설정 파일에서 재로드 |

## Skill

| 메서드 | 경로 | Body | 응답 | 설명 |
|--------|------|------|------|------|
| POST | `/api/skills` | `CreateSkillRequest` | `Skill` | 스킬 생성 (`{ name, description, content }`) → SKILL.md 디렉토리 생성 |
| POST | `/api/skills/upload` | `{ type: 'archive', data }` 또는 `{ type: 'files', files }` | `Skill` | zip/skill 아카이브 또는 폴더 파일 업로드 (base64) |
| GET | `/api/skills` | — | `Skill[]` | 전체 스킬 목록 (updated_at DESC) |
| GET | `/api/skills/config` | — | `{ skillsPath }` | 스킬 디렉토리 경로 |
| GET | `/api/skills/:id` | — | `Skill` | 스킬 단건 조회 |
| GET | `/api/skills/:id/file?path=...` | — | `text/plain` | 스킬 내 파일 읽기 (경로 순회 방어) |
| PUT | `/api/skills/:id` | `UpdateSkillRequest` | `Skill` | 스킬 수정 (partial update) |
| PATCH | `/api/skills/:id/toggle` | — | `Skill` | 활성/비활성 토글 |
| DELETE | `/api/skills/:id` | — | `{ ok: true }` | 스킬 삭제 (디렉토리 rm -rf) |

## Memory

| 메서드 | 경로 | Body | 응답 | 설명 |
|--------|------|------|------|------|
| GET | `/api/memory` | — | `MemoryResponse` | 메모리 조회 (`{ content, updatedAt }`) |
| DELETE | `/api/memory` | — | `{ ok: true }` | 메모리 삭제 |
| POST | `/api/memory/edit` | `EditMemoryRequest` | `MemoryResponse` | LLM으로 메모리 수정 (`{ instruction, model }`) |

## Diagnostics

| 메서드 | 경로 | Body | 응답 | 설명 |
|--------|------|------|------|------|
| POST | `/api/diagnostics/export` | `{ frontendLogs?: LogEntry[] }` | `application/zip` (바이너리) | 진단 로그 zip 다운로드 |

- 의존: `ManageMcpServersUseCase` (MCP 서버 로그 수집)
- zip 구조: `dchat-diagnostics-YYYY-MM-DD/` 하위에 `backend.log`, `frontend.log`, `crash-reports/`, `mcp-logs/`
- `frontendLogs`: 프론트엔드 인메모리 링버퍼에서 수집한 console 로그 배열. 각 엔트리: `{ timestamp: ISO8601, level: 'log'|'warn'|'error', message: string }`. 비어있거나 누락 시 `frontend.log` 스킵
- 각 데이터 소스를 개별 try/catch로 감싸 부분 실패 시 해당 항목만 스킵 (항상 200 응답)
- `DCHAT_LOG_PATH` 미설정(dev 모드) 시 `backend.log` 자동 스킵
- **비-JSON 응답**: `res.send(buffer)` — 프론트엔드에서 `apiFetch` 사용 불가, raw `fetch` + `blob()` 필요 (아래 프론트엔드 패턴 참고)

## Error Reports

| 메서드 | 경로 | Body | 응답 | 설명 |
|--------|------|------|------|------|
| POST | `/api/error-reports` | `{ report: string }` | `{ ok: true, filePath: string }` | 에러 리포트를 `~/.dchat/crash-reports/`에 파일로 저장 |

- 파일명: `error-{ISO timestamp}.txt` (`:` → `-` 치환)
- 서비스/포트 없는 standalone 라우트 (순수 인프라 파일 쓰기)

## SSE 스트리밍 이벤트

`POST /api/chat/:sessionId/messages` 및 `POST /api/chat/:sessionId/messages/:messageId/regenerate`는 SSE(Server-Sent Events)로 응답.

| 이벤트 | 데이터 | 설명 |
|--------|--------|------|
| `chunk` | `{ type: "text", content: string }` | 스트리밍 텍스트 청크 |
| `tool_use` | `{ type: "tool_use", toolUseId, toolName, toolInput }` | MCP 도구 호출 시작 |
| `tool_result` | `{ type: "tool_result", toolUseId, toolName, content, isError }` | MCP 도구 실행 결과 |
| `tool_confirm` | `{ type: "tool_confirm", toolUseId, toolName, toolInput }` | 도구 실행 승인 요청 (위험한 도구) |
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
