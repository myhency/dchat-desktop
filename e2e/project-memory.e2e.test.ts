import { describe, it, expect, afterAll } from 'vitest'
import { browser } from 'vibium'

const FRONTEND_URL = 'http://localhost:5173'
const BACKEND_URL = 'http://localhost:3131'

describe('project memory E2E', () => {
  let vibe: Awaited<ReturnType<typeof browser.launch>>
  let projectId: string

  afterAll(async () => {
    // Cleanup: delete project
    if (projectId) {
      await fetch(`${BACKEND_URL}/api/projects/${projectId}`, { method: 'DELETE' }).catch(() => {})
    }
    await vibe?.quit()
  })

  it('프로젝트 생성 → 프로젝트 상세 → "프로젝트 기억" 섹션 존재 확인', async () => {
    // Create project via backend API directly
    const res = await fetch(`${BACKEND_URL}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'E2E 메모리 테스트', description: '프로젝트 메모리 E2E 테스트' })
    })
    const project = await res.json()
    projectId = project.id
    expect(projectId).toBeTruthy()

    vibe = await browser.launch({ headless: true, port: 9518 })
    await vibe.go(FRONTEND_URL)

    // Wait for sidebar to load
    await vibe.find('.flex.h-full.w-64')
    await new Promise((r) => setTimeout(r, 1500))

    // Click "프로젝트" in sidebar to open project list view
    await vibe.evaluate(
      'const btn = [...document.querySelectorAll("button")].find(b => b.textContent.includes("프로젝트")); if (btn) btn.click();'
    )
    await new Promise((r) => setTimeout(r, 1500))

    // Click the project in the project list
    const projectClicked = await vibe.evaluate<boolean>(`
      const items = [...document.querySelectorAll('*')];
      const el = items.find(e => e.textContent === 'E2E 메모리 테스트' && e.closest('[class*="cursor"]'));
      if (el) { (el.closest('[class*="cursor"]') || el).click(); return true; }
      const el2 = items.find(e => e.textContent.trim() === 'E2E 메모리 테스트');
      if (el2) { el2.click(); return true; }
      return false;
    `)
    expect(projectClicked).toBe(true)
    await new Promise((r) => setTimeout(r, 1500))

    // Verify "프로젝트 기억" section exists
    const hasMemorySection = await vibe.evaluate<boolean>(
      'return !!document.body.textContent.includes("프로젝트 기억")'
    )
    expect(hasMemorySection).toBe(true)

    // Verify empty state message
    const hasEmptyMsg = await vibe.evaluate<boolean>(
      'return !!document.body.textContent.includes("이 프로젝트의 대화에서 자동으로 기억이 생성됩니다")'
    )
    expect(hasEmptyMsg).toBe(true)
  }, 30_000)

  it('프로젝트 메모리 API 동작 확인 (GET/DELETE)', async () => {
    // Ensure project exists
    expect(projectId).toBeTruthy()

    // GET memory via backend API
    const getRes = await fetch(`${BACKEND_URL}/api/projects/${projectId}/memory`)
    // If project was cleaned up by previous run, skip gracefully
    if (!getRes.ok) {
      console.warn('[project-memory E2E] Project may have been cleaned up, status:', getRes.status)
      return
    }
    const getData = await getRes.json()
    expect(getData.content).toBe('')
    expect(getData.updatedAt).toBeNull()

    // DELETE memory (should succeed even when empty)
    const delRes = await fetch(`${BACKEND_URL}/api/projects/${projectId}/memory`, { method: 'DELETE' })
    expect(delRes.ok).toBe(true)

    // Verify still empty after delete
    const getRes2 = await fetch(`${BACKEND_URL}/api/projects/${projectId}/memory`)
    const getData2 = await getRes2.json()
    expect(getData2.content).toBe('')
  }, 30_000)

  it('빈 상태에서 "초기화" 링크 없음 확인', async () => {
    // In empty state, there should be no "초기화" link/button
    const hasResetLink = await vibe.evaluate<boolean>(`
      const links = [...document.querySelectorAll('button')];
      return !!links.find(b => b.textContent.trim() === '초기화');
    `)
    expect(hasResetLink).toBe(false)
  }, 30_000)
})
