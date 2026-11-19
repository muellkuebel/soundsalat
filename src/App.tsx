import { Component, type ReactNode } from 'react'
import { getEngine } from './audio/engine.ts'
import { Editor } from './components/Editor.tsx'
import { Home } from './components/Home.tsx'
import { Logo } from './components/Logo.tsx'
import { StoreProvider, useStore } from './store.tsx'

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (this.state.failed) {
      return <div className="crash">Soundsalat ist gestolpert. Bitte lade die Seite neu.</div>
    }
    return this.props.children
  }
}

function Shell() {
  const store = useStore()
  return (
    <div
      className="app"
      onPointerDown={() => {
        try {
          getEngine().unlock()
        } catch {
          /* audio starts on the next tap */
        }
      }}
    >
      <div className="doodle" aria-hidden="true" />
      <div className="app-content">
        {!store.ready ? (
          <div className="splash">
            <Logo />
          </div>
        ) : store.editorId ? (
          <Editor projectId={store.editorId} />
        ) : (
          <Home />
        )}
        <div className="rotate-hint">Drehe das Tablet quer.</div>
        {store.toast ? <div className="toast">{store.toast}</div> : null}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Boundary>
      <StoreProvider>
        <Shell />
      </StoreProvider>
    </Boundary>
  )
}
