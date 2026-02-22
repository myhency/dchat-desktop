import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { browser } from 'vibium'
import { writeFileSync, readFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const CONFIG_PATH = join(homedir(), '.dchat', 'mcp_config.json')
const BACKEND_URL = 'http://localhost:3131'
const FRONTEND_URL = 'http://localhost:5173'

const FILESYSTEM_CONFIG = JSON.stringify(
  {
    mcpServers: {
      filesystem: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp']
      }
    }
  },
  null,
  2
)

describe('MCP server E2E (filesystem)', () => {
  let originalConfig: string
  let vibe: Awaited<ReturnType<typeof browser.launch>>

  beforeAll(async () => {
    // Backup existing config
    try {
      originalConfig = readFileSync(CONFIG_PATH, 'utf-8')
    } catch {
      originalConfig = JSON.stringify({ mcpServers: {} }, null, 2)
    }

    // Write filesystem server config
    writeFileSync(CONFIG_PATH, FILESYSTEM_CONFIG + '\n', 'utf-8')

    // Reload MCP config via API so backend picks up the new config
    await fetch(`${BACKEND_URL}/api/mcp/reload`, { method: 'POST' })

    // Wait for the filesystem server to start (it needs time to spawn npx)
    let ready = false
    for (let i = 0; i < 30; i++) {
      const res = await fetch(`${BACKEND_URL}/api/mcp/servers/status`)
      const statuses = (await res.json()) as Array<{
        status: string
        tools: Array<{ name: string }>
      }>
      const fs = statuses.find(
        (s) => (s as { config: { name: string } }).config.name === 'filesystem'
      )
      if (fs && fs.status === 'running' && fs.tools.length > 0) {
        ready = true
        break
      }
      await new Promise((r) => setTimeout(r, 2000))
    }

    if (!ready) {
      throw new Error('filesystem MCP server did not become ready')
    }
  }, 120_000)

  afterAll(async () => {
    await vibe?.quit()

    // Restore original config
    writeFileSync(CONFIG_PATH, originalConfig + '\n', 'utf-8')
    await fetch(`${BACKEND_URL}/api/mcp/reload`, { method: 'POST' })
  })

  it('returns filesystem server as running with tools via API', async () => {
    const res = await fetch(`${BACKEND_URL}/api/mcp/servers/status`)
    expect(res.ok).toBe(true)

    const statuses = (await res.json()) as Array<{
      config: { id: string; name: string; command: string }
      status: string
      tools: Array<{ name: string; description: string }>
    }>

    const fs = statuses.find((s) => s.config.name === 'filesystem')
    expect(fs).toBeDefined()
    expect(fs!.status).toBe('running')
    expect(fs!.tools.length).toBeGreaterThan(0)

    // Check key tools are present
    const toolNames = fs!.tools.map((t) => t.name)
    expect(toolNames).toContain('read_file')
    expect(toolNames).toContain('list_directory')
  })

  it('returns config file path via API', async () => {
    const res = await fetch(`${BACKEND_URL}/api/mcp/config-path`)
    expect(res.ok).toBe(true)

    const data = (await res.json()) as { path: string }
    expect(data.path).toBe(CONFIG_PATH)
  })

  it('shows filesystem server in settings developer tab', async () => {
    vibe = await browser.launch({ headless: true, port: 9516 })
    await vibe.go(FRONTEND_URL)

    // Wait for the sidebar to load
    await vibe.find('.flex.h-full.w-64')

    // Open settings via the profile area at the bottom of the sidebar
    const profileArea = await vibe.find('.shrink-0.border-t')
    await profileArea.click()

    // Wait for the popup menu to appear, then click "설정"
    await new Promise((r) => setTimeout(r, 500))
    await vibe.evaluate(
      'const btn = [...document.querySelectorAll("button")].find(b => b.textContent.includes("설정") && !b.textContent.includes("파일")); if (btn) btn.click();'
    )

    // Wait for settings screen to render
    await new Promise((r) => setTimeout(r, 1000))

    // Click "개발자" tab in the settings left nav
    await vibe.evaluate(
      'const tab = [...document.querySelectorAll("button")].find(b => b.textContent.trim() === "개발자"); if (tab) tab.click();'
    )

    // Wait for developer content to render and MCP servers to load
    await new Promise((r) => setTimeout(r, 3000))

    // Verify "로컬 MCP 서버" header is visible
    const headerText = await vibe.evaluate<string>(
      'const h = [...document.querySelectorAll("h3")].find(el => el.textContent.includes("MCP")); return h ? h.textContent : "";'
    )
    expect(headerText).toContain('로컬 MCP 서버')

    // Verify the filesystem server appears in the list and click it
    const serverFound = await vibe.evaluate<boolean>(
      'const srv = [...document.querySelectorAll("button")].find(b => b.textContent.includes("filesystem")); if (srv) { srv.click(); return true; } return false;'
    )
    expect(serverFound).toBe(true)

    await new Promise((r) => setTimeout(r, 500))

    // Verify the detail panel shows server name, running status, and tools
    const detailText = await vibe.evaluate<string>(
      'const el = document.querySelector("h4"); return el ? el.closest(".rounded-lg").textContent : "";'
    )
    expect(detailText).toContain('filesystem')
    expect(detailText).toContain('실행 중')
    expect(detailText).toContain('read_file')
    expect(detailText).toContain('도구')
  }, 60_000)
})
