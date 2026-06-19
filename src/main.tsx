import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// Path-based entry split: /USA serves the classic US county map, /temp the
// temperature globe, everything else the sunset globe. Lazy chunks keep each
// app's CSS and data separate.
// NOTE: each route must be its own separate lazy() callsite — sharing one
// ternary import() expression makes Vite's preload helper attach the wrong
// chunk's CSS.
const path = window.location.pathname
const GlobeApp = lazy(() => import('./App'))
const UsaApp = lazy(() => import('./usa/UsApp'))
const TempApp = lazy(() => import('./temp/TempApp'))

const App = /^\/usa\/?$/i.test(path)
  ? UsaApp
  : /^\/temp\/?$/i.test(path)
    ? TempApp
    : GlobeApp

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={null}>
      <App />
    </Suspense>
  </StrictMode>,
)
