import React from 'react'
import { HashRouter } from 'react-router-dom'
import Shell from './components/layout/Shell'
import { ToastProvider } from './components/ui/Toast'

export default function App(): React.JSX.Element {
  return (
    <HashRouter>
      <div className="dark">
        <ToastProvider>
          <Shell />
        </ToastProvider>
      </div>
    </HashRouter>
  )
}
