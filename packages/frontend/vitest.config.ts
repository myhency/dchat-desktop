import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@dchat/shared': path.resolve(__dirname, '../shared/src/index.ts'),
      '@dchat/shared/*': path.resolve(__dirname, '../shared/src/*')
    }
  },
  test: {
    globals: true,
    environment: 'jsdom'
  }
})
