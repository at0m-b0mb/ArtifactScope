import React from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { Badge } from './ui/Badge'
import { type WatchMatch, SEVERITY_VARIANT } from '../lib/watchlist'

interface Props {
  matches: WatchMatch[]
}

/** Surfaces watchlist hits prominently inside an analyzer page. */
export function WatchlistBanner({ matches }: Props): React.JSX.Element | null {
  const navigate = useNavigate()
  if (matches.length === 0) return null

  const top = matches[0]
  const highest = matches.reduce((acc, m) =>
    severityRank(m.item.severity) > severityRank(acc) ? m.item.severity : acc,
    matches[0].item.severity,
  )

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border-l-4 ${highest === 'critical' || highest === 'high'
      ? 'bg-danger/10 border-danger border-l-danger'
      : highest === 'medium'
      ? 'bg-warning/10 border-warning/30 border-l-warning'
      : 'bg-accent-500/10 border-accent-500/30 border-l-accent-500'
    }`}>
      <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
        highest === 'critical' || highest === 'high' ? 'text-danger'
        : highest === 'medium' ? 'text-warning'
        : 'text-accent-400'
      }`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${
          highest === 'critical' || highest === 'high' ? 'text-danger'
          : highest === 'medium' ? 'text-warning'
          : 'text-accent-300'
        }`}>
          Watchlist match — {matches.length} indicator{matches.length === 1 ? '' : 's'} hit
        </p>
        <p className="text-xs text-muted mt-0.5">
          <Badge variant={SEVERITY_VARIANT[top.item.severity]} className="text-[10px] mr-1.5">{top.item.severity}</Badge>
          {top.item.label} — matched <span className="font-mono select-all">{top.matched.slice(0, 64)}</span>
          {matches.length > 1 && <span className="text-muted ml-2">(+{matches.length - 1} more)</span>}
        </p>
      </div>
      <button
        onClick={() => navigate('/watchlist')}
        className="flex items-center gap-1 text-xs text-muted hover:text-white transition-colors flex-shrink-0"
      >
        Manage
        <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  )
}

function severityRank(s: string): number {
  return s === 'critical' ? 4 : s === 'high' ? 3 : s === 'medium' ? 2 : 1
}
