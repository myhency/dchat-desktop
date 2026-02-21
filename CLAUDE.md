# D Chat Desktop

Claude Code Desktop과 유사한 크로스 플랫폼 데스크톱 채팅 애플리케이션. Electron + React + TypeScript 기반, 헥사고날 아키텍처 적용.

## 아키텍처

- 헥사고날 아키텍처 (Ports & Adapters)
- `src/main/domain/` — 외부 의존성 ZERO. electron, better-sqlite3, SDK 등 import 금지
- `src/main/domain/ports/` — inbound(유스케이스), outbound(repository/gateway) 인터페이스
- `src/main/adapters/` — 포트 인터페이스의 구체 구현 (SQLite, Anthropic SDK, OpenAI SDK, Node fs)
- `src/main/container.ts` — 컴포지션 루트. 모든 DI 와이어링은 이 파일에서만
- `src/renderer/` — React 프론트엔드 (그 자체가 Inbound Adapter)

상세 레퍼런스 (기술 스택, 프로젝트 구조, 데이터 흐름, IPC 채널, DB 스키마, Zustand 스토어, 변경 작업 가이드): [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
프론트엔드 컨벤션 (아이콘/Radius 컨벤션, IME 처리, 입력 패턴, 화면 전환, 키보드 단축키, 검색 모달, HomeScreen, AllChatsScreen, ProjectsScreen, ProjectDetailScreen, Sidebar, 즐겨찾기, CodeBlock, MessageBubble, 메시지 재생성, 낙관적 업데이트, Artifact 자동 열기, Cross-Store 접근 패턴, 시스템 프롬프트 구성): [docs/CONVENTIONS.md](docs/CONVENTIONS.md)

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
