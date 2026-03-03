import { defineConfig } from 'vitest/config'
import path from 'path'
import os from 'os'
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
  resolve: {
    alias: {
      '@dchat/shared': path.resolve(__dirname, '../packages/shared/src/index.ts'),
      '@dchat/shared/*': path.resolve(__dirname, '../packages/shared/src/*')
    }
  },
  test: {
    include: ['perf/**/*.test.ts'],
    testTimeout: 120_000,
    pool: 'forks',
    globalSetup: './perf/global-setup.ts',
    env: {
      VIBIUM_BIN_PATH: resolveVibiumBin()
    }
  }
})
