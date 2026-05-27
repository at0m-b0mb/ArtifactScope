import React, { useMemo } from 'react'

interface Activity { timestamp: string | number }
interface Props {
  activities: Activity[]
  days?: number
  className?: string
}

/** Compact GitHub-style 7×N heatmap of activity per day. */
export function ActivityHeatmap({ activities, days = 35, className }: Props): React.JSX.Element {
  const data = useMemo(() => {
    const buckets = new Map<string, number>()
    for (const a of activities) {
      const d = new Date(a.timestamp)
      if (isNaN(d.getTime())) continue
      const key = d.toISOString().slice(0, 10)
      buckets.set(key, (buckets.get(key) ?? 0) + 1)
    }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const list: { date: Date; key: string; count: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      list.push({ date: d, key, count: buckets.get(key) ?? 0 })
    }
    const max = Math.max(1, ...list.map(x => x.count))
    return { list, max }
  }, [activities, days])

  // Group into columns of 7 days each (weeks)
  const weeks: { date: Date; key: string; count: number }[][] = []
  for (let i = 0; i < data.list.length; i += 7) {
    weeks.push(data.list.slice(i, i + 7))
  }

  function intensity(count: number): string {
    if (count === 0) return 'bg-surface-3/60'
    const pct = count / data.max
    if (pct > 0.75) return 'bg-primary-500'
    if (pct > 0.5)  return 'bg-primary-600'
    if (pct > 0.25) return 'bg-primary-700/80'
    return 'bg-primary-700/40'
  }

  const total = data.list.reduce((a, b) => a + b.count, 0)
  const activeDays = data.list.filter(x => x.count > 0).length

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted">
          {total} action{total === 1 ? '' : 's'} over {days} days · {activeDays} active day{activeDays === 1 ? '' : 's'}
        </p>
        <div className="flex items-center gap-1 text-[10px] text-muted">
          <span>less</span>
          <span className="w-2 h-2 rounded-sm bg-surface-3/60" />
          <span className="w-2 h-2 rounded-sm bg-primary-700/40" />
          <span className="w-2 h-2 rounded-sm bg-primary-700/80" />
          <span className="w-2 h-2 rounded-sm bg-primary-600" />
          <span className="w-2 h-2 rounded-sm bg-primary-500" />
          <span>more</span>
        </div>
      </div>
      <div className="flex gap-1">
        {weeks.map((w, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {w.map((day) => (
              <div
                key={day.key}
                title={`${day.key} — ${day.count} action${day.count === 1 ? '' : 's'}`}
                className={`w-3 h-3 rounded-sm transition-transform hover:scale-125 ${intensity(day.count)}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
