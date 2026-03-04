import { describe, it, expect, afterAll } from 'vitest'
import { browser } from 'vibium'

const BACKEND_URL = 'http://localhost:3131'
const FRONTEND_URL = 'http://localhost:5173'

describe('diagnostic export E2E', () => {
  let vibe: Awaited<ReturnType<typeof browser.launch>>

  afterAll(async () => {
    await vibe?.quit()
  })

  it('GET /api/diagnostics/export returns valid zip', async () => {
    const res = await fetch(`${BACKEND_URL}/api/diagnostics/export`)
    expect(res.ok).toBe(true)
    expect(res.headers.get('content-type')).toBe('application/zip')

    const buffer = await res.arrayBuffer()
    expect(buffer.byteLength).toBeGreaterThan(0)
  })

  it('설정 > 개발자 탭 → 진단 로그 섹션 및 내보내기 버튼 표시', async () => {
    vibe = await browser.launch({ headless: true, port: 9521 })
    await vibe.go(FRONTEND_URL)

    // Wait for sidebar to load
    await vibe.find('.flex.h-full.w-64')

    // Open settings via profile area at sidebar bottom
    const profileArea = await vibe.find('.shrink-0.border-t')
    await profileArea.click()

    // Wait for popup, then click "설정"
    await new Promise((r) => setTimeout(r, 500))
    await vibe.evaluate(
      'const btn = [...document.querySelectorAll("button")].find(b => b.textContent.includes("설정") && !b.textContent.includes("파일")); if (btn) btn.click();'
    )

    await new Promise((r) => setTimeout(r, 1000))

    // Click "개발자" tab
    await vibe.evaluate(
      'const tab = [...document.querySelectorAll("button")].find(b => b.textContent.trim() === "개발자"); if (tab) tab.click();'
    )

    await new Promise((r) => setTimeout(r, 1500))

    // Verify "진단 로그" section header
    const sectionHeader = await vibe.evaluate<string>(
      'const h = [...document.querySelectorAll("h3")].find(el => el.textContent.includes("진단 로그")); return h ? h.textContent : "";'
    )
    expect(sectionHeader).toContain('진단 로그')

    // Verify export button exists
    const buttonExists = await vibe.evaluate<boolean>(
      'return !![...document.querySelectorAll("button")].find(b => b.textContent.includes("진단 로그 내보내기"));'
    )
    expect(buttonExists).toBe(true)

    // Verify description text
    const hasDescription = await vibe.evaluate<boolean>(
      'return !!document.body.textContent.includes("문제 해결을 위해 로그 파일을 zip으로 내보냅니다");'
    )
    expect(hasDescription).toBe(true)
  }, 60_000)
})
