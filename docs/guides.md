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

### tsconfig.build.json 제약

`tsconfig.build.json`은 프로덕션 빌드 전용이며 기본 `tsconfig.json`과 설정이 다름:

| 설정 | tsconfig.json (dev) | tsconfig.build.json (prod) |
|------|---------------------|---------------------------|
| module | ESNext | CommonJS |
| moduleResolution | bundler | node |
| target | (기본값) | ES2020 |

- **`target: ES2020`**: `matchAll` 등 최신 iterator를 사용하는 코드가 `[...str.matchAll(...)]` 형태로 존재. ES2020 미만에서는 `--downlevelIteration` 없이 컴파일 실패
- **`moduleResolution: node`에서의 dynamic import**: `pdf-parse` 같은 CJS 전용 패키지의 default export가 callable로 인식되지 않음. `(mod.default ?? mod) as unknown as FnType` 패턴으로 타입 단언 필요
- **수정 시 주의**: `npm run dev`(tsx)에서는 정상 동작하지만 `npm run build:backend`(tsc)에서만 실패하는 타입 에러가 발생할 수 있음. 새 의존성 추가 후 반드시 `npm run build:backend`로 빌드 확인할 것

### build:package 실행

```bash
# macOS
npm run build:package:mac --workspaces=false

# Windows (Windows PC에서 실행 필수)
npm run build:package:win --workspaces=false
```

- `build:package` — 공통 빌드 단계 (백엔드 + 프론트엔드 + Electron + 네이티브 의존성 준비)
- `build:package:mac` — `build:package` + electron-builder `--mac` → DMG
- `build:package:win` — `build:package` + electron-builder `--win` → NSIS 인스톨러
- `--workspaces=false` 플래그 필수. 없으면 npm이 모든 워크스페이스에서 스크립트를 찾아 실패함
- **네이티브 모듈 제약**: `better-sqlite3`는 `@electron/rebuild`로 현재 OS용 바이너리만 빌드 가능. macOS에서 Windows용 크로스 컴파일 불가 — 반드시 타겟 OS에서 빌드할 것
- 네이티브 의존성 준비 스크립트: `scripts/prepare-backend-deps.mjs` (Node.js, 크로스 플랫폼)

## Electron 크로스 플랫폼 수정 시 주의사항

### macOS 전용 API 가드

macOS 전용 API/옵션은 반드시 `process.platform === 'darwin'` 가드 필요:
- `systemPreferences.isTrustedAccessibilityClient()` — macOS 전용, Windows에서 에러
- `titleBarStyle: 'hiddenInset'` — macOS 전용 (Windows에서 무시되나 의도대로 동작하지 않음)
- `vibrancy`, `visualEffectState` — macOS 전용 (Windows에서 무시됨)
- `NativeImage.setTemplateImage()` — macOS 전용 (Windows에서 무시됨)

BrowserWindow 옵션 분기는 조건부 스프레드 패턴 사용:
```ts
...(process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset' as const } : {})
```

### file:// URL 생성

Windows 경로에는 백슬래시(`\`)가 포함되어 `file://C:\path` 형태의 잘못된 URL이 생성됨. 항상 `url.pathToFileURL()` 사용:
```ts
import { pathToFileURL } from 'url'
// ✅ pathToFileURL(filePath).href → file:///C:/path (슬래시 자동 변환)
// ❌ `file://${filePath}` → Windows에서 깨짐
```

### 글로벌 단축키 플랫폼 매핑

- `Alt+Space`는 Windows 시스템 메뉴(창 이동/크기 변경)와 충돌 → Windows에서는 `Ctrl+Space`로 대체 등록
- 프론트엔드 설정 UI 라벨도 플랫폼별 분기 필요 ("Option" vs "Alt" 등)
- 프론트엔드 플랫폼 감지: `navigator.platform.startsWith('Mac')`

## E2E 테스트 작성 (vibium)

테스트 프레임워크: vibium (경량 브라우저 자동화) + vitest

### vibium `evaluate` 제약

`vibe.evaluate(script)`는 내부적으로 `() => { ${script} }`로 래핑되므로, 값을 반환하려면 **명시적 `return`** 필요:

```typescript
// ❌ undefined 반환 — 암시적 반환 안 됨
await vibe.evaluate('document.title')

// ✅ 명시적 return 필요
await vibe.evaluate<string>('return document.title')
```

텍스트 기반 요소 탐색이 필요한 경우 (vibium `find`는 CSS 셀렉터만 지원):

```typescript
// evaluate 내에서 querySelectorAll + textContent 로 탐색
await vibe.evaluate(
  'const btn = [...document.querySelectorAll("button")].find(b => b.textContent.includes("설정")); if (btn) btn.click();'
)
```

### React hover 시뮬레이션 (`onMouseEnter/Leave`)

E2E에서 `onMouseEnter`를 트리거하려면 `mouseenter`가 아닌 **`mouseover`**를 dispatch해야 함. React 18은 이벤트 위임(delegation) 방식으로 루트에서 `mouseover`/`mouseout`을 리스닝하여 `mouseenter`/`mouseleave`를 시뮬레이션하기 때문:

```typescript
// ❌ React가 감지하지 못함 (mouseenter는 bubble하지 않아 루트 리스너에 도달 불가)
el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))

// ✅ React 이벤트 위임이 감지
el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true }))
```

### Settings 컴포넌트 상태 갱신 (탭 전환 패턴)

`SettingsScreen`의 탭 콘텐츠(`ExtensionsContent` 등)는 조건부 렌더링(`activeTab === 'extensions' ? <ExtensionsContent />`)으로 마운트/언마운트됨. settings API로 값을 변경한 후 UI에 반영하려면 컴포넌트를 remount해야 함 (`useEffect`가 마운트 시에만 API 호출):

```typescript
// API로 값 변경
await vibe.evaluate(`fetch('/api/settings/builtin_tools_shell_enabled', { method: 'PUT', ... })`)

// 다른 탭으로 전환 → 원래 탭 복귀 (unmount → remount → useEffect 재실행)
await vibe.evaluate('click "일반" tab')           // ExtensionsContent unmount
await new Promise((r) => setTimeout(r, 300))
await vibe.evaluate('click "확장 프로그램" tab')    // ExtensionsContent remount (fresh state)
await new Promise((r) => setTimeout(r, 1000))      // API 호출 완료 대기
```

같은 탭을 다시 클릭하는 것만으로는 remount가 발생하지 않음에 주의.

### 테스트 파일 간 포트 충돌

vibium은 기본적으로 포트 9515를 사용. vitest가 테스트 파일을 병렬 실행하므로, 여러 파일에서 `browser.launch()`를 호출하면 포트 충돌 발생. 두 번째 테스트 파일부터 다른 포트 지정:

```typescript
vibe = await browser.launch({ headless: true, port: 9516 })
```

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
