import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/fredoka/latin-500.css'
import '@fontsource/fredoka/latin-ext-500.css'
import '@fontsource/fredoka/latin-600.css'
import '@fontsource/fredoka/latin-ext-600.css'
import '@fontsource/fredoka/latin-700.css'
import '@fontsource/fredoka/latin-ext-700.css'
import '@fontsource/pacifico/latin-400.css'
import '@fontsource/pacifico/latin-ext-400.css'
import { bindInstallPrompt } from './install.ts'
import App from './App.tsx'
import './styles.css'

bindInstallPrompt()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(async (registration) => {
        const ready = await navigator.serviceWorker.ready
        const urls = [
          location.href,
          ...performance.getEntriesByType('resource').map((entry) => entry.name),
        ].filter((url) => url.startsWith(location.origin))
        ready.active?.postMessage({ type: 'cache-urls', urls })
        return registration
      })
      .catch(() => {})
  })
}
