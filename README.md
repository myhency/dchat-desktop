# D Chat Desktop

크로스 플랫폼 AI 채팅 데스크톱 애플리케이션. Anthropic Claude 및 OpenAI GPT 모델을 지원하며, 웹 브라우저와 Electron 데스크톱 앱으로 실행 가능.

## 기술 스택

| 분류 | 기술 |
|------|------|
| 모노레포 | npm workspaces |
| 백엔드 | Express + TypeScript, better-sqlite3, REST/SSE |
| 프론트엔드 | React 18, Vite, Zustand, Tailwind CSS |
| 데스크톱 | Electron |
| LLM | Anthropic SDK, OpenAI SDK |

## 프로젝트 구조

```
packages/
├── shared/     # 공유 TypeScript 타입 (entities, API DTO)
├── backend/    # Express 서버 (헥사고날 아키텍처, REST/SSE)
├── frontend/   # React SPA (Vite, Zustand, API 클라이언트)
└── electron/   # Thin Electron shell (백엔드 spawn + native IPC)
```

## 시작하기

### Prerequisites

- Node.js 18+
- npm 7+ (workspaces 지원 필요)

### 설치

```bash
npm install
```

### 실행

**웹 모드** (백엔드 + 프론트엔드 동시 실행):

```bash
npm run dev
```

http://localhost:5173 에서 접속. 백엔드는 http://localhost:3131 에서 실행.

**Electron 모드**:

```bash
npm run dev:electron
```

**개별 실행**:

```bash
npm run dev:backend    # 백엔드만 (http://localhost:3131)
npm run dev:frontend   # 프론트엔드만 (Vite proxy → localhost:3131)
```

### 빌드

```bash
npm run build           # 백엔드 + 프론트엔드
npm run build:electron  # Electron 앱
```

### macOS 앱 패키징

```bash
npm run build:package --workspaces=false
```

이 명령은 아래 단계를 순서대로 실행합니다:

1. 백엔드 TypeScript → CJS 컴파일
2. 프론트엔드 Vite 프로덕션 빌드
3. Electron main/preload 빌드
4. 백엔드 독립 node_modules 생성 + better-sqlite3 네이티브 리빌드
5. electron-builder로 .app/.dmg 패키징

산출물은 `packages/electron/release/`에 생성됩니다:

```
packages/electron/release/
  D Chat-{version}-arm64.dmg   # 설치용 DMG
  mac-arm64/D Chat.app          # 앱 번들
```

DMG를 열어 D Chat을 Applications 폴더로 드래그하여 설치합니다.
코드 서명이 없으므로 처음 실행 시 **시스템 설정 > 개인정보 보호 및 보안**에서 "확인 없이 열기"를 허용해야 합니다.

## 문서

- [아키텍처 상세 레퍼런스](docs/ARCHITECTURE.md) — 데이터 흐름, REST API, DB 스키마, Zustand 스토어
- [프론트엔드 컨벤션](docs/CONVENTIONS.md) — IME 처리, 입력 패턴, 화면 전환, 키보드 단축키
