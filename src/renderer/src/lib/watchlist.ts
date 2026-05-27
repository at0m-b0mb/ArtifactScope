// Watchlist: user-defined indicators (hashes, IPs, domains, regexes) that
// raise alerts when they appear in analysis. Stored entirely client-side.

import { readLS, writeLS } from './storage'

export type WatchType = 'hash' | 'ip' | 'domain' | 'url' | 'regex' | 'string'
export type Severity = 'low' | 'medium' | 'high' | 'critical'

export interface WatchItem {
  id: string
  type: WatchType
  value: string         // hash digest, IP, domain, URL, regex source, or literal string
  label: string         // human description
  severity: Severity
  notes?: string
  added_at: number
  last_hit_at?: number
  hit_count: number
}

const KEY = 'watchlist'

export function getWatchlist(): WatchItem[] {
  return readLS<WatchItem[]>(KEY, [])
}

export function saveWatchlist(items: WatchItem[]): void {
  writeLS(KEY, items)
  window.dispatchEvent(new CustomEvent('artifactscope:watchlist-changed'))
}

export function addWatchItem(input: Omit<WatchItem, 'id' | 'added_at' | 'hit_count'>): WatchItem {
  const id = `${input.type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const item: WatchItem = { ...input, id, added_at: Date.now(), hit_count: 0 }
  saveWatchlist([item, ...getWatchlist()])
  return item
}

export function removeWatchItem(id: string): void {
  saveWatchlist(getWatchlist().filter(i => i.id !== id))
}

export function recordHit(itemId: string): void {
  const list = getWatchlist()
  const idx = list.findIndex(i => i.id === itemId)
  if (idx < 0) return
  list[idx] = { ...list[idx], hit_count: list[idx].hit_count + 1, last_hit_at: Date.now() }
  saveWatchlist(list)
}

// ── Matching ───────────────────────────────────────────────────────────────

export interface MatchContext {
  hashes?: string[]      // any number of hash digests to check (case-insensitive)
  text?: string          // free text to match IPs / domains / URLs / regexes / strings against
}

export interface WatchMatch {
  item: WatchItem
  matched: string        // the specific value/substring that triggered the match
}

/** Returns an empty array if nothing matched. Also bumps hit counters. */
export function checkWatchlist(ctx: MatchContext): WatchMatch[] {
  const items = getWatchlist()
  if (items.length === 0) return []
  const matches: WatchMatch[] = []
  const lowerHashes = (ctx.hashes ?? []).map(h => h.toLowerCase())
  const text = ctx.text ?? ''

  for (const item of items) {
    if (item.type === 'hash') {
      const v = item.value.toLowerCase()
      if (lowerHashes.includes(v)) matches.push({ item, matched: item.value })
      continue
    }
    if (!text) continue
    if (item.type === 'ip' || item.type === 'domain' || item.type === 'url' || item.type === 'string') {
      if (text.toLowerCase().includes(item.value.toLowerCase())) matches.push({ item, matched: item.value })
      continue
    }
    if (item.type === 'regex') {
      try {
        const re = new RegExp(item.value, 'i')
        const m = re.exec(text)
        if (m) matches.push({ item, matched: m[0] })
      } catch {
        // invalid regex — skip silently
      }
      continue
    }
  }
  for (const m of matches) recordHit(m.item.id)
  return matches
}

export const SEVERITY_VARIANT: Record<Severity, 'info' | 'warning' | 'danger'> = {
  low: 'info',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
}
