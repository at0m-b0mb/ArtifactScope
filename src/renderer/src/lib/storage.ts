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

// ── Pinned tools (sidebar favorites) ───────────────────────────────────────
const PINS_KEY = 'pinned-tools'
export function getPins(): string[] { return readLS<string[]>(PINS_KEY, []) }
export function togglePin(route: string): string[] {
  const list = getPins()
  const next = list.includes(route) ? list.filter(r => r !== route) : [...list, route]
  writeLS(PINS_KEY, next)
  window.dispatchEvent(new CustomEvent('artifactscope:pins-changed'))
  return next
}
export function isPinned(route: string): boolean { return getPins().includes(route) }

// ── Sidebar collapsed state ────────────────────────────────────────────────
const SIDEBAR_KEY = 'sidebar-collapsed'
export function getSidebarCollapsed(): boolean { return readLS<boolean>(SIDEBAR_KEY, false) }
export function setSidebarCollapsed(v: boolean): void { writeLS(SIDEBAR_KEY, v) }

// ── Case notes (per-case markdown-ish notepad) ─────────────────────────────
const NOTES_KEY = 'case-notes'
type NotesMap = Record<string, string>
export function getCaseNotes(caseId: string): string {
  return (readLS<NotesMap>(NOTES_KEY, {})[caseId]) ?? ''
}
export function setCaseNotes(caseId: string, body: string): void {
  const map = readLS<NotesMap>(NOTES_KEY, {})
  if (body.trim() === '') delete map[caseId]
  else map[caseId] = body
  writeLS(NOTES_KEY, map)
}

// ── Pending file (from global drop or palette → File Analyzer hand-off) ────
const PENDING_FILE_KEY = 'pending-file'
export function setPendingFile(path: string): void { writeLS(PENDING_FILE_KEY, path) }
export function consumePendingFile(): string | null {
  const v = readLS<string | null>(PENDING_FILE_KEY, null)
  if (v) removeLS(PENDING_FILE_KEY)
  return v
}
