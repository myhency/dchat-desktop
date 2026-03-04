# 에러 로깅 및 예외 처리 감사 보고서

**작성일**: 2026-03-04
**목적**: D Chat Desktop 전체 코드베이스의 에러 핸들링 및 로깅 현황 감사. 누락된 에러 처리, 무음 실패(silent failure), 불완전한 로깅 패턴을 식별하고 개선 방안을 제시한다.
**범위**: Backend (Express), Frontend (React SPA), Electron (Main Process)

---

## 요약 (Executive Summary)

| 심각도 | Backend | Frontend | Electron | 합계 |
|---------|---------|----------|----------|------|
| **Critical** | 1 | 1 | 5 | **7** |
| **Warning** | 4 | 8 | 7 | **19** |
| **Info** | 3 | 3 | 2 | **8** |
| **합계** | 8 | 12 | 14 | **34** |

Electron 계층이 가장 많은 문제(14건)를 보유하며, Critical 5건 중 대부분이 프로세스 크래시로 이어질 수 있는 치명적 결함이다. 전체 코드베이스에서 반복적으로 나타나는 주요 안티패턴은 다음과 같다:

1. **글로벌 예외 핸들러 부재** — Electron main process와 Frontend renderer 모두 uncaught exception/rejection 핸들러가 없음
2. **에러 무음 삼킴(silent swallowing)** — catch 블록에서 로깅 없이 에러를 무시하는 패턴이 전 계층에 걸쳐 존재
3. **파일 I/O 미보호** — 파일 읽기/쓰기 작업에 try-catch가 없거나 에러 발생 시 사용자에게 피드백이 없음
4. **DB 작업 미보호** — SQLite 리포지토리 전체에 try-catch가 없어 DB 오류가 서버 크래시로 전파될 수 있음

---

## 심각도별 상세 (Findings by Severity)

### Critical (7건)

#### C-1. Electron: 글로벌 Uncaught Exception 핸들러 부재

| 항목 | 내용 |
|------|------|
| **파일** | `packages/electron/src/main.ts` |
| **현재 동작** | `process.on('uncaughtException')` 및 `process.on('unhandledRejection')` 미등록 |
| **영향** | 처리되지 않은 예외 발생 시 main process가 무음 크래시. 사용자에게 아무런 피드백 없이 앱이 종료됨 |
| **권장 수정** | main process 진입점에 글로벌 핸들러 등록. 에러를 로그 파일에 기록하고, dialog로 사용자에게 알린 후 graceful restart 또는 종료 |

#### C-2. Electron: 백엔드 프로세스 크래시 시 재시작 로직 없음

| 항목 | 내용 |
|------|------|
| **파일** | `packages/electron/src/main.ts:93-101` |
| **현재 동작** | 백엔드 child process의 stderr 미캡처, 크래시 시 재시도 메커니즘 없음 |
| **영향** | 백엔드 프로세스가 죽으면 전체 앱을 사용자가 수동 재시작해야 함. 일시적 오류도 영구적 장애로 전환 |
| **권장 수정** | stderr 캡처 및 로깅, exit 이벤트에 재시작 로직(최대 N회) 추가, 재시작 실패 시 사용자 알림 |

#### C-3. Electron: pickImage 파일 읽기 에러 미처리

| 항목 | 내용 |
|------|------|
| **파일** | `packages/electron/src/main.ts:186` |
| **현재 동작** | `readFile()` 호출에 try-catch 없음 |
| **영향** | 파일 읽기 실패 시 silent failure, 빈 배열 반환. 사용자는 이미지 선택이 왜 안 되는지 알 수 없음 |
| **권장 수정** | try-catch 추가, 실패 시 사용자에게 에러 메시지 전달 |

#### C-4. Electron: openInBrowser 파일 쓰기 에러 미처리

| 항목 | 내용 |
|------|------|
| **파일** | `packages/electron/src/main.ts:216` |
| **현재 동작** | `writeFile()` 및 `openExternal()` 호출에 에러 핸들링 없음 |
| **영향** | 임시 파일 쓰기 실패 또는 외부 브라우저 열기 실패 시 무음 실패 |
| **권장 수정** | try-catch로 감싸고 에러 로깅 및 사용자 피드백 추가 |

#### C-5. Electron: BrowserWindow loadURL/loadFile did-fail-load 핸들러 부재

| 항목 | 내용 |
|------|------|
| **파일** | `packages/electron/src/main.ts:141, 143` |
| **현재 동작** | `did-fail-load` 이벤트 핸들러 미등록 |
| **영향** | 파일 누락 또는 잘못된 환경변수로 인해 빈 화면(blank renderer)이 표시되고 사용자에게 에러 정보 없음 |
| **권장 수정** | `did-fail-load` 이벤트 리스너 등록, 에러 페이지 표시 또는 재로드 시도 |

#### C-6. Frontend: 글로벌 에러 핸들러 부재

| 항목 | 내용 |
|------|------|
| **파일** | `packages/frontend/src/app/main.tsx` (lines 1-16) |
| **현재 동작** | `window.onerror`, `unhandledrejection` 리스너 미등록 |
| **영향** | 이벤트 핸들러, 비동기 콜백, 타이머 에러가 모두 처리되지 않음. ErrorBoundary가 잡지 못하는 에러가 콘솔에만 출력 |
| **권장 수정** | 글로벌 에러 핸들러 등록하여 에러 로깅 및 에러 리포트 전송 |

#### C-7. Backend: SQLite 리포지토리 전체 DB 작업 미보호

| 항목 | 내용 |
|------|------|
| **파일** | `packages/backend/src/adapters/outbound/persistence/sqlite/*.repository.impl.ts` — session(19-51), message(19-67), settings(12-42), project(20-50), mcp-server(23-71) |
| **현재 동작** | DB 작업에 try-catch 없음 |
| **영향** | SQLite 오류(DB 잠금, 디스크 풀, 스키마 불일치 등)가 Express 라우트까지 전파되어 서버 크래시 가능. 글로벌 에러 핸들러가 최후 방어선이지만, 구체적 에러 컨텍스트 손실 |
| **권장 수정** | 각 리포지토리 메서드에 try-catch 추가, 구체적 에러 메시지와 컨텍스트 로깅, 적절한 에러 타입으로 변환하여 상위 계층에 전달 |

---

### Warning (19건)

#### Electron (7건)

| # | 제목 | 파일 | 현재 동작 | 권장 수정 |
|---|------|------|-----------|-----------|
| W-1 | waitForBackend 에러 삼킴 | `main.ts:40-51` | catch 블록이 모든 에러를 삼킴 | 에러 타입 구분(네트워크 vs 기타), 재시도 횟수 제한 후 사용자 알림 |
| W-2 | Settings Fetch 무음 폴백 | `main.ts:339-343` | 실패 시 기본값 사용, 알림 없음 | 경고 로그 추가 |
| W-3 | globalShortcut.register() 반환값 무시 | `shortcut.ts:63, 68` | 등록 실패 시 무음 | 반환값 확인 후 실패 시 로깅 |
| W-4 | uIOhook.start() 미보호 | `shortcut.ts:59` | 권한/네이티브 이슈 시 uncaught | try-catch 추가 |
| W-5 | Quick Chat 에러 미로깅 | `main.ts:271-276` | 일반 HTTP 상태만 반환 | 구체적 에러 로깅 추가 |
| W-6 | Backend Process spawn 에러 미처리 | `main.ts:73-82` | error 이벤트 핸들러 없음 | `backendProcess.on('error', ...)` 추가 |
| W-7 | app.quit() 클린 종료 보장 안 됨 | `main.ts:313` | 프로세스 행(hang) 가능 | 백엔드 프로세스 강제 종료 후 quit |

#### Frontend (8건)

| # | 제목 | 파일 | 현재 동작 | 권장 수정 |
|---|------|------|-----------|-----------|
| W-8 | ErrorBoundary 커버리지 제한 | `shared/ui/ErrorBoundary.tsx` | App 루트만 감싸, 하위 라우트 미보호 | 주요 라우트/위젯 레벨에 추가 ErrorBoundary 배치 |
| W-9 | Project Store 에러 핸들링 없음 | `entities/project/model/project.store.ts:24-66` | 모든 메서드에 try-catch 없음, toggleFavorite 낙관적 업데이트 롤백 없음 | try-catch 추가, 실패 시 상태 롤백 |
| W-10 | Session Store 비일관적 에러 처리 | `entities/session/model/session.store.ts:111-147` | load/select/delete에 에러 핸들링 없음 | 일관된 에러 처리 패턴 적용 |
| W-11 | Settings Store 무음 영속화 | `entities/settings/model/settings.store.ts:122-163` | loadSettings/debouncedPersist 에러 미처리 | try-catch 및 사용자 피드백 추가 |
| W-12 | SSE JSON.parse 미보호 | `shared/api/client.ts:121` | 잘못된 SSE 이벤트 데이터가 앱 크래시 유발 | try-catch로 JSON.parse 감싸기 |
| W-13 | PromptMenu pickImage 미보호 | `widgets/prompt-input/ui/PromptMenu.tsx:46-49` | 파일 다이얼로그 에러 무음 | try-catch 추가 |
| W-14 | diagnosticApi 타임아웃 없음 | `entities/settings/api/diagnostic.api.ts:5-15` | 원시 fetch 사용, 타임아웃 미설정 | AbortController 기반 타임아웃 추가 |
| W-15 | pickImage 웹 폴백 에러 미처리 | `shared/lib/native.ts:60-62` | arrayBuffer()/btoa() 실패 가능 | try-catch 추가 |

#### Backend (4건)

| # | 제목 | 파일 | 현재 동작 | 권장 수정 |
|---|------|------|-----------|-----------|
| W-16 | Memory Service 무음 catch | `domain/services/memory.service.ts:282-284, 435-437` | 추출 실패를 무음으로 삼킴 | 최소한 경고 로깅 추가 |
| W-17 | MCP Server Service 시작 실패 무음 | `domain/services/mcp-server.service.ts:39-41, 66-75, 103-108, 128-132` | 서버 시작 에러를 catch하되 로깅 없음 | 에러 로깅 추가 |
| W-18 | Chat Routes 제목 생성 에러 무음 | `adapters/inbound/http/chat.routes.ts:176` | `.catch()`로 에러 삼킴 | 로깅 추가 |
| W-19 | Diagnostic Routes 파일 I/O 무음 | `adapters/inbound/http/diagnostic.routes.ts:45-46, 61-62, 74-75, 94-95, 117-118, 125-126, 141-142` | 다수의 try-catch에서 로깅 없음 | catch 블록에 로깅 추가 |

---

### Info (8건)

| # | 계층 | 제목 | 파일 |
|---|------|------|------|
| I-1 | Electron | Tray 생성 에러 미처리 | `tray.ts:178` |
| I-2 | Electron | createWindow() 미보호 | `main.ts:347` |
| I-3 | Frontend | PromptInput sendMessage 미보호 | `widgets/prompt-input/ui/PromptInput.tsx:26-32` |
| I-4 | Frontend | openInBrowser revokeObjectURL 실패 가능 | `shared/lib/native.ts:93-104` |
| I-5 | Frontend | Electron delegate 호출 에러 미처리 | `shared/lib/native.ts` |
| I-6 | Backend | MCP Client close 에러 무시 | `adapters/outbound/mcp/stdio-mcp-client.manager.ts:80-82` |
| I-7 | Backend | Skill 파일 작업 광범위 catch | `adapters/outbound/persistence/filesystem/skill.repository.impl.ts:276-278, 333-339, 364-370, 372-378` |
| I-8 | Backend | Error Report 라우트 파일 쓰기 미보호 | `adapters/inbound/http/error-report.routes.ts:21-28` |

---

## 계층별 요약 (Findings by Layer)

### Backend (8건)

전반적으로 가장 양호한 상태. 글로벌 Express 에러 핸들러(`server.ts:67-72`)가 최후 방어선 역할을 하며, 내장 도구 제공자와 MCP 클라이언트 매니저는 적절한 로깅을 갖추고 있다. 주요 취약점은 **SQLite 리포지토리 전체의 try-catch 부재**(C-7)로, DB 오류 시 구체적 컨텍스트가 손실되고 에러가 글로벌 핸들러까지 전파된다. 도메인 서비스(Memory, MCP Server)에서는 에러를 catch하되 로깅하지 않는 패턴이 반복된다.

### Frontend (12건)

ErrorBoundary가 존재하지만 App 루트에만 적용되어 있어 커버리지가 제한적이다. 글로벌 에러 핸들러(window.onerror, unhandledrejection)가 없어 React 컴포넌트 외부 에러가 처리되지 않는다. 스토어(Zustand) 계층에서 API 호출 에러 처리가 전반적으로 부실하며, SSE 파싱의 JSON.parse 미보호는 스트리밍 중 앱 크래시로 이어질 수 있다.

### Electron (14건)

가장 많은 문제를 보유한 계층. 글로벌 uncaught exception 핸들러 부재, 백엔드 프로세스 관리 취약, 파일 I/O 미보호가 핵심 문제다. Electron main process의 크래시는 전체 앱 종료를 의미하므로, 이 계층의 에러 처리 강화가 가장 시급하다.

---

## 교차 패턴 (Cross-Cutting Patterns)

### 1. 글로벌 예외 핸들러 부재
Electron main process(C-1)와 Frontend renderer(C-6) 모두 최상위 uncaught exception/rejection 핸들러가 없다. 처리되지 않은 에러가 앱 크래시로 직결된다.

### 2. 빈 catch 블록 (Silent Swallowing)
전 계층에서 가장 빈번한 안티패턴. catch 블록이 에러를 잡되 로깅하지 않아 디버깅이 불가능하다.
- Backend: Memory Service, MCP Server Service, Diagnostic Routes
- Frontend: Store 계층 전반
- Electron: waitForBackend, Settings fetch

### 3. 파일 I/O 미보호
파일 읽기/쓰기 작업에 try-catch가 없는 패턴이 Electron(C-3, C-4)과 Backend(I-8)에서 발견된다.

### 4. 낙관적 업데이트 롤백 부재
Frontend 스토어에서 낙관적으로 상태를 업데이트한 후 API 실패 시 롤백하지 않는 패턴(W-9)이 있다.

### 5. 외부 프로세스/네이티브 API 에러 미처리
Electron에서 child process spawn, uIOhook, globalShortcut 등 네이티브 API 호출의 에러를 처리하지 않는 패턴이 반복된다.

---

## 잘 처리된 영역 (Well-Handled Areas)

- **Backend 내장 도구 제공자**: 적절한 에러 로깅 구현
- **Backend MCP 클라이언트 매니저**: 전반에 걸쳐 적절한 로그 존재
- **Backend 글로벌 Express 에러 핸들러**: `server.ts:67-72`에서 처리되지 않은 에러를 최종 catch
- **Backend Chat Routes**: 도구 실행 및 스트림 라이프사이클 주변 로깅 양호
- **Frontend ErrorBoundary**: 존재 자체는 긍정적 (커버리지 확대 필요)

---

## 권장 조치 계획 (Recommended Action Plan)

아래 순서는 **영향도와 시급성** 기준으로 정렬되었다.

### 1단계: 즉시 조치 (Critical)

| 우선순위 | 조치 | 대상 파일 | 관련 항목 |
|----------|------|-----------|-----------|
| P0 | Electron main process에 `process.on('uncaughtException')` / `process.on('unhandledRejection')` 등록 | `packages/electron/src/main.ts` | C-1 |
| P0 | Frontend에 `window.onerror` / `window.addEventListener('unhandledrejection')` 등록 | `packages/frontend/src/app/main.tsx` | C-6 |
| P0 | Backend child process에 stderr 캡처, exit 이벤트 재시작 로직 추가 | `packages/electron/src/main.ts` | C-2 |
| P1 | SQLite 리포지토리 전체에 try-catch 추가 및 에러 로깅 | `packages/backend/src/adapters/outbound/persistence/sqlite/` | C-7 |
| P1 | Electron 파일 I/O 작업에 try-catch 추가 (pickImage, openInBrowser) | `packages/electron/src/main.ts` | C-3, C-4 |
| P1 | BrowserWindow `did-fail-load` 핸들러 등록 | `packages/electron/src/main.ts` | C-5 |

### 2단계: 단기 개선 (Warning)

| 우선순위 | 조치 | 관련 항목 |
|----------|------|-----------|
| P2 | SSE `JSON.parse`를 try-catch로 감싸기 | W-12 |
| P2 | Frontend 스토어 전반에 에러 처리 추가 (project, session, settings) | W-9, W-10, W-11 |
| P2 | Electron 네이티브 API 호출 에러 처리 (globalShortcut, uIOhook, spawn) | W-3, W-4, W-6 |
| P2 | Backend 서비스의 빈 catch 블록에 로깅 추가 | W-16, W-17, W-18, W-19 |
| P3 | ErrorBoundary를 주요 라우트/위젯 레벨에 추가 배치 | W-8 |
| P3 | diagnosticApi에 AbortController 타임아웃 추가 | W-14 |
| P3 | Electron waitForBackend 에러 구분 및 설정 폴백 로깅 | W-1, W-2 |
| P3 | app.quit() 시 백엔드 프로세스 정리 보장 | W-7 |

### 3단계: 장기 개선 (Info + 구조적)

| 조치 | 관련 항목 |
|------|-----------|
| 통합 에러 로깅 인프라 구축 (Electron ↔ Backend ↔ Frontend 에러 수집) | 전체 |
| Frontend Electron delegate 호출에 일관된 에러 처리 패턴 적용 | I-5 |
| Info 레벨 항목들 개별 수정 | I-1 ~ I-8 |
