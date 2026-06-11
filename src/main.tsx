import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// Path-based entry split: /USA serves the classic US county map, everything
// else the global globe. Lazy chunks keep each app's CSS and data separate.
// NOTE: the two import() calls must stay in separate lazy() callsites —
// sharing one ternary expression makes Vite's preload helper attach the
// wrong chunk's CSS.
const isUsa = /^\/usa\/?$/i.test(window.location.pathname)
const GlobeApp = lazy(() => import('./App'))
const UsaApp = lazy(() => import('./usa/UsApp'))
const App = isUsa ? UsaApp : GlobeApp

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={null}>
      <App />
    </Suspense>
  </StrictMode>,
)
