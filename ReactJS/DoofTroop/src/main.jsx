import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@livekit/components-styles'
import './styles/global.css'
import App from './app/App.jsx'
import { installSfxUnlock } from './shared/audio/index.js'
import { installRuntimeManifest } from './shared/dom/installRuntimeManifest.js'
import { installVisualViewportShell } from './shared/dom/visualViewportShell.js'
import { normalizeLaunchUrl } from './shared/dom/normalizeLaunchUrl.js'

normalizeLaunchUrl()
installSfxUnlock()
installRuntimeManifest()

const root = document.getElementById('root')

if (!root) {
  throw new Error('Root element #root not found')
}

installVisualViewportShell(root)

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
