import { describe, it, expect, afterAll } from 'vitest'
import { browser } from 'vibium'

const FRONTEND_URL = 'http://localhost:5173'

describe('features settings E2E', () => {
  let vibe: Awaited<ReturnType<typeof browser.launch>>

  afterAll(async () => {
    await vibe?.quit()
  })

  it('설정 > 기능 탭 이동 + 메모리 섹션 확인', async () => {
    vibe = await browser.launch({ headless: true, port: 9517 })
    await vibe.go(FRONTEND_URL)

    // Wait for sidebar to load
    await vibe.find('.flex.h-full.w-64')

    // Open settings via the profile area at the bottom of the sidebar
    const profileArea = await vibe.find('.shrink-0.border-t')
    await profileArea.click()

    // Wait for popup, then click "설정"
    await new Promise((r) => setTimeout(r, 500))
    await vibe.evaluate(
      'const btn = [...document.querySelectorAll("button")].find(b => b.textContent.includes("설정") && !b.textContent.includes("파일")); if (btn) btn.click();'
    )

    await new Promise((r) => setTimeout(r, 1000))

    // Click "기능" tab
    await vibe.evaluate(
      'const tab = [...document.querySelectorAll("button")].find(b => b.textContent.trim() === "기능"); if (tab) tab.click();'
    )

    await new Promise((r) => setTimeout(r, 1000))

    // Verify "메모리" header
    const memoryHeader = await vibe.evaluate<string>(
      'const h = [...document.querySelectorAll("h3")].find(el => el.textContent.includes("메모리")); return h ? h.textContent : "";'
    )
    expect(memoryHeader).toContain('메모리')
  }, 30_000)

  it('메모리 토글 on/off 확인', async () => {
    // Find the toggle near "채팅 기록에서 기억 생성" text
    const initialState = await vibe.evaluate<string>(
      `const items = document.querySelectorAll('button[role="switch"]');
       for (const btn of items) {
         const parent = btn.closest(".flex.items-center.justify-between");
         if (parent && parent.textContent.includes("채팅 기록에서 기억 생성")) {
           return btn.getAttribute("aria-checked");
         }
       }
       return "";`
    )
    expect(initialState).toBeTruthy()

    // Click toggle
    await vibe.evaluate(
      `const items = document.querySelectorAll('button[role="switch"]');
       for (const btn of items) {
         const parent = btn.closest(".flex.items-center.justify-between");
         if (parent && parent.textContent.includes("채팅 기록에서 기억 생성")) {
           btn.click(); break;
         }
       }`
    )
    await new Promise((r) => setTimeout(r, 500))

    const newState = await vibe.evaluate<string>(
      `const items = document.querySelectorAll('button[role="switch"]');
       for (const btn of items) {
         const parent = btn.closest(".flex.items-center.justify-between");
         if (parent && parent.textContent.includes("채팅 기록에서 기억 생성")) {
           return btn.getAttribute("aria-checked");
         }
       }
       return "";`
    )
    expect(newState).not.toBe(initialState)

    // Restore original state
    await vibe.evaluate(
      `const items = document.querySelectorAll('button[role="switch"]');
       for (const btn of items) {
         const parent = btn.closest(".flex.items-center.justify-between");
         if (parent && parent.textContent.includes("채팅 기록에서 기억 생성")) {
           btn.click(); break;
         }
       }`
    )
    await new Promise((r) => setTimeout(r, 500))

    const restoredState = await vibe.evaluate<string>(
      `const items = document.querySelectorAll('button[role="switch"]');
       for (const btn of items) {
         const parent = btn.closest(".flex.items-center.justify-between");
         if (parent && parent.textContent.includes("채팅 기록에서 기억 생성")) {
           return btn.getAttribute("aria-checked");
         }
       }
       return "";`
    )
    expect(restoredState).toBe(initialState)
  }, 30_000)

  it('채팅 검색 토글 on/off 확인', async () => {
    const initialState = await vibe.evaluate<string>(
      `const items = document.querySelectorAll('button[role="switch"]');
       for (const btn of items) {
         const parent = btn.closest(".flex.items-center.justify-between");
         if (parent && parent.textContent.includes("채팅 검색 및 참조")) {
           return btn.getAttribute("aria-checked");
         }
       }
       return "";`
    )
    expect(initialState).toBeTruthy()

    // Click toggle
    await vibe.evaluate(
      `const items = document.querySelectorAll('button[role="switch"]');
       for (const btn of items) {
         const parent = btn.closest(".flex.items-center.justify-between");
         if (parent && parent.textContent.includes("채팅 검색 및 참조")) {
           btn.click(); break;
         }
       }`
    )
    await new Promise((r) => setTimeout(r, 500))

    const newState = await vibe.evaluate<string>(
      `const items = document.querySelectorAll('button[role="switch"]');
       for (const btn of items) {
         const parent = btn.closest(".flex.items-center.justify-between");
         if (parent && parent.textContent.includes("채팅 검색 및 참조")) {
           return btn.getAttribute("aria-checked");
         }
       }
       return "";`
    )
    expect(newState).not.toBe(initialState)

    // Restore
    await vibe.evaluate(
      `const items = document.querySelectorAll('button[role="switch"]');
       for (const btn of items) {
         const parent = btn.closest(".flex.items-center.justify-between");
         if (parent && parent.textContent.includes("채팅 검색 및 참조")) {
           btn.click(); break;
         }
       }`
    )
    await new Promise((r) => setTimeout(r, 500))

    const restoredState = await vibe.evaluate<string>(
      `const items = document.querySelectorAll('button[role="switch"]');
       for (const btn of items) {
         const parent = btn.closest(".flex.items-center.justify-between");
         if (parent && parent.textContent.includes("채팅 검색 및 참조")) {
           return btn.getAttribute("aria-checked");
         }
       }
       return "";`
    )
    expect(restoredState).toBe(initialState)
  }, 30_000)

  it('스킬 섹션 UI 요소 존재 확인', async () => {
    // Verify "스킬" header
    const skillHeader = await vibe.evaluate<string>(
      'const h = [...document.querySelectorAll("h3")].find(el => el.textContent.includes("스킬")); return h ? h.textContent : "";'
    )
    expect(skillHeader).toContain('스킬')

    // Verify search input
    const hasSearchInput = await vibe.evaluate<boolean>(
      'return !!document.querySelector(\'input[placeholder="검색"]\')'
    )
    expect(hasSearchInput).toBe(true)

    // Verify "내 스킬" tab
    const hasMySkills = await vibe.evaluate<boolean>(
      'return !![...document.querySelectorAll("button")].find(b => b.textContent.trim() === "내 스킬")'
    )
    expect(hasMySkills).toBe(true)

    // Verify "예시 스킬" tab
    const hasExampleSkills = await vibe.evaluate<boolean>(
      'return !![...document.querySelectorAll("button")].find(b => b.textContent.trim() === "예시 스킬")'
    )
    expect(hasExampleSkills).toBe(true)

    // Verify empty state message
    const hasEmptyMsg = await vibe.evaluate<boolean>(
      'return !!document.body.textContent.includes("아직 추가한 스킬이 없습니다")'
    )
    expect(hasEmptyMsg).toBe(true)
  }, 30_000)
})
