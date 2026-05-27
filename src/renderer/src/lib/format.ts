// ── Bytes ──────────────────────────────────────────────────────────────────
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

// ── Dates ──────────────────────────────────────────────────────────────────
export function formatDate(value: string | number | null | undefined): string {
  if (!value) return '—'
  const d = new Date(typeof value === 'number' && value < 1e12 ? value * 1000 : value)
  if (isNaN(d.getTime())) return String(value)
  return d.toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })
}

export function formatDateShort(value: string | number | null | undefined): string {
  if (!value) return '—'
  const d = new Date(typeof value === 'number' && value < 1e12 ? value * 1000 : value)
  if (isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })
}

export function timeAgo(value: string | number): string {
  const d = new Date(typeof value === 'number' && value < 1e12 ? value * 1000 : value)
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000)
  if (seconds < 60)   return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400)return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

// ── Hex ────────────────────────────────────────────────────────────────────
export function toHex(n: number, pad = 2): string {
  return n.toString(16).toUpperCase().padStart(pad, '0')
}

export function hexDump(buf: number[], offset = 0, bytesPerRow = 16): string {
  const lines: string[] = []
  for (let i = 0; i < buf.length; i += bytesPerRow) {
    const row = buf.slice(i, i + bytesPerRow)
    const addr = toHex(offset + i, 8)
    const hex  = row.map((b) => toHex(b)).join(' ').padEnd(bytesPerRow * 3 - 1)
    const ascii = row.map((b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : '.')).join('')
    lines.push(`${addr}  ${hex}  ${ascii}`)
  }
  return lines.join('\n')
}

// ── Entropy ────────────────────────────────────────────────────────────────
export function entropyLabel(entropy: number): { label: string; color: string } {
  if (entropy > 7.5) return { label: 'Encrypted / Compressed', color: 'text-danger' }
  if (entropy > 6.5) return { label: 'High — Likely Compressed', color: 'text-warning' }
  if (entropy > 4.5) return { label: 'Medium', color: 'text-yellow-400' }
  return { label: 'Low — Plaintext / Sparse', color: 'text-success' }
}

// ── Numbers ────────────────────────────────────────────────────────────────
export function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}

// ── Hash truncation ────────────────────────────────────────────────────────
export function truncHash(hash: string, len = 16): string {
  if (!hash) return '—'
  if (hash.length <= len) return hash
  return `${hash.slice(0, len)}…`
}

// ── String truncation ─────────────────────────────────────────────────────
export function truncStr(s: string, len = 60): string {
  if (!s) return ''
  if (s.length <= len) return s
  return s.slice(0, len) + '…'
}
