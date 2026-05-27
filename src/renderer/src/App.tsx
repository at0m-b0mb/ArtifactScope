import React from 'react'
import { HashRouter } from 'react-router-dom'
import Shell from './components/layout/Shell'
import { Toaster } from './components/ui/Toast'

export default function App(): React.JSX.Element {
  return (
    <HashRouter>
      <div className="dark">
        <Shell />
        <Toaster />
      </div>
    </HashRouter>
  )
}
