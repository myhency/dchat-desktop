# D Chat Desktop

크로스 플랫폼 AI 채팅 데스크톱 애플리케이션. 여러 LLM 프로바이더(Anthropic Claude, OpenAI GPT)를 하나의 인터페이스에서 사용할 수 있습니다.

## 기술 스택

- **프레임워크**: Electron + electron-vite
- **프론트엔드**: React 18 + TypeScript + Tailwind CSS
- **상태관리**: Zustand
- **DB**: better-sqlite3 (WAL 모드)
- **LLM**: Anthropic SDK, OpenAI SDK

## 지원 모델

| Provider | 모델 |
|----------|------|
| Anthropic | Claude Opus 4.6, Claude Sonnet 4.6, Claude Haiku 4.5 |
| OpenAI | GPT-4o, GPT-4o Mini, o3-mini |

## 시작하기

### 사전 요구사항

- Node.js 18+
- npm

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 모드 실행
npm run dev
```

### 빌드

```bash
npm run build
```

## 프로젝트 구조

```
src/
├── main/           # Electron 메인 프로세스
│   ├── domain/     # 순수 도메인 (외부 의존성 없음)
│   ├── adapters/   # 포트 구현체 (SQLite, LLM SDK, Node fs)
│   └── container.ts # 컴포지션 루트 (DI 와이어링)
├── preload/        # contextBridge (window.hchat API)
└── renderer/       # React 프론트엔드
    ├── components/ # UI 컴포넌트
    ├── stores/     # Zustand 스토어
    └── hooks/      # 커스텀 훅
```

헥사고날 아키텍처(Ports & Adapters)를 적용하여 도메인 로직이 프레임워크나 인프라에 의존하지 않습니다.

## 문서

- [아키텍처 상세](docs/ARCHITECTURE.md) — 기술 스택, 데이터 흐름, IPC 채널, DB 스키마, 변경 작업 가이드
- [프론트엔드 컨벤션](docs/CONVENTIONS.md) — IME 처리, 입력 패턴, 화면 전환, 키보드 단축키
