import { spawn, type ChildProcess } from 'child_process'

let devProcess: ChildProcess | null = null

async function waitForServer(url: string, timeoutMs = 30_000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      // server not ready yet
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`)
}

export async function setup() {
  devProcess = spawn('npm', ['run', 'dev'], {
    cwd: process.cwd(),
    stdio: 'pipe',
    shell: true,
    detached: true
  })

  devProcess.stderr?.on('data', (data: Buffer) => {
    const msg = data.toString()
    if (msg.includes('ERROR')) console.error('[dev]', msg)
  })

  // Wait for backend health + frontend dev server
  await waitForServer('http://localhost:3131/api/health')
  await waitForServer('http://localhost:5173')
}

export async function teardown() {
  if (devProcess?.pid) {
    // Kill the process group (npm spawns child processes)
    process.kill(-devProcess.pid, 'SIGTERM')
    devProcess = null
  }
}
