// Lightweight localStorage helpers for UI preferences and recents.
// All renderer-only state; persistent server state stays in SQLite via main.

const PREFIX = 'artifactscope:'

export function readLS<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(PREFIX + key)
    if (v == null) return fallback
    return JSON.parse(v) as T
  } catch {
    return fallback
  }
}

export function writeLS<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // quota or serialization error — ignore
  }
}

export function removeLS(key: string): void {
  try { localStorage.removeItem(PREFIX + key) } catch { /* noop */ }
}

// ── Recent files (path + label) ────────────────────────────────────────────
export interface RecentFile {
  path: string
  label: string
  kind: string         // 'file' | 'image' | 'pcap' | 'eml' | …
  page: string         // route to reopen with
  at: number           // ms
}

const RECENT_KEY = 'recent-files'
const RECENT_LIMIT = 12

export function recentFiles(): RecentFile[] {
  return readLS<RecentFile[]>(RECENT_KEY, [])
}

export function pushRecentFile(entry: Omit<RecentFile, 'at'>): void {
  const next: RecentFile = { ...entry, at: Date.now() }
  const list = recentFiles().filter(r => r.path !== next.path)
  list.unshift(next)
  writeLS(RECENT_KEY, list.slice(0, RECENT_LIMIT))
  window.dispatchEvent(new CustomEvent('artifactscope:recents-changed'))
}

export function clearRecentFiles(): void {
  writeLS(RECENT_KEY, [])
  window.dispatchEvent(new CustomEvent('artifactscope:recents-changed'))
}

// ── Recent pages (for quick navigation) ────────────────────────────────────
const RECENT_PAGES_KEY = 'recent-pages'
const RECENT_PAGES_LIMIT = 8

export function recentPages(): string[] {
  return readLS<string[]>(RECENT_PAGES_KEY, [])
}

export function pushRecentPage(route: string): void {
  if (route === '/' || route.startsWith('/dashboard')) return
  const list = recentPages().filter(p => p !== route)
  list.unshift(route)
  writeLS(RECENT_PAGES_KEY, list.slice(0, RECENT_PAGES_LIMIT))
}

// ── First-run flag ─────────────────────────────────────────────────────────
const WELCOMED_KEY = 'welcomed'
export function hasBeenWelcomed(): boolean { return readLS<boolean>(WELCOMED_KEY, false) }
export function markWelcomed(): void { writeLS(WELCOMED_KEY, true) }

// ── Accent color ───────────────────────────────────────────────────────────
export type Accent = 'purple' | 'cyan' | 'emerald' | 'rose' | 'amber'
const ACCENT_KEY = 'accent'
export function getAccent(): Accent { return readLS<Accent>(ACCENT_KEY, 'purple') }
export function setAccent(a: Accent): void {
  writeLS(ACCENT_KEY, a)
  applyAccent(a)
  window.dispatchEvent(new CustomEvent('artifactscope:accent-changed'))
}

export function applyAccent(a: Accent): void {
  // The actual color palette is selected via CSS attribute selectors in globals.css.
  document.documentElement.dataset.accent = a
}

// ── UI density ─────────────────────────────────────────────────────────────
const DENSITY_KEY = 'density'
export type Density = 'cozy' | 'compact'
export function getDensity(): Density { return readLS<Density>(DENSITY_KEY, 'cozy') }
export function setDensity(d: Density): void {
  writeLS(DENSITY_KEY, d)
  document.documentElement.dataset.density = d
}
