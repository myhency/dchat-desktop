# 디자인 시스템

`packages/frontend/tailwind.config.cjs`에 정의된 시맨틱 컬러 토큰과 컴포넌트 스타일링 패턴.

## 시맨틱 컬러 팔레트

`primary-*` 토큰은 Tailwind `blue-*`를 래핑. 코드에서 `blue-*`를 직접 사용하지 말 것.

| 토큰 | 값 | 용도 |
|---|---|---|
| `primary` (DEFAULT) | `blue-600` | 버튼 배경, 토글 on, 메시지 버블, 링크 텍스트 |
| `primary-400` | `blue-400` | 다크모드 포커스 링 |
| `primary-500` | `blue-500` | 포커스 링, 체크마크, 선택 테두리, 진행바 |
| `primary-600` | `blue-600` | `primary`와 동일 (명시적 사용 시) |
| `primary-700` | `blue-700` | hover 상태 |

## 기능별 색상

시맨틱 토큰 없이 Tailwind 기본값을 직접 사용하는 경우:

| 색상 | 용도 | 예시 |
|---|---|---|
| `green-500` | 성공, 복사 완료, 스트리밍 인디케이터 | `text-green-500` |
| `red-500` | 삭제, 위험 동작 | `text-red-500` |
| `yellow-500` | 즐겨찾기 별 | `text-yellow-500` |
| `amber-400` | 장식 아이콘 (Sparkles) | `text-amber-400` |
| `pink-500/400` | 인라인 코드 구문 강조 | `prose-code:text-pink-500` |
| `neutral-*` | 배경, 텍스트, 테두리 시스템 전체 | 아래 다크모드 섹션 참조 |

## 다크모드 색상 쌍

자주 쓰이는 light/dark 쌍 패턴:

| 용도 | Light | Dark |
|---|---|---|
| 페이지 배경 | `bg-white` | `dark:bg-neutral-900` |
| 카드/입력 배경 | `bg-white` | `dark:bg-neutral-800` |
| 본문 텍스트 | `text-neutral-900` | `dark:text-neutral-100` |
| 보조 텍스트 | `text-neutral-500` | `dark:text-neutral-400` |
| 테두리 | `border-neutral-200` | `dark:border-neutral-700` |
| 입력 테두리 | `border-neutral-300` | `dark:border-neutral-600` |
| hover 배경 | `hover:bg-neutral-100` | `dark:hover:bg-neutral-700` |
| 포커스 링 | `focus:ring-primary-500` | `dark:focus:ring-primary-400` |

## 버튼 변형

### Primary (주요 동작: 전송, 저장, 생성)

```
bg-primary text-white hover:bg-primary-700 transition-colors
disabled:opacity-40 disabled:cursor-not-allowed
```

### Secondary/Outline (취소, 보조 동작)

```
border border-neutral-300 dark:border-neutral-600
text-neutral-700 dark:text-neutral-300
hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors
```

### Ghost (아이콘 버튼, 메뉴 아이템)

```
text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700
hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors
```

### Danger (삭제 등 — Ghost 변형)

```
text-red-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors
```

## 포커스/인터랙션 상태

- 입력 필드 포커스 링: `focus:ring-2 focus:ring-primary-500` 또는 `focus-within:ring-2 focus-within:ring-primary-500 dark:focus-within:ring-primary-400`
- 선택 테두리: `border-primary-500` (색상 모드 선택 등)
- 전환 효과: `transition-colors` (색상 변경), `transition-opacity` 사용 지양 (hover:opacity-80 대신 hover:bg-primary-700 사용)

## 금지 패턴

- `blue-*` 직접 사용 금지 → `primary-*` 토큰 사용
- `hover:opacity-80` 패턴 금지 → `hover:bg-primary-700` 같은 명시적 hover 색상 사용
- 다크모드 반전 패턴 (`bg-neutral-800 dark:bg-neutral-100 text-white dark:text-neutral-900`) 금지 → `bg-primary text-white`로 통일
