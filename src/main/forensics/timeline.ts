import fs from 'fs'
import path from 'path'

export interface TimelineEntry {
  path: string
  name: string
  size: number
  extension: string
  mtime: string
  atime: string
  ctime: string
  birthtime: string
  is_dir: boolean
}

export interface TimelineResult {
  root: string
  total: number
  entries: TimelineEntry[]
  heatmap: { date: string; count: number }[]
}

const MAX_FILES = 50000

export function buildTimeline(dirPath: string): TimelineResult {
  const entries: TimelineEntry[] = []

  function walk(dir: string, depth = 0): void {
    if (depth > 10 || entries.length >= MAX_FILES) return
    let items: string[]
    try { items = fs.readdirSync(dir) } catch { return }

    for (const item of items) {
      if (entries.length >= MAX_FILES) return
      const full = path.join(dir, item)
      try {
        const stat = fs.statSync(full)
        entries.push({
          path: full,
          name: item,
          size: stat.size,
          extension: stat.isFile() ? path.extname(item).toLowerCase().replace('.', '') : '',
          mtime: stat.mtime.toISOString(),
          atime: stat.atime.toISOString(),
          ctime: stat.ctime.toISOString(),
          birthtime: stat.birthtime.toISOString(),
          is_dir: stat.isDirectory(),
        })
        if (stat.isDirectory()) walk(full, depth + 1)
      } catch { /* skip permission errors */ }
    }
  }

  walk(dirPath)
  entries.sort((a, b) => b.mtime.localeCompare(a.mtime))

  // Build heatmap (count by date)
  const dateCounts: Record<string, number> = {}
  for (const e of entries) {
    const date = e.mtime.slice(0, 10)
    dateCounts[date] = (dateCounts[date] ?? 0) + 1
  }
  const heatmap = Object.entries(dateCounts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return { root: dirPath, total: entries.length, entries: entries.slice(0, 10000), heatmap }
}

export function timelineToCSV(result: TimelineResult): string {
  const header = 'path,name,size,extension,mtime,atime,ctime,birthtime,is_dir'
  const rows = result.entries.map(e =>
    [e.path, e.name, e.size, e.extension, e.mtime, e.atime, e.ctime, e.birthtime, e.is_dir]
      .map(v => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  )
  return [header, ...rows].join('\n')
}
