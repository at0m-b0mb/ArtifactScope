import React from 'react'
import { HashRouter } from 'react-router-dom'
import Shell from './components/layout/Shell'
import { ToastProvider } from './components/ui/Toast'
import { ErrorBoundary } from './components/ErrorBoundary'

export default function App(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <HashRouter>
        <div className="dark">
          <ToastProvider>
            <Shell />
          </ToastProvider>
        </div>
      </HashRouter>
    </ErrorBoundary>
  )
}
