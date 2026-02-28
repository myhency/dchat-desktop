import { describe, it, expect, afterAll } from 'vitest'
import { browser } from 'vibium'

const FRONTEND_URL = 'http://localhost:5173'
const BACKEND_URL = 'http://localhost:3131'

describe('add to project E2E', () => {
  let vibe: Awaited<ReturnType<typeof browser.launch>>
  let projectId: string

  afterAll(async () => {
    if (projectId) {
      await fetch(`${BACKEND_URL}/api/projects/${projectId}`, { method: 'DELETE' }).catch(() => {})
    }
    await vibe?.quit()
  })

  it('프로젝트에 추가 서브메뉴 표시 및 프로젝트 선택/배지/삭제', async () => {
    // Create project via backend API
    const res = await fetch(`${BACKEND_URL}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'E2E 프로젝트추가 테스트', description: 'add-to-project E2E' })
    })
    const project = await res.json()
    projectId = project.id
    expect(projectId).toBeTruthy()

    vibe = await browser.launch({ headless: true, port: 9520 })
    await vibe.go(FRONTEND_URL)

    // Wait for app to load and projects to be fetched
    await vibe.find('.flex.h-full.w-64')
    await new Promise((r) => setTimeout(r, 2000))

    // Click the "+" button on HomeScreen to open PromptMenu
    const plusButton = await vibe.evaluate<boolean>(`
      const btns = [...document.querySelectorAll('button')];
      const plusBtn = btns.find(b => {
        const svg = b.querySelector('svg');
        return svg && b.classList.contains('w-8') && b.classList.contains('h-8');
      });
      if (plusBtn) { plusBtn.click(); return true; }
      return false;
    `)
    expect(plusButton).toBe(true)
    await new Promise((r) => setTimeout(r, 500))

    // Verify "프로젝트에 추가" menu item exists
    const hasProjectMenuItem = await vibe.evaluate<boolean>(
      'return !!document.body.textContent.includes("프로젝트에 추가")'
    )
    expect(hasProjectMenuItem).toBe(true)

    // Hover over "프로젝트에 추가" to trigger submenu
    // React uses mouseover (not mouseenter) for event delegation
    const hovered = await vibe.evaluate<boolean>(`
      const btns = [...document.querySelectorAll('button')];
      const btn = btns.find(b => b.textContent.includes('프로젝트에 추가'));
      if (btn) {
        const wrapper = btn.parentElement;
        wrapper.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true }));
        return true;
      }
      return false;
    `)
    expect(hovered).toBe(true)
    await new Promise((r) => setTimeout(r, 500))

    // Verify submenu shows the project name
    const hasProjectInSubmenu = await vibe.evaluate<boolean>(
      'return !!document.body.textContent.includes("E2E 프로젝트추가 테스트")'
    )
    expect(hasProjectInSubmenu).toBe(true)

    // Click the project in the submenu
    const projectClicked = await vibe.evaluate<boolean>(`
      const btns = [...document.querySelectorAll('button')];
      const btn = btns.find(b => b.textContent.includes('E2E 프로젝트추가 테스트'));
      if (btn) { btn.click(); return true; }
      return false;
    `)
    expect(projectClicked).toBe(true)
    await new Promise((r) => setTimeout(r, 500))

    // Verify badge appears with project name (truncate span)
    const hasBadge = await vibe.evaluate<boolean>(`
      const spans = [...document.querySelectorAll('span')];
      return !!spans.find(s => s.textContent === 'E2E 프로젝트추가 테스트' && s.classList.contains('truncate'));
    `)
    expect(hasBadge).toBe(true)

    // Click X button on badge to remove project selection
    const removedBadge = await vibe.evaluate<boolean>(`
      const spans = [...document.querySelectorAll('span')];
      const badge = spans.find(s => s.textContent === 'E2E 프로젝트추가 테스트' && s.classList.contains('truncate'));
      if (badge) {
        const xBtn = badge.parentElement.querySelector('button');
        if (xBtn) { xBtn.click(); return true; }
      }
      return false;
    `)
    expect(removedBadge).toBe(true)
    await new Promise((r) => setTimeout(r, 300))

    // Verify badge is gone
    const badgeGone = await vibe.evaluate<boolean>(`
      const spans = [...document.querySelectorAll('span')];
      return !spans.find(s => s.textContent === 'E2E 프로젝트추가 테스트' && s.classList.contains('truncate'));
    `)
    expect(badgeGone).toBe(true)
  }, 30_000)
})
