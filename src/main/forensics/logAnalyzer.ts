import fs from 'fs'
import readline from 'readline'
import path from 'path'

export interface LogEntry {
  line_num: number
  raw: string
  timestamp: string | null
  level: 'debug' | 'info' | 'warning' | 'error' | 'critical' | 'unknown'
  source: string
  message: string
}

export interface LogAnalysisResult {
  file: string
  format: string
  total_lines: number
  entries: LogEntry[]
  stats: { level: string; count: number }[]
  earliest: string
  latest: string
}

const LEVEL_PATTERNS: [RegExp, LogEntry['level']][] = [
  [/\b(CRITICAL|FATAL|EMERGENCY)\b/i, 'critical'],
  [/\b(ERROR|ERR|SEVERE)\b/i, 'error'],
  [/\b(WARN(?:ING)?|ALERT)\b/i, 'warning'],
  [/\b(INFO(?:RMATION)?|NOTICE)\b/i, 'info'],
  [/\b(DEBUG|TRACE|VERBOSE)\b/i, 'debug'],
]

// Common timestamp patterns
const TS_PATTERNS = [
  /(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)/,
  /([A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})/,  // syslog: "Jan 15 12:34:56"
  /(\d{2}\/[A-Z][a-z]{2}\/\d{4}:\d{2}:\d{2}:\d{2})/,  // Apache: "10/Jan/2024:12:34:56"
  /(\d{2}[/-]\d{2}[/-]\d{4} \d{2}:\d{2}:\d{2})/,
]

function parseLevel(line: string): LogEntry['level'] {
  for (const [pat, level] of LEVEL_PATTERNS) {
    if (pat.test(line)) return level
  }
  return 'unknown'
}

function parseTimestamp(line: string): string | null {
  for (const pat of TS_PATTERNS) {
    const m = line.match(pat)
    if (m) {
      try {
        const d = new Date(m[1])
        if (!isNaN(d.getTime())) return d.toISOString()
      } catch { /* ignore */ }
      return m[1]
    }
  }
  return null
}

function detectFormat(sample: string[]): string {
  const joined = sample.join('\n')
  if (joined.includes('"GET ') || joined.includes('"POST ')) return 'Apache/Nginx Access Log'
  if (/\b[A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}/.test(joined)) return 'Syslog'
  if (joined.includes('{"') || joined.startsWith('[{')) return 'JSON Log'
  if (/\d{4}-\d{2}-\d{2}T/.test(joined)) return 'ISO Timestamp Log'
  if (joined.includes('[ERROR]') || joined.includes('[INFO]') || joined.includes('[WARN]')) return 'Bracketed Level Log'
  return 'Generic Text Log'
}

export async function analyzeLog(filePath: string): Promise<LogAnalysisResult> {
  const entries: LogEntry[] = []
  const levelCounts: Record<string, number> = {}
  const timestamps: string[] = []
  let lineNum = 0
  const sampleLines: string[] = []

  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: 'utf8' }),
  })

  for await (const raw of rl) {
    lineNum++
    if (sampleLines.length < 20) sampleLines.push(raw)
    if (lineNum > 100000) continue // Cap at 100k lines
    const level = parseLevel(raw)
    const timestamp = parseTimestamp(raw)
    if (timestamp) timestamps.push(timestamp)
    levelCounts[level] = (levelCounts[level] ?? 0) + 1

    // Parse source (hostname, process, etc.)
    const syslogMatch = raw.match(/^(?:\S+\s+\d+\s+[\d:]+\s+)?(\S+)\s+(\S+(?:\[\d+\])?):\s+(.*)$/)
    const source = syslogMatch ? `${syslogMatch[1]} ${syslogMatch[2]}` : path.basename(filePath)
    const message = syslogMatch ? syslogMatch[3] : raw.replace(/^.*?(?:\]|:|\s{2,})\s*/, '').slice(0, 500)

    entries.push({ line_num: lineNum, raw: raw.slice(0, 1000), timestamp, level, source, message })
  }

  const format = detectFormat(sampleLines)
  const stats = Object.entries(levelCounts).map(([level, count]) => ({ level, count }))
    .sort((a, b) => {
      const order = ['critical','error','warning','info','debug','unknown']
      return order.indexOf(a.level) - order.indexOf(b.level)
    })

  timestamps.sort()
  return {
    file: filePath,
    format,
    total_lines: lineNum,
    entries: entries.slice(0, 10000),
    stats,
    earliest: timestamps[0] ?? '',
    latest: timestamps[timestamps.length - 1] ?? '',
  }
}
