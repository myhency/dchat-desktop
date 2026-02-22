# 변경 작업 가이드

## 새 LLM 모델 추가 (기존 Provider)

1. 해당 어댑터의 `listModels()` 배열에 `ModelInfo` 추가
   - Anthropic: `packages/backend/src/adapters/outbound/llm/anthropic.adapter.ts`
   - OpenAI: `packages/backend/src/adapters/outbound/llm/openai.adapter.ts`

## 새 LLM Provider 추가

1. `LLMGateway` 구현 어댑터 작성 → `packages/backend/src/adapters/outbound/llm/`
2. `LLMAdapterFactory`에 `set{Provider}Key()`, `getGateway()` 라우팅 분기 추가
3. `packages/backend/src/adapters/inbound/http/settings.routes.ts`에 API 키 변경 시 팩토리 갱신 코드 추가
4. `packages/backend/src/container.ts`의 `restoreApiKeys()`에 키 복원 코드 추가

## 새 REST 엔드포인트 추가

1. `packages/backend/src/adapters/inbound/http/`에 라우트 파일 작성 (또는 기존 파일에 추가)
2. `packages/backend/src/server.ts`에 라우트 등록
3. `packages/frontend/src/entities/*/api/` 또는 `shared/api/`에 API 클라이언트 함수 추가
4. 새 Request/Response DTO가 필요하면 `packages/shared/src/api-types.ts`에 추가

## 새 도메인 엔티티 / 포트 추가

1. 엔티티 타입 정의 → `packages/shared/src/entities/` (공유) + `packages/backend/src/domain/entities/` (내부용)
2. 포트 인터페이스 정의 → `packages/backend/src/domain/ports/outbound/` (리포지토리) 또는 `inbound/` (유스케이스)
3. 도메인 서비스 구현 → `packages/backend/src/domain/services/` (외부 의존성 import 금지)
4. 아웃바운드 어댑터 구현 → `packages/backend/src/adapters/outbound/`
5. `packages/backend/src/container.ts`에서 와이어링

## macOS 앱 패키징 주의사항

### 백엔드 tsc 출력 구조

`tsconfig.build.json`으로 CJS 빌드 시 출력이 `dist/index.js`가 아닌 `dist/backend/src/index.js`에 생성됨. `tsconfig.json`의 `paths`가 `@dchat/shared`를 `../shared/src/`로 매핑하기 때문에 tsc가 공통 루트를 상위로 잡아 중첩 구조를 만듦. `rootDir` 명시로는 해결 불가 (tsc가 paths 대상 파일도 rootDir 내에 있어야 한다고 요구).

- 진입점 경로를 변경하려면: `main.ts`의 spawn 경로 + `backend/package.json`의 `start` 스크립트 동시 수정 필요

### 프론트엔드 Vite base 설정

`packages/frontend/vite.config.ts`의 `base: './'`는 필수. Electron 패키지 앱은 `file://` 프로토콜로 HTML을 로드하므로, 절대 경로(`/assets/...`)는 파일시스템 루트를 참조하게 됨. 제거하면 패키지 앱에서 빈 화면 발생.

### build:package 실행

```bash
npm run build:package --workspaces=false
```

`--workspaces=false` 플래그 필수. 없으면 npm이 모든 워크스페이스에서 스크립트를 찾아 실패함.

## 프론트엔드 컴포넌트 추가 (FSD 규칙)

1. 적절한 FSD 레이어에 파일 배치:
   - `shared/` — 비즈니스 로직 없는 유틸, API 클라이언트
   - `entities/` — 비즈니스 엔티티별 API + Zustand 스토어
   - `features/` — 단일 사용자 인터랙션 (예: 검색, 컨텍스트 메뉴)
   - `widgets/` — 독립적인 UI 블록 (예: 사이드바, 메시지 리스트)
   - `pages/` — 페이지 단위 컴포지션
2. Import 방향: **상위 → 하위만 허용** (app → pages → widgets → features → entities → shared)
3. 같은 슬라이스 내부는 상대 경로 (`./Component`), 슬라이스 간은 `@/` alias + barrel (`@/entities/session`)
4. 각 슬라이스에 `index.ts` barrel 생성하여 외부 노출 API 제어
