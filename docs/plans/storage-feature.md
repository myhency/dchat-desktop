# Storage 기능 구현

## Context

사이드바에 "저장소" 네비게이션 추가 + 별도 페이지에서 3가지 스토리지 타입(Files, Vector stores, Skills)을 관리하는 기능. OpenAI Platform Storage UI를 참고한 마스터-디테일 레이아웃.

- **Files**: 메타데이터만 DB 관리 (파일은 원래 위치 유지)
- **Vector stores**: 전체 임베딩 파이프라인 (OpenAI `text-embedding-3-small`)
- **Skills**: Agent Skills 형식 — .zip 업로드 → SKILL.md (YAML frontmatter) 파싱

## 수정/생성 파일 목록

### 신규 파일 (23개)

| # | 파일 | 설명 |
|---|------|------|
| 1 | `packages/shared/src/entities/storage.ts` | StorageFile, VectorStore, Skill 공유 인터페이스 |
| 2 | `packages/backend/src/domain/entities/storage-file.ts` | 백엔드 StorageFile 엔티티 |
| 3 | `packages/backend/src/domain/entities/vector-store.ts` | VectorStore + VectorChunk 엔티티 |
| 4 | `packages/backend/src/domain/entities/skill.ts` | Skill 엔티티 |
| 5 | `packages/backend/src/domain/ports/outbound/storage-file.repository.ts` | 파일 리포지토리 포트 |
| 6 | `packages/backend/src/domain/ports/outbound/vector-store.repository.ts` | 벡터스토어 + 청크 리포지토리 포트 |
| 7 | `packages/backend/src/domain/ports/outbound/skill.repository.ts` | 스킬 리포지토리 포트 |
| 8 | `packages/backend/src/domain/ports/outbound/embedding.gateway.ts` | 임베딩 게이트웨이 포트 |
| 9 | `packages/backend/src/domain/ports/inbound/manage-storage.usecase.ts` | 스토리지 유스케이스 포트 |
| 10 | `packages/backend/src/domain/services/storage.service.ts` | 스토리지 서비스 (Files + VectorStores + Skills) |
| 11 | `packages/backend/src/adapters/outbound/persistence/sqlite/storage-file.repository.impl.ts` | SQLite 파일 리포 |
| 12 | `packages/backend/src/adapters/outbound/persistence/sqlite/vector-store.repository.impl.ts` | SQLite 벡터스토어 리포 |
| 13 | `packages/backend/src/adapters/outbound/persistence/sqlite/vector-chunk.repository.impl.ts` | SQLite 청크 리포 |
| 14 | `packages/backend/src/adapters/outbound/persistence/sqlite/skill.repository.impl.ts` | SQLite 스킬 리포 |
| 15 | `packages/backend/src/adapters/outbound/llm/openai-embedding.adapter.ts` | OpenAI 임베딩 어댑터 |
| 16 | `packages/backend/src/adapters/inbound/http/storage.routes.ts` | REST 라우트 핸들러 |
| 17 | `packages/backend/src/__tests__/storage-service.test.ts` | 서비스 단위 테스트 |
| 18 | `packages/frontend/src/entities/storage/api/storage.api.ts` | HTTP API 클라이언트 |
| 19 | `packages/frontend/src/entities/storage/model/storage.store.ts` | Zustand 스토어 |
| 20 | `packages/frontend/src/entities/storage/index.ts` | 배럴 export |
| 21 | `packages/frontend/src/pages/storage/StorageScreen.tsx` | 3-tab 마스터-디테일 페이지 |
| 22 | `packages/frontend/src/pages/storage/index.ts` | 배럴 export |
| 23 | `e2e/storage.e2e.test.ts` | E2E 테스트 |

### 수정 파일 (13개)

| # | 파일 | 변경 내용 |
|---|------|-----------|
| 1 | `packages/shared/src/entities/index.ts` | storage 타입 re-export |
| 2 | `packages/shared/src/api-types.ts` | Storage 요청/응답 타입 추가 |
| 3 | `packages/backend/src/adapters/outbound/persistence/sqlite/schema.ts` | 5개 테이블 추가 |
| 4 | `packages/backend/src/adapters/outbound/llm/llm-adapter.factory.ts` | 임베딩 어댑터 관리 추가 |
| 5 | `packages/backend/src/container.ts` | 스토리지 리포/서비스 와이어링 |
| 6 | `packages/backend/src/server.ts` | `/api/storage` 라우트 등록 |
| 7 | `packages/backend/package.json` | `adm-zip` 의존성 추가 |
| 8 | `packages/frontend/src/entities/session/model/session.store.ts` | `storageOpen` 네비게이션 상태 |
| 9 | `packages/frontend/src/widgets/sidebar/ui/Sidebar.tsx` | "저장소" 버튼 추가 |
| 10 | `packages/frontend/src/widgets/main-layout/ui/MainLayout.tsx` | StorageScreen 라우팅 |
| 11 | `packages/electron/src/main.ts` | `native:pick-file` IPC 핸들러 |
| 12 | `packages/electron/src/preload.ts` | `pickFile` API |
| 13 | `packages/frontend/src/shared/lib/native.ts` | `pickFile` 헬퍼 |

---

## 1. Shared 타입

### `packages/shared/src/entities/storage.ts`

```typescript
export interface StorageFile {
  id: string
  name: string
  path: string
  size: number
  purpose: string        // 'assistants' | 'vector_store' | 'general'
  status: 'uploaded' | 'error'
  createdAt: string
}

export interface VectorStore {
  id: string
  name: string
  fileCount: number
  totalSize: number
  status: 'completed' | 'in_progress' | 'expired'
  expirationPolicy: 'none' | 'last_active_7d' | 'last_active_30d'
  lastActiveAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Skill {
  id: string
  name: string
  description: string
  fileCount: number
  createdAt: string
}

export interface VectorSearchResult {
  fileId: string
  fileName: string
  content: string
  score: number
}
```

### `packages/shared/src/api-types.ts` 추가 타입

```typescript
// Files
export interface RegisterFileRequest { path: string; purpose: string }

// Vector Stores
export interface CreateVectorStoreRequest { name: string; expirationPolicy?: string }
export interface UpdateVectorStoreRequest { name?: string; expirationPolicy?: string }
export interface AddFilesToVectorStoreRequest { fileIds: string[] }
export interface VectorSearchRequest { query: string; topK?: number }

// Skills
export interface UploadSkillRequest { zipBase64: string; fileName: string }
```

---

## 2. Backend

### 2.1 DB 스키마 (schema.ts에 추가)

```sql
CREATE TABLE IF NOT EXISTS storage_files (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, path TEXT NOT NULL,
  size INTEGER NOT NULL, purpose TEXT NOT NULL DEFAULT 'assistants',
  status TEXT NOT NULL DEFAULT 'uploaded', created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vector_stores (
  id TEXT PRIMARY KEY, name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  expiration_policy TEXT NOT NULL DEFAULT 'none',
  last_active_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vector_store_files (
  vector_store_id TEXT NOT NULL, file_id TEXT NOT NULL,
  PRIMARY KEY (vector_store_id, file_id)
);

CREATE TABLE IF NOT EXISTS vector_chunks (
  id TEXT PRIMARY KEY, vector_store_id TEXT NOT NULL, file_id TEXT NOT NULL,
  content TEXT NOT NULL, embedding BLOB NOT NULL,
  chunk_index INTEGER NOT NULL, created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
  dir_path TEXT NOT NULL, file_count INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
);
```

### 2.2 REST API 엔드포인트

```
GET    /api/storage/files                     → 파일 목록
POST   /api/storage/files                     → 파일 등록 (path → fs.stat으로 name/size 조회)
DELETE /api/storage/files/:id                  → 파일 삭제 (메타만)

GET    /api/storage/vector-stores              → 벡터스토어 목록
POST   /api/storage/vector-stores              → 생성
GET    /api/storage/vector-stores/:id          → 상세
PUT    /api/storage/vector-stores/:id          → 수정 (이름, 만료정책)
DELETE /api/storage/vector-stores/:id          → 삭제 (청크 포함)
POST   /api/storage/vector-stores/:id/files    → 파일 추가 → 청킹 → 임베딩
POST   /api/storage/vector-stores/:id/search   → 유사도 검색

GET    /api/storage/skills                     → 스킬 목록
POST   /api/storage/skills                     → 업로드 (base64 zip)
GET    /api/storage/skills/:id                 → 상세
DELETE /api/storage/skills/:id                 → 삭제 (디렉토리 + DB)
```

### 2.3 임베딩 파이프라인

**`llm-adapter.factory.ts` 확장**: `configureProvider('openai', ...)` 호출 시 `OpenAIEmbeddingAdapter`도 함께 생성. `getEmbeddingGateway()` 메서드 추가.

**`openai-embedding.adapter.ts`**: OpenAI SDK의 `client.embeddings.create({ model: 'text-embedding-3-small', input })` 사용. 1536차원 벡터 반환.

**청킹**: 서비스 내 인라인 헬퍼 — `chunkText(text, chunkSize=1000, overlap=200)` → `string[]`

**벡터 저장**: `Float32Array` → `Buffer.from(arr.buffer)` → BLOB 컬럼. 읽기: `new Float32Array(new Uint8Array(blob).buffer)`

**코사인 유사도**: 서비스 내 인라인 — `dot(a,b) / (norm(a) * norm(b))`

**파일 추가 흐름**:
1. `fileRepo.findByIds(fileIds)` → 경로 목록
2. `fs.readFile(path, 'utf-8')` 각 파일 → 텍스트
3. `chunkText(text)` → 청크 배열
4. `embeddingGateway.embed(chunks)` → 벡터 배열
5. `chunkRepo.saveMany(chunks)` + `vectorStoreRepo.addFile(storeId, fileId)`

**검색 흐름**:
1. `embeddingGateway.embed([query])` → 쿼리 벡터
2. `chunkRepo.findByStoreId(storeId)` → 모든 청크+벡터 로드
3. 코사인 유사도 계산 → 정렬 → top-K 반환
4. `vectorStoreRepo.save(...)` — `lastActiveAt` 업데이트

### 2.4 스킬 업로드 흐름

1. base64 디코드 → Buffer
2. `adm-zip`으로 `~/.dchat/storage/skills/{id}/`에 추출
3. `SKILL.md` 읽기 → YAML frontmatter 정규식 파싱 (`/^---\n([\s\S]*?)\n---/`)
4. `name`, `description` 추출 → 스킬 메타데이터 저장
5. 디렉토리 내 파일 개수 → `fileCount`

### 2.5 컨테이너 와이어링 (container.ts)

```typescript
const fileRepo = new SqliteStorageFileRepository(db)
const vectorStoreRepo = new SqliteVectorStoreRepository(db)
const chunkRepo = new SqliteVectorChunkRepository(db)
const skillRepo = new SqliteSkillRepository(db)

const storageService = new StorageService(
  fileRepo, vectorStoreRepo, chunkRepo, skillRepo, llmFactory, settingsRepo
)
// → container.storageService
```

`server.ts`: `app.use('/api/storage', createStorageRoutes(container.storageService))`

---

## 3. Frontend

### 3.1 네비게이션

**session.store.ts** — `ChatState`에 추가:
- `storageOpen: boolean` (초기값 `false`)
- `openStorage()`: `storageOpen: true` + 다른 뷰 모두 닫기
- `closeStorage()`: `storageOpen: false`
- 기존 `openProjects`, `openAllChats`, `selectSession`, `deselectSession`에 `storageOpen: false` 추가

**Sidebar.tsx** — 프로젝트 버튼(line 75-81) 바로 뒤에:
```tsx
<button onClick={() => { closeSettings(); openStorage() }}
  className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors">
  <Database size={16} />
  <span>저장소</span>
</button>
```

**MainLayout.tsx** — 라우팅 캐스케이드 (line 72-85):
```tsx
{settingsOpen ? <SettingsScreen /> : (
  <>
    {storageOpen ? (
      <StorageScreen />
    ) : projectsOpen ? (
      selectedProjectId ? <ProjectDetailScreen /> : <ProjectsScreen />
    ) : allChatsOpen ? (
      ...
```

### 3.2 스토어 (`entities/storage/model/storage.store.ts`)

```typescript
interface StorageState {
  files: StorageFile[]; vectorStores: VectorStore[]; skills: Skill[]
  selectedFileId: string | null
  selectedVectorStoreId: string | null
  selectedSkillId: string | null
  activeTab: 'files' | 'vector-stores' | 'skills'

  loadFiles: () => Promise<void>
  loadVectorStores: () => Promise<void>
  loadSkills: () => Promise<void>
  registerFile: (path: string, purpose: string) => Promise<void>
  deleteFile: (id: string) => Promise<void>
  createVectorStore: (name: string) => Promise<void>
  updateVectorStore: (id: string, data: { name?: string; expirationPolicy?: string }) => Promise<void>
  deleteVectorStore: (id: string) => Promise<void>
  addFilesToVectorStore: (storeId: string, fileIds: string[]) => Promise<void>
  uploadSkill: (zipBase64: string, fileName: string) => Promise<void>
  deleteSkill: (id: string) => Promise<void>
  selectFile: (id: string) => void
  selectVectorStore: (id: string) => void
  selectSkill: (id: string) => void
  setActiveTab: (tab: StorageState['activeTab']) => void
}
```

데이터 로딩: `StorageScreen` 마운트 시 `useEffect`에서 3개 load 호출 (lazy loading — 앱 시작 시 불필요)

### 3.3 StorageScreen 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│ 저장소                               [Upload/+Create]   │
│ ┌─────────┬──────────────┬────────┐                     │
│ │ Files   │ Vector stores│ Skills │                     │
│ └─────────┴──────────────┴────────┘                     │
│ ┌─────────────────────┬────────────────────────────────┐│
│ │ 🔎 Search...        │  LABEL                         ││
│ │─────────────────────│  item-name                     ││
│ │ item 1      date    │                                ││
│ │ item 2 ★    date    │  ○ Field1    value             ││
│ │                     │  ○ Field2    value              ││
│ │                     │  ○ Field3    value              ││
│ │                     │                                ││
│ │                     │  [🗑️ Delete]                    ││
│ └─────────────────────┴────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

- 왼쪽 패널 `w-80`: 검색 + 스크롤 리스트
- 오른쪽 패널 `flex-1`: 선택된 아이템 상세 (미선택 시 빈 상태 메시지)
- 각 탭별 액션 버튼: Files=Upload, Vector stores=+만들기, Skills=Upload
- 각 탭별 디테일 필드: 스크린샷 참조

### 3.4 파일 업로드 처리

**Electron**: `native:pick-file` IPC → `dialog.showOpenDialog` → `{ path, name, size }` 반환
- `packages/electron/src/main.ts`에 핸들러 추가
- `packages/electron/src/preload.ts`에 `pickFile` API 노출
- `packages/frontend/src/shared/lib/native.ts`에 `pickFile()` 헬퍼

**Web**: Electron 미사용 시 텍스트 input으로 경로 수동 입력

**Skills zip 업로드**: 브라우저 `<input type="file" accept=".zip">` → ArrayBuffer → base64 → API 전송 (기존 `pickImage` 웹 폴백 패턴 동일)

---

## 4. 구현 순서

1. Shared 타입 → 검증: 타입 빌드 성공
2. DB 스키마 + 백엔드 도메인 (엔티티, 포트) → 검증: 서버 시작 시 테이블 생성
3. SQLite 리포지토리 구현 → 검증: 기존 테스트 깨지지 않음
4. 임베딩 어댑터 + 서비스 + 라우트 + 컨테이너 → 검증: curl로 API 테스트
5. 백엔드 테스트 → 검증: `npm run test -w packages/backend`
6. 프론트엔드 네비게이션 (store + sidebar + MainLayout) → 검증: 저장소 버튼 클릭 시 빈 페이지
7. 프론트엔드 API/스토어/페이지 → 검증: UI에서 CRUD 동작
8. Electron IPC (pickFile) → 검증: Electron에서 파일 선택
9. E2E 테스트 → 검증: `npm run test:e2e`

## 5. 의존성

- `adm-zip` + `@types/adm-zip` — .zip 추출 (packages/backend)
