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

## SSE 스트리밍 이벤트

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
