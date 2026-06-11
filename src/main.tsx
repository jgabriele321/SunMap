import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// Path-based entry split: /USA serves the classic US county map, everything
// else the global globe. Lazy chunks keep each app's CSS and data separate.
const isUsa = /^\/usa\/?$/i.test(window.location.pathname)
const App = lazy(() => (isUsa ? import('./usa/UsApp') : import('./App')))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={null}>
      <App />
    </Suspense>
  </StrictMode>,
)
