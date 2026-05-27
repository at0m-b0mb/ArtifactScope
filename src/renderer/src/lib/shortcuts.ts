// Lightweight keyboard shortcut helpers.
// We use a single document keydown listener composed in Shell.

export type Modifier = 'mod' | 'shift' | 'alt'

export interface Shortcut {
  id: string
  keys: string            // canonical form: e.g. "mod+k", "?", "g d"
  label: string           // human-readable description
  category: string
  // If true, fires even inside inputs/textareas
  global?: boolean
  run: () => void
}

export function isMac(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Mac|iPhone|iPad/.test(navigator.platform) || /Mac/.test(navigator.userAgent)
}

// Pretty-printed key chips per platform
export function prettyKeys(keys: string): string[] {
  const mac = isMac()
  return keys.split(/\s+/).flatMap(token => token.split('+')).map(part => {
    const p = part.toLowerCase()
    if (p === 'mod')   return mac ? '⌘' : 'Ctrl'
    if (p === 'shift') return mac ? '⇧' : 'Shift'
    if (p === 'alt')   return mac ? '⌥' : 'Alt'
    if (p === 'enter') return '↵'
    if (p === 'esc')   return 'Esc'
    if (p === 'up')    return '↑'
    if (p === 'down')  return '↓'
    if (p === 'left')  return '←'
    if (p === 'right') return '→'
    if (p.length === 1) return part.toUpperCase()
    return part.charAt(0).toUpperCase() + part.slice(1)
  })
}

// ── Event matching ─────────────────────────────────────────────────────────
function eventToToken(e: KeyboardEvent): string {
  const parts: string[] = []
  const mod = isMac() ? e.metaKey : e.ctrlKey
  if (mod) parts.push('mod')
  if (e.shiftKey) parts.push('shift')
  if (e.altKey)   parts.push('alt')
  let key = e.key
  if (key === ' ') key = 'space'
  if (key.length === 1) key = key.toLowerCase()
  parts.push(key)
  return parts.join('+')
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

// Sequence support: handles "g d" style two-key navigation.
const sequence: { lastKey: string; at: number } = { lastKey: '', at: 0 }
const SEQ_WINDOW_MS = 800

function tokenMatchesShortcut(token: string, shortcut: Shortcut, e: KeyboardEvent): boolean {
  const target = shortcut.keys.toLowerCase()
  // Single-key shortcut (e.g. "?", "/", "mod+k")
  if (!target.includes(' ')) return token === target
  // Two-key sequence (e.g. "g d")
  const [a, b] = target.split(/\s+/)
  if (e.key.toLowerCase() === a) {
    sequence.lastKey = a
    sequence.at = Date.now()
    return false
  }
  if (sequence.lastKey === a && Date.now() - sequence.at < SEQ_WINDOW_MS && e.key.toLowerCase() === b) {
    sequence.lastKey = ''
    return true
  }
  return false
}

export function attachShortcuts(shortcuts: Shortcut[]): () => void {
  const handler = (e: KeyboardEvent) => {
    const token = eventToToken(e)
    const typing = isTypingTarget(e.target)
    for (const s of shortcuts) {
      if (typing && !s.global) continue
      if (tokenMatchesShortcut(token, s, e)) {
        e.preventDefault()
        s.run()
        return
      }
    }
  }
  document.addEventListener('keydown', handler)
  return () => document.removeEventListener('keydown', handler)
}
