import { lazy, Suspense } from 'react'
import { Analytics } from '@vercel/analytics/react'
import './styles.css'
import { Ritual2DView } from './view2d/Ritual2DView'

const mode: '2d' | '3d' = '2d'

const Legacy3DApp = lazy(async () => {
  const [{ RitualScene }, { useRitualMachine }, { RitualOverlay }, { activeTheme }] =
    await Promise.all([
      import('./scene/RitualScene'),
      import('./state/useRitualMachine'),
      import('./ui/RitualOverlay'),
      import('./theme/themes'),
    ])

  return {
    default: function Legacy3DAppComponent() {
      const ritual = useRitualMachine()

      return (
        <main className={`app-shell theme-${activeTheme.id}`}>
          <RitualScene snapshot={ritual.snapshot} onBegin={ritual.start} />
          <RitualOverlay
            question={ritual.question}
            setQuestion={ritual.setQuestion}
            snapshot={ritual.snapshot}
            onBegin={ritual.start}
            onReset={ritual.reset}
          />
        </main>
      )
    },
  }
})

function App() {
  if (mode === '2d') {
    return (
      <>
        <Ritual2DView />
        <Analytics />
      </>
    )
  }

  return (
    <>
      <Suspense fallback={<Ritual2DView />}>
        <Legacy3DApp />
      </Suspense>
      <Analytics />
    </>
  )
}

export default App
