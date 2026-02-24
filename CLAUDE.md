# D Chat Desktop

크로스 플랫폼 AI 채팅 애플리케이션. 모노레포 구조 (npm workspaces) + REST/SSE 아키텍처. 백엔드(Express)와 프론트엔드(React SPA)가 독립 실행 가능하며, Electron은 thin shell로 백엔드를 child process로 spawn.

## 프로젝트 구조

```
packages/
├── shared/     # 공유 TypeScript 타입 (entities, API DTO)
├── backend/    # Express 서버 (도메인, 어댑터, REST/SSE 라우트)
├── frontend/   # React SPA (Vite, Zustand, API 클라이언트)
└── electron/   # Thin Electron shell (백엔드 spawn + native IPC)
```

## 아키텍처

- 헥사고날 아키텍처 (Ports & Adapters)
- `packages/backend/src/domain/` — 외부 의존성 ZERO. express, better-sqlite3, SDK 등 import 금지
- `packages/backend/src/domain/ports/` — inbound(유스케이스), outbound(repository/gateway) 인터페이스
- `packages/backend/src/adapters/` — 포트 인터페이스의 구체 구현
  - `inbound/http/` — Express 라우트 핸들러 (REST + SSE)
  - `outbound/` — SQLite, Anthropic SDK, OpenAI SDK
- `packages/backend/src/container.ts` — 컴포지션 루트. 모든 DI 와이어링은 이 파일에서만
- `packages/frontend/src/` — React SPA (FSD 아키텍처: app → pages → widgets → features → entities → shared)
- `packages/frontend/src/shared/api/` — HTTP/SSE 클라이언트, `entities/*/api/` — 엔티티별 API
- `packages/frontend/src/shared/lib/native.ts` — Electron/웹 이중 지원 (pickImage, openInBrowser)
- `packages/electron/` — 백엔드 spawn + BrowserWindow + native IPC (pickImage, openInBrowser)

## 실행 방법

- **웹 모드**: `npm run dev` (백엔드 + 프론트엔드 동시 실행, http://localhost:5173)
- **백엔드만**: `npm run dev:backend` (http://localhost:3131)
- **프론트엔드만**: `npm run dev:frontend` (Vite proxy → localhost:3131)
- **Electron 모드**: `npm run dev:electron`

## 상세 문서

- 전체 구조/데이터 흐름/Electron(트레이, 단축키, IPC): [docs/overview.md](docs/overview.md)
- 변경 가이드 + 패키징 + E2E 테스트: [docs/guides.md](docs/guides.md)
- 백엔드 아키텍처/DB/MCP/메모리: [docs/backend/architecture.md](docs/backend/architecture.md)
- REST API 레퍼런스 (MCP, Memory 포함): [docs/backend/api-reference.md](docs/backend/api-reference.md)
- 프론트엔드 아키텍처/FSD: [docs/frontend/architecture.md](docs/frontend/architecture.md)
- UI 컨벤션: [docs/frontend/ui-conventions.md](docs/frontend/ui-conventions.md)
- 디자인 시스템 (색상, 버튼, 다크모드): [docs/frontend/design-system.md](docs/frontend/design-system.md)
- 프론트엔드 동작 패턴: [docs/frontend/patterns.md](docs/frontend/patterns.md)

## 코딩 가이드라인

### 구현 전 생각하기

- 가정을 명시적으로 서술할 것. 불확실하면 질문할 것
- 여러 해석이 가능하면 선택지를 제시할 것. 조용히 하나를 고르지 말 것
- 더 단순한 방법이 있으면 말할 것. 필요하면 반론을 제기할 것

### 단순함 우선

- 요청된 것 이상의 기능을 추가하지 말 것
- 한 번만 쓰이는 코드에 추상화를 만들지 말 것
- 요청되지 않은 "유연성"이나 "설정 가능성"을 넣지 말 것
- 불가능한 시나리오에 대한 에러 핸들링을 넣지 말 것
- 200줄로 쓴 코드가 50줄로 가능하면 다시 쓸 것

### 수술적 변경

- 요청과 직접 관련 없는 코드를 "개선"하지 말 것
- 망가지지 않은 것을 리팩터링하지 말 것
- 기존 스타일에 맞출 것 (다르게 하고 싶어도)
- 내 변경으로 인해 미사용된 import/변수/함수만 제거할 것
- 기존에 있던 dead code는 언급만 하고 삭제하지 말 것

### 목표 기반 실행

- 작업을 검증 가능한 목표로 변환할 것
- 멀티 스텝 작업은 간단한 계획을 먼저 서술할 것:
  1. [단계] → 검증: [확인 방법]
  2. [단계] → 검증: [확인 방법]
- 변경된 모든 라인은 사용자의 요청으로 직접 추적 가능해야 함

### 백엔드 테스트

- 백엔드(`packages/backend`) 코드 변경 시 반드시 테스트 코드를 작성할 것
- 테스트 파일 위치: `packages/backend/src/__tests__/` (기존 패턴 따름)
- 테스트 실행 명령: `npm run test -w packages/backend`
- 변경 완료 후 테스트가 모두 통과하는 것을 확인하고 마무리할 것

### 프론트엔드 E2E 테스트

- 프론트엔드(`packages/frontend`) UI 변경 시 E2E 테스트를 작성/수정할 것
- 테스트 파일 위치: `e2e/` (vibium 브라우저 자동화)
- 테스트 실행 명령: `npm run test:e2e` (dev 서버 자동 시작/종료)
- 변경 완료 후 E2E 테스트가 모두 통과하는 것을 확인하고 마무리할 것
