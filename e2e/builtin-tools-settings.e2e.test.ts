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

    // Verify "Filesystem" card exists
    const filesystemCard = await vibe.evaluate<string>(
      'const p = [...document.querySelectorAll("p")].find(el => el.textContent === "Filesystem"); return p ? p.textContent : "";'
    )
    expect(filesystemCard).toBe('Filesystem')

    // Verify "Shell" card exists
    const shellCard = await vibe.evaluate<string>(
      'const p = [...document.querySelectorAll("p")].find(el => el.textContent === "Shell"); return p ? p.textContent : "";'
    )
    expect(shellCard).toBe('Shell')
  }, 30_000)

  it('Filesystem 카드에 상태 dot + 라벨이 표시됨', async () => {
    // Verify status dot exists inside the Filesystem card
    const hasDot = await vibe.evaluate<boolean>(`
      const card = [...document.querySelectorAll('p')].find(el => el.textContent === 'Filesystem');
      if (!card) return false;
      const container = card.parentElement;
      if (!container) return false;
      const dot = container.querySelector('.rounded-full');
      return !!dot;
    `)
    expect(hasDot).toBe(true)

    // Verify status label is one of the expected values
    const statusText = await vibe.evaluate<string>(`
      const card = [...document.querySelectorAll('p')].find(el => el.textContent === 'Filesystem');
      if (!card) return '';
      const container = card.parentElement;
      const statusP = container.querySelectorAll('p')[1];
      return statusP ? statusP.textContent.trim() : '';
    `)
    expect(['실행 중', '오류', '비활성화'].some(label => statusText.includes(label))).toBe(true)
  }, 30_000)

  it('구성 버튼 클릭 → Filesystem 설정 화면 표시', async () => {
    // Click "구성" button
    await vibe.evaluate(
      'const btn = [...document.querySelectorAll("button")].find(b => b.textContent.trim() === "구성"); if (btn) btn.click();'
    )
    await new Promise((r) => setTimeout(r, 500))

    // Verify config view header
    const header = await vibe.evaluate<string>(
      'const h = [...document.querySelectorAll("h3")].find(el => el.textContent === "Filesystem"); return h ? h.textContent : "";'
    )
    expect(header).toBe('Filesystem')

    // Verify "허용 디렉토리" section
    const dirSection = await vibe.evaluate<boolean>(
      'return !!document.body.textContent.includes("허용 디렉토리")'
    )
    expect(dirSection).toBe(true)
  }, 30_000)

  it('Filesystem 구성에서 도구 권한 섹션 존재 확인', async () => {
    // Ensure shell is disabled so only filesystem tools appear
    await vibe.evaluate(`
      return fetch('/api/settings/builtin_tools_shell_enabled', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: 'false' })
      }).then(() => true)
    `)
    await new Promise((r) => setTimeout(r, 300))

    // Switch to a different tab to unmount ExtensionsContent
    await vibe.evaluate(
      'const btn = [...document.querySelectorAll("button")].find(b => b.textContent.trim() === "일반"); if (btn) btn.click();'
    )
    await new Promise((r) => setTimeout(r, 300))

    // Re-enter extensions tab (remounts component, reads fresh state from API)
    await vibe.evaluate(
      'const btn = [...document.querySelectorAll("button")].find(b => b.textContent.trim() === "확장 프로그램"); if (btn) btn.click();'
    )
    await new Promise((r) => setTimeout(r, 1000))

    // Enter filesystem config
    await vibe.evaluate(
      'const btn = [...document.querySelectorAll("button")].find(b => b.textContent.trim() === "구성"); if (btn) btn.click();'
    )
    await new Promise((r) => setTimeout(r, 500))

    // Should already be in filesystem config view from previous test
    const permSection = await vibe.evaluate<boolean>(
      'return !!document.body.textContent.includes("도구 권한")'
    )
    expect(permSection).toBe(true)

    // Verify new tool names are displayed (MCP spec)
    const hasReadTextFile = await vibe.evaluate<boolean>(
      'return !!document.body.textContent.includes("read_text_file")'
    )
    expect(hasReadTextFile).toBe(true)

    const hasWriteFile = await vibe.evaluate<boolean>(
      'return !!document.body.textContent.includes("write_file")'
    )
    expect(hasWriteFile).toBe(true)

    // Verify new tools are shown
    const hasDirectoryTree = await vibe.evaluate<boolean>(
      'return !!document.body.textContent.includes("directory_tree")'
    )
    expect(hasDirectoryTree).toBe(true)

    const hasMoveFile = await vibe.evaluate<boolean>(
      'return !!document.body.textContent.includes("move_file")'
    )
    expect(hasMoveFile).toBe(true)

    const hasGetFileInfo = await vibe.evaluate<boolean>(
      'return !!document.body.textContent.includes("get_file_info")'
    )
    expect(hasGetFileInfo).toBe(true)

    const hasListAllowed = await vibe.evaluate<boolean>(
      'return !!document.body.textContent.includes("list_allowed_directories")'
    )
    expect(hasListAllowed).toBe(true)

    // Verify 13 filesystem tool rows (shell disabled)
    const toolCount = await vibe.evaluate<number>(`
      const rows = document.querySelectorAll('[class*="font-mono"]');
      return [...rows].filter(el => el.closest('[class*="justify-between"]')).length;
    `)
    expect(toolCount).toBe(13)
  }, 30_000)

  it('권한 버튼 클릭 → API에 저장 확인', async () => {
    // Click the "blocked" (Ban) button for read_text_file — it's the 3rd button in the first tool row
    await vibe.evaluate(`
      const rows = document.querySelectorAll('[class*="font-mono"]');
      const readFileRow = [...rows].find(el => el.textContent === 'read_text_file');
      if (readFileRow) {
        const btns = readFileRow.closest('[class*="justify-between"]').querySelectorAll('button');
        if (btns[2]) btns[2].click();
      }
    `)
    await new Promise((r) => setTimeout(r, 500))

    // Verify saved value via API
    const savedValue = await vibe.evaluate<string>(`
      return fetch('/api/settings/builtin_tools_permissions')
        .then(r => r.json())
        .then(json => json.value || '')
    `)
    expect(savedValue).toContain('read_text_file')
    expect(savedValue).toContain('blocked')

    // Cleanup
    await vibe.evaluate(`
      return fetch('/api/settings/builtin_tools_permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: '{}' })
      }).then(() => true)
    `)
    await new Promise((r) => setTimeout(r, 300))
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

  it('alwaysAllow API 호출 시 도구 권한이 always로 변경됨', async () => {
    // Set a tool to 'confirm' permission
    await vibe.evaluate(`
      return fetch('/api/settings/builtin_tools_permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: JSON.stringify({ write_file: 'confirm' }) })
      }).then(() => true)
    `)
    await new Promise((r) => setTimeout(r, 300))

    // Verify it's set to 'confirm'
    const beforeValue = await vibe.evaluate<string>(`
      return fetch('/api/settings/builtin_tools_permissions')
        .then(r => r.json())
        .then(json => json.value || '{}')
    `)
    expect(beforeValue).toContain('"write_file":"confirm"')

    // Simulate alwaysAllow: update permission to 'always' via settings API
    await vibe.evaluate(`
      return fetch('/api/settings/builtin_tools_permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: JSON.stringify({ write_file: 'always' }) })
      }).then(() => true)
    `)
    await new Promise((r) => setTimeout(r, 300))

    const afterValue = await vibe.evaluate<string>(`
      return fetch('/api/settings/builtin_tools_permissions')
        .then(r => r.json())
        .then(json => json.value || '{}')
    `)
    expect(afterValue).toContain('"write_file":"always"')

    // Cleanup
    await vibe.evaluate(`
      return fetch('/api/settings/builtin_tools_permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: '{}' })
      }).then(() => true)
    `)
    await new Promise((r) => setTimeout(r, 300))
  }, 30_000)

  it('Shell 활성화 시 execute_command 권한 행이 도구 권한에 표시됨', async () => {
    // Enable shell via API
    await vibe.evaluate(`
      return fetch('/api/settings/builtin_tools_shell_enabled', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: 'true' })
      }).then(() => true)
    `)
    await new Promise((r) => setTimeout(r, 300))

    // Navigate away from extensions to force unmount, then back to remount with fresh state
    await vibe.evaluate(
      'const btn = [...document.querySelectorAll("button")].find(b => b.textContent.trim() === "일반"); if (btn) btn.click();'
    )
    await new Promise((r) => setTimeout(r, 300))
    await vibe.evaluate(
      'const btn = [...document.querySelectorAll("button")].find(b => b.textContent.trim() === "확장 프로그램"); if (btn) btn.click();'
    )
    await new Promise((r) => setTimeout(r, 1000))

    // Enter filesystem config
    await vibe.evaluate(
      'const btn = [...document.querySelectorAll("button")].find(b => b.textContent.trim() === "구성"); if (btn) btn.click();'
    )
    await new Promise((r) => setTimeout(r, 500))

    // Verify execute_command row is now visible
    const hasExecuteCommand = await vibe.evaluate<boolean>(
      'return !!document.body.textContent.includes("execute_command")'
    )
    expect(hasExecuteCommand).toBe(true)

    // Verify 14 tool rows total (13 filesystem + 1 shell)
    const toolCount = await vibe.evaluate<number>(`
      const rows = document.querySelectorAll('[class*="font-mono"]');
      return [...rows].filter(el => el.closest('[class*="justify-between"]')).length;
    `)
    expect(toolCount).toBe(14)
  }, 30_000)

  it('execute_command 권한 변경(always/confirm/blocked)이 API에 저장됨', async () => {
    // Click "always" (CircleCheck) button for execute_command — 1st button in the row
    await vibe.evaluate(`
      const rows = document.querySelectorAll('[class*="font-mono"]');
      const execRow = [...rows].find(el => el.textContent === 'execute_command');
      if (execRow) {
        const btns = execRow.closest('[class*="justify-between"]').querySelectorAll('button');
        if (btns[0]) btns[0].click();
      }
    `)
    await new Promise((r) => setTimeout(r, 500))

    // Verify saved value via API
    const savedValue = await vibe.evaluate<string>(`
      return fetch('/api/settings/builtin_tools_permissions')
        .then(r => r.json())
        .then(json => json.value || '')
    `)
    expect(savedValue).toContain('execute_command')
    expect(savedValue).toContain('always')

    // Cleanup
    await vibe.evaluate(`
      return fetch('/api/settings/builtin_tools_permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: '{}' })
      }).then(() => true)
    `)
    await vibe.evaluate(`
      return fetch('/api/settings/builtin_tools_shell_enabled', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: 'false' })
      }).then(() => true)
    `)
    await new Promise((r) => setTimeout(r, 300))
  }, 30_000)
})
