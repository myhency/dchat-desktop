import { describe, it, expect, afterAll } from 'vitest'
import { browser } from 'vibium'

const FRONTEND_URL = 'http://localhost:5173'

describe('builtin tools settings E2E', () => {
  let vibe: Awaited<ReturnType<typeof browser.launch>>

  afterAll(async () => {
    await vibe?.quit()
  })

  it('설정 > 확장 프로그램 탭 이동 + 내장 도구 카드 확인', async () => {
    vibe = await browser.launch({ headless: true, port: 9519 })
    await vibe.go(FRONTEND_URL)

    // Wait for sidebar to load
    await vibe.find('.flex.h-full.w-64')

    // Open settings
    const profileArea = await vibe.find('.shrink-0.border-t')
    await profileArea.click()

    await new Promise((r) => setTimeout(r, 500))
    await vibe.evaluate(
      'const btn = [...document.querySelectorAll("button")].find(b => b.textContent.includes("설정") && !b.textContent.includes("파일")); if (btn) btn.click();'
    )

    await new Promise((r) => setTimeout(r, 1000))

    // Click "확장 프로그램" tab
    await vibe.evaluate(
      'const tab = [...document.querySelectorAll("button")].find(b => b.textContent.trim() === "확장 프로그램"); if (tab) tab.click();'
    )

    await new Promise((r) => setTimeout(r, 1000))

    // Verify "Filesystem & Shell" card exists
    const cardText = await vibe.evaluate<string>(
      'const p = [...document.querySelectorAll("p")].find(el => el.textContent.includes("Filesystem & Shell")); return p ? p.textContent : "";'
    )
    expect(cardText).toContain('Filesystem & Shell')
  }, 30_000)

  it('구성 버튼 클릭 → 설정 화면 표시', async () => {
    // Click "구성" button
    await vibe.evaluate(
      'const btn = [...document.querySelectorAll("button")].find(b => b.textContent.trim() === "구성"); if (btn) btn.click();'
    )
    await new Promise((r) => setTimeout(r, 500))

    // Verify config view header
    const header = await vibe.evaluate<string>(
      'const h = [...document.querySelectorAll("h3")].find(el => el.textContent.includes("Filesystem & Shell")); return h ? h.textContent : "";'
    )
    expect(header).toContain('Filesystem & Shell')

    // Verify "허용 디렉토리" section
    const dirSection = await vibe.evaluate<boolean>(
      'return !!document.body.textContent.includes("허용 디렉토리")'
    )
    expect(dirSection).toBe(true)

    // Verify Shell toggle section
    const shellSection = await vibe.evaluate<boolean>(
      'return !!document.body.textContent.includes("Shell 명령어 실행")'
    )
    expect(shellSection).toBe(true)
  }, 30_000)

  it('디렉토리 추가 + 저장 + 로드 확인', async () => {
    // Click "디렉토리 추가"
    await vibe.evaluate(
      'const btn = [...document.querySelectorAll("button")].find(b => b.textContent.includes("디렉토리 추가")); if (btn) btn.click();'
    )
    await new Promise((r) => setTimeout(r, 300))

    // Type a directory path
    await vibe.evaluate(`
      const input = document.querySelector('input[placeholder="디렉토리 경로"]');
      if (input) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(input, '/tmp/test-dir');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    `)
    await new Promise((r) => setTimeout(r, 300))

    // Click "저장"
    await vibe.evaluate(
      'const btn = [...document.querySelectorAll("button")].find(b => b.textContent.trim() === "저장"); if (btn) btn.click();'
    )
    await new Promise((r) => setTimeout(r, 1000))

    // Verify saved value via API
    const savedValue = await vibe.evaluate<string>(`
      return fetch('/api/settings/builtin_tools_allowed_dirs')
        .then(r => r.json())
        .then(json => json.value || '')
    `)
    expect(savedValue).toContain('/tmp/test-dir')

    // Cleanup saved setting
    await vibe.evaluate(`
      return fetch('/api/settings/builtin_tools_allowed_dirs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: '[]' })
      }).then(() => true)
    `)
    await new Promise((r) => setTimeout(r, 300))
  }, 30_000)
})
