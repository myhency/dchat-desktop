import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      sourcemap: true,
      lib: {
        entry: resolve(__dirname, 'src/main.ts')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      sourcemap: true,
      lib: {
        entry: resolve(__dirname, 'src/preload.ts')
      }
    }
  },
  renderer: {
    root: resolve(__dirname, '../frontend'),
    css: {
      postcss: resolve(__dirname, '../frontend')
    },
    build: {
      sourcemap: true,
      rollupOptions: {
        input: resolve(__dirname, '../frontend/index.html')
      }
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, '../frontend/src')
      }
    },
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3131',
          changeOrigin: true
        }
      }
    }
  }
})
