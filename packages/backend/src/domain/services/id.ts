/**
 * 도메인 내부 ID 생성 헬퍼.
 * 외부 라이브러리 의존 없이 crypto.randomUUID() 사용.
 * (Node 19+ / Electron 28+ 에서 글로벌 제공)
 */
export function generateId(): string {
  return crypto.randomUUID()
}
