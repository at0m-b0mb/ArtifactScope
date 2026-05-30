import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 bg-surface-0">
          <div className="w-16 h-16 rounded-2xl bg-danger/10 border border-danger/30 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-danger" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-sm text-muted text-center max-w-md mb-1">
            An unexpected error occurred. Your data is safe.
          </p>
          <pre className="text-xs text-danger/80 font-mono bg-surface-2 rounded-lg px-4 py-2 mt-2 max-w-lg overflow-auto max-h-32 border border-surface-4">
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.hash = '#/dashboard'
              window.location.reload()
            }}
            className="mt-6 flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Application
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
