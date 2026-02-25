# UI 컨벤션

## 아이콘 컨벤션

모든 아이콘은 `lucide-react` 컴포넌트를 사용. 이모지, 유니코드 문자, 인라인 SVG 사용 금지.

```tsx
import { Search, X, Check } from 'lucide-react'

<Search size={16} className="text-neutral-400" />
```

### 사이즈 규칙

| 용도 | size |
|------|------|
| 메시지 액션 (복사, 재생성, 편집) | `14` |
| 메뉴 아이템, 사이드바 내비, 검색바, 툴바 | `16` |
| 드롭다운 내부 chevron 인디케이터 | `12` |
| 홈 인사 sparkle | `32` |
| 설정 색상모드 아이콘 | `20` |

- 색상: lucide의 `className` prop으로 Tailwind 색상 적용 (예: `className="text-neutral-400"`)
- fill 오버라이드: `<Star size={16} fill={active ? 'currentColor' : 'none'} />`, `<Square size={16} fill="currentColor" stroke="none" />`

## 버튼 Border Radius

모든 버튼은 `rounded-lg` 사용. 예외:

- **토글 스위치**: 트랙 `rounded-full`, knob `rounded-full` (구조적 원형)
- **아바타**: `rounded-full` (프로필 이미지/이니셜)
- **장식 요소**: pulsing dot, progress bar 등 비인터랙티브 요소는 `rounded-full` 허용

## 입력 컴포넌트 패턴

- `autoFocus` 속성으로 초기 포커스 설정
- `useEffect`로 `currentSessionId` 변경 시 입력 필드에 focus 재설정
- 하단 바 레이아웃: 왼쪽 빈 `div` + 오른쪽 `flex items-center gap-2` (모델 셀렉터 + 전송 버튼)
- **이미지 첨부 썸네일**: textarea **위**에 표시 (아래가 아님). 순서: `{thumbnails} → <TextareaAutosize /> → {bottomBar}`. X(삭제) 버튼은 썸네일 **좌측 상단** (`top-0.5 left-0.5`). PromptInput과 HomeScreen 양쪽 동일하게 적용.

## 채팅 영역 레이아웃

### 콘텐츠 너비 (반응형)

MessageList와 PromptInput은 동일한 반응형 max-width를 사용하여 너비를 일치시킴:

```
max-w-[90%] md:max-w-[80%] lg:max-w-[70%] mx-auto w-full
```

- 작은 화면 (< 768px): 90%
- 중간 화면 (768px~1024px): 80%
- 큰 화면 (≥ 1024px): 70%

두 컴포넌트의 max-width 클래스는 반드시 동일하게 유지할 것. 하나만 변경하면 정렬이 어긋남.

### 스크롤바 위치

`MessageList`는 2중 div 구조:
- **외부**: `flex-1 overflow-y-auto` — 전체 너비, 스크롤바는 오른쪽 끝에 위치
- **내부**: 반응형 max-width + `mx-auto` — 콘텐츠 가운데 정렬

```tsx
<div className="flex-1 overflow-y-auto">          {/* 스크롤 컨테이너: 전체 너비 */}
  <div className="max-w-[90%] md:max-w-[80%] lg:max-w-[70%] mx-auto w-full">
    {/* 콘텐츠 */}
  </div>
</div>
```

### 스크롤 컨테이너 내부 Sticky 요소

스크롤 컨테이너 안에서 조건부로 표시되는 sticky 요소(예: 스크롤 버튼)는 **조건부 렌더링 금지**. DOM mount/unmount가 `scrollHeight`를 변경하여 빠른 스크롤 시 위치 진동(떨림) 유발.

```tsx
// ❌ 조건부 렌더링 — scrollHeight 변동으로 빠른 스크롤 시 떨림
{showButton && <button className="sticky bottom-4 ...">}

// ✅ 항상 렌더링 + CSS 토글 — scrollHeight 일정
<button className={`sticky bottom-4 ... ${
  showButton ? 'opacity-100' : 'opacity-0 pointer-events-none'
}`}>
```

### 메시지 버블 스타일

- **User (텍스트)**: 파란 버블 — `max-w-[80%] rounded-2xl px-4 py-3 bg-primary text-white`
- **User (이미지 첨부)**: 이미지는 파란 버블 **바깥 위쪽**에 별도 컨테이너로 렌더링 (`rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700`). 텍스트가 있으면 그 아래에 파란 버블. 이미지만 있고 텍스트 없으면 파란 버블 렌더링 안 함.
- **Assistant**: 배경/테두리 없음 (Claude 앱 스타일) — `max-w-none py-1 text-neutral-900 dark:text-neutral-100`

#### User 버블 긴 텍스트 overflow 방지

`items-end` flex 컨테이너 안에서 bubble div는 shrink-to-fit(콘텐츠 기반) 폭을 가지므로, 공백 없는 긴 문자열(URL 등)이 `max-w-[80%]`를 초과할 수 있음. 3가지 클래스가 함께 동작해야 정상 줄바꿈:

1. **`min-w-0`** (80% 컨테이너): flex item의 기본 `min-width: auto`가 `max-width`를 무시하는 것을 방지
2. **`max-w-full`** (bubble div): bubble 폭을 부모(80%) 이내로 제한 → `overflow-wrap`의 containing block 확정
3. **`break-words`** (`<p>` 태그): containing block 폭이 확정되어야 `overflow-wrap: break-word`가 동작

셋 중 하나라도 빠지면 긴 URL에서 버블이 좌측으로 넘침.

### User 메시지 Hover 액션 바

User 버블 아래에 hover 시 나타나는 액션 바 (시간, 재시도, 편집, 복사):

- **구조**: 외부 `div`에 `group` 클래스, 액션 바에 `opacity-0 group-hover:opacity-100` (CodeBlock Copy 버튼과 동일 패턴)
- **복사 피드백**: `copied` state → 체크마크 아이콘 + `text-green-500` → 2초 후 원복. `copied` 상태일 때 `opacity-100` 유지
- **아이콘 규격**: lucide-react 컴포넌트, `size={14}` (RefreshCw, Pencil, Copy, Check)
- **재시도**: `onRegenerate?.(id!)` 호출 → `useSessionStore.regenerateMessage(messageId)` 실행
- **편집**: 아이콘만 렌더링 (기능 미구현, 추후 연결 예정)

### Assistant 메시지 액션 바

Assistant 버블 하단에 항상 표시되는 액션 바 (복사, 재생성):

- **복사**: User 버블과 동일한 `copied` state 패턴
- **재생성**: 모든 assistant 메시지에 표시 (마지막 메시지 제한 없음). `onRegenerate(id)` 호출

### Flex 가로 레이아웃 min-w-0 체인

CSS flex 아이템은 기본 `min-width: auto`로 콘텐츠 크기 이하로 줄어들지 못함. 코드 블록 등 넓은 콘텐츠가 flex 아이템을 밀어내어 사이드바 공간을 침범하거나 `overflow-x-auto`가 동작하지 않는 문제 발생.

**해결**: 레이아웃 체인의 각 flex 아이템에 `min-w-0`을 추가하여 overflow가 전파되지 않도록 차단:

```
MainLayout (flex 가로)
  └─ ChatPage: flex flex-1 flex-col min-w-0    ← 핵심 (사이드바 공간 보호)
       └─ MessageList: overflow-y-auto
            └─ MessageBubble: flex justify-start min-w-0
                 └─ 콘텐츠: min-w-0
                      └─ CodeBlock: w-full min-w-0
                           └─ overflow-x-auto ✓
```

- **수정 시 주의**: 이 체인에서 하나라도 `min-w-0`을 빠뜨리면 긴 코드 블록이 사이드바를 밀어냄
- 새로운 flex 래퍼를 이 체인 중간에 추가할 때 반드시 `min-w-0` 포함

### PromptInput 외부 패딩

`py-4`만 사용 (좌우 패딩 없음). 좌우 여백은 내부 콘텐츠 div의 `mx-auto` + max-width로 제어. 외부에 `px-*`를 넣으면 MessageList와 너비 불일치 발생.

## Assistant 메시지 마크다운 렌더링

`MessageBubble.tsx`의 `ReactMarkdown`은 remark(파싱) → rehype(렌더링) 플러그인 체인으로 동작:

```tsx
<ReactMarkdown
  remarkPlugins={[remarkGfm, remarkMath]}
  rehypePlugins={[rehypeKatex]}
  components={{...}}
>
```

| 플러그인 | 역할 |
|----------|------|
| `remark-gfm` | 테이블, 취소선, 자동링크 등 GFM 확장 파싱 |
| `remark-math` | `$...$` (인라인) / `$$...$$` (블록) 수식 구문을 AST 노드로 파싱 |
| `rehype-katex` | math AST 노드를 KaTeX HTML로 렌더링 |

- KaTeX CSS는 `MessageBubble.tsx`에서 `import 'katex/dist/katex.min.css'`로 로드. 다크 모드에서 수식 색상은 `currentColor` 상속으로 자동 적용됨.
- 마크다운 확장 추가 시 동일한 remark(파싱)/rehype(렌더링) 패턴을 따를 것.

## 코드 블록 (CodeBlock)

`packages/frontend/src/widgets/message-list/ui/CodeBlock.tsx`

### Sticky 헤더

- 헤더(언어 라벨 + Copy 버튼)는 `sticky top-0 z-10`으로 스크롤 시 고정
- **래퍼에 `overflow-hidden` 사용 금지** — sticky가 동작하지 않음
- border/rounded를 헤더와 코드 본문에 각각 분리 적용:
  - 헤더: `rounded-t-lg border border-b-0`
  - 코드: `rounded-b-lg border border-t-0 overflow-x-auto`

### 배경색

- 헤더와 코드 본문이 동일한 배경색 사용 (inline style)
- dark: `#171717`, light: `#FAF9F7`
- Tailwind `bg-*` 대신 `style={{ background }}` 사용 (SyntaxHighlighter customStyle과 동일 값 유지)

### Copy 버튼

- 아이콘만 표시 (텍스트 없음)
- 래퍼에 `group`, 버튼에 `opacity-0 group-hover:opacity-100`으로 hover 시에만 표시
- 복사 완료(체크 아이콘) 상태에서는 `opacity-100`으로 항상 표시

## 공유 모듈

`packages/frontend/src/shared/lib/` 디렉토리에 여러 컴포넌트가 공유하는 데이터/유틸 배치.

- `model-meta.ts` — 모델 표시명, 아이콘 등 UI 메타데이터
- `time.ts` — `formatRelativeTime(isoDate)` 상대 시간 한국어 포맷 ("5분 전", "2시간 전", "1주 전" 등), `formatTime(isoDate)` 시:분 포맷 ("오후 3:42")
