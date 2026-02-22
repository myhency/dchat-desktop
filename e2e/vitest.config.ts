import { defineConfig } from 'vitest/config'
import os from 'os'
import path from 'path'
import { createRequire } from 'module'

function resolveVibiumBin(): string {
  const require = createRequire(import.meta.url)
  const platform = os.platform()
  const arch = os.arch()
  const packageName = `@vibium/${platform}-${arch}`
  const binaryName = platform === 'win32' ? 'vibium.exe' : 'vibium'
  const packagePath = require.resolve(`${packageName}/package.json`)
  return path.join(path.dirname(packagePath), 'bin', binaryName)
}

export default defineConfig({
  test: {
    include: ['e2e/**/*.e2e.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    globalSetup: './e2e/global-setup.ts',
    env: {
      VIBIUM_BIN_PATH: resolveVibiumBin()
    }
  }
})
