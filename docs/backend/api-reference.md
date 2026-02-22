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

## SSE 스트리밍 이벤트

`POST /api/chat/:sessionId/messages` 및 `POST /api/chat/:sessionId/messages/:messageId/regenerate`는 SSE(Server-Sent Events)로 응답.

| 이벤트 | 데이터 | 설명 |
|--------|--------|------|
| `chunk` | `{ type: "text", content: string }` | 스트리밍 텍스트 청크 |
| `tool_use` | `{ type: "tool_use", toolUseId, toolName, toolInput }` | MCP 도구 호출 시작 |
| `tool_result` | `{ type: "tool_result", toolUseId, toolName, content, isError }` | MCP 도구 실행 결과 |
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
