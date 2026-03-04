import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from '@/shared/ui'
import { initConsoleBuffer } from '@/shared/lib/console-buffer'
import './styles/globals.css'

initConsoleBuffer()

window.addEventListener('error', (event) => {
  console.error('[global] Uncaught error:', event.error)
})
window.addEventListener('unhandledrejection', (event) => {
  console.error('[global] Unhandled rejection:', event.reason)
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
