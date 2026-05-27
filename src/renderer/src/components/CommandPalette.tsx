import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, ArrowRight, LayoutDashboard, FolderKanban, FileSearch, Image, AlignLeft, Archive,
  Globe, Monitor, BookKey, Mail, FileText, Network, Clock3, HardDrive, Hash, FileOutput,
  Activity, Settings, Database, HelpCircle, Sparkles,
} from 'lucide-react'
import { useUIStore } from '../stores/uiStore'
import { Kbd } from './ui/Kbd'
import { cn } from '../lib/cn'

interface Command {
  id: string
  label: string
  hint?: string
  group: string
  icon: React.ComponentType<{ className?: string }>
  keywords?: string
  run: () => void
}

const PAGES: Array<Pick<Command, 'id' | 'label' | 'group' | 'icon' | 'hint'> & { to: string; keywords: string }> = [
  { id: 'go-dashboard',  label: 'Go to Dashboard',         group: 'Navigate', icon: LayoutDashboard, to: '/dashboard',       hint: 'g d', keywords: 'home overview' },
  { id: 'go-cases',      label: 'Go to Cases',             group: 'Navigate', icon: FolderKanban,    to: '/cases',           hint: 'g c', keywords: 'investigations' },
  { id: 'go-activity',   label: 'Go to Activity Log',      group: 'Navigate', icon: Activity,        to: '/activity',        hint: 'g a', keywords: 'audit history' },
  { id: 'go-file',       label: 'Analyze File',            group: 'Analyze',  icon: FileSearch,      to: '/file-analyzer',   hint: 'g f', keywords: 'hash entropy magic strings' },
  { id: 'go-image',      label: 'Image Forensics',         group: 'Analyze',  icon: Image,           to: '/image-forensics', keywords: 'exif gps photo' },
  { id: 'go-strings',    label: 'Strings / IOC Hunter',    group: 'Analyze',  icon: AlignLeft,       to: '/strings',         keywords: 'ioc regex indicator' },
  { id: 'go-archive',    label: 'Archive Analyzer',        group: 'Analyze',  icon: Archive,         to: '/archive',         keywords: 'zip tar' },
  { id: 'go-browser',    label: 'Browser Artifacts',       group: 'Artifacts',icon: Globe,           to: '/browser',         keywords: 'history downloads cookies' },
  { id: 'go-system',     label: 'System Info',             group: 'Artifacts',icon: Monitor,         to: '/system',          keywords: 'live cpu memory process' },
  { id: 'go-registry',   label: 'Registry Analyzer',       group: 'Artifacts',icon: BookKey,         to: '/registry',        keywords: 'windows hive' },
  { id: 'go-email',      label: 'Email Analyzer',          group: 'Artifacts',icon: Mail,            to: '/email',           keywords: 'eml msg headers' },
  { id: 'go-log',        label: 'Log Analyzer',            group: 'Investigate', icon: FileText,     to: '/log-analyzer',    keywords: 'syslog access auth' },
  { id: 'go-network',    label: 'Network / PCAP',          group: 'Investigate', icon: Network,      to: '/network',         keywords: 'pcap packets' },
  { id: 'go-timeline',   label: 'Filesystem Timeline',     group: 'Investigate', icon: Clock3,       to: '/timeline',        keywords: 'mac time' },
  { id: 'go-sqlite',     label: 'SQLite Browser',          group: 'Investigate', icon: Database,     to: '/sqlite',          keywords: 'db query' },
  { id: 'go-disk',       label: 'Disk Image',              group: 'Investigate', icon: HardDrive,    to: '/disk-image',      keywords: 'raw image partition' },
  { id: 'go-hashdb',     label: 'Hash Database',           group: 'Manage',   icon: Hash,            to: '/hash-db',         hint: 'g h', keywords: 'known good bad' },
  { id: 'go-reports',    label: 'Reports',                 group: 'Manage',   icon: FileOutput,      to: '/reports',         keywords: 'pdf export' },
  { id: 'go-settings',   label: 'Settings',                group: 'Manage',   icon: Settings,        to: '/settings',        hint: 'g s', keywords: 'preferences theme' },
]

function fuzzyScore(query: string, text: string): number {
  if (!query) return 1
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  if (t === q)        return 1000
  if (t.startsWith(q))return 500
  if (t.includes(q))  return 200
  let ti = 0, score = 0, lastMatch = -1
  for (const ch of q) {
    const idx = t.indexOf(ch, ti)
    if (idx === -1) return 0
    score += 10 - Math.min(8, idx - lastMatch - 1)
    lastMatch = idx
    ti = idx + 1
  }
  return score
}

export function CommandPalette(): React.ReactPortal | null {
  const navigate = useNavigate()
  const { paletteOpen, setPaletteOpen, setHelpOpen } = useUIStore()
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const commands: Command[] = useMemo(() => {
    const base: Command[] = PAGES.map(p => ({
      id: p.id, label: p.label, group: p.group, icon: p.icon, hint: p.hint, keywords: p.keywords,
      run: () => navigate(p.to),
    }))
    base.push({
      id: 'show-help', label: 'Keyboard Shortcuts', group: 'Help', icon: HelpCircle,
      hint: '?', keywords: 'shortcuts cheatsheet keys',
      run: () => setHelpOpen(true),
    })
    base.push({
      id: 'whats-new', label: "What's new in ArtifactScope", group: 'Help', icon: Sparkles,
      keywords: 'release notes changelog',
      run: () => navigate('/settings'),
    })
    return base
  }, [navigate, setHelpOpen])

  const filtered = useMemo(() => {
    const q = query.trim()
    if (!q) return commands
    return commands
      .map(c => ({ c, s: Math.max(fuzzyScore(q, c.label), fuzzyScore(q, c.keywords ?? '') / 2) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map(x => x.c)
  }, [commands, query])

  useEffect(() => { if (paletteOpen) setTimeout(() => inputRef.current?.focus(), 20) }, [paletteOpen])
  useEffect(() => { setIndex(0) }, [query, paletteOpen])
  useEffect(() => {
    if (!paletteOpen) setQuery('')
  }, [paletteOpen])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndex(i => Math.min(filtered.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex(i => Math.max(0, i - 1)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      const cmd = filtered[index]
      if (cmd) { cmd.run(); setPaletteOpen(false) }
    }
  }

  useEffect(() => {
    if (!listRef.current) return
    const active = listRef.current.querySelector<HTMLElement>(`[data-cmd-index="${index}"]`)
    active?.scrollIntoView({ block: 'nearest' })
  }, [index])

  const grouped = useMemo(() => {
    const map = new Map<string, Command[]>()
    filtered.forEach(c => {
      if (!map.has(c.group)) map.set(c.group, [])
      map.get(c.group)!.push(c)
    })
    return map
  }, [filtered])

  return createPortal(
    <AnimatePresence>
      {paletteOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-[110] flex items-start justify-center p-4 pt-[15vh] bg-black/60 backdrop-blur-sm"
          onClick={() => setPaletteOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-surface-2 border border-surface-4 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-4">
              <Search className="w-4 h-4 text-muted" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search tools, jump anywhere…"
                className="flex-1 bg-transparent text-sm text-white placeholder:text-muted focus:outline-none"
              />
              <Kbd keys="esc" size="xs" />
            </div>
            <div ref={listRef} className="max-h-[55vh] overflow-y-auto py-2">
              {filtered.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <Search className="w-6 h-6 text-muted mx-auto mb-2" />
                  <p className="text-sm text-muted">No matches for "{query}"</p>
                </div>
              ) : (
                Array.from(grouped.entries()).map(([group, items]) => (
                  <div key={group} className="mb-1">
                    <div className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">{group}</div>
                    {items.map((cmd) => {
                      const i = filtered.indexOf(cmd)
                      const Icon = cmd.icon
                      return (
                        <button
                          key={cmd.id}
                          data-cmd-index={i}
                          onMouseEnter={() => setIndex(i)}
                          onClick={() => { cmd.run(); setPaletteOpen(false) }}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-2 text-left transition-colors',
                            i === index ? 'bg-primary-600/20' : 'hover:bg-surface-3'
                          )}
                        >
                          <Icon className={cn('w-4 h-4 flex-shrink-0', i === index ? 'text-primary-400' : 'text-muted')} />
                          <span className={cn('text-sm flex-1 truncate', i === index ? 'text-white' : 'text-gray-200')}>{cmd.label}</span>
                          {cmd.hint && <Kbd keys={cmd.hint} size="xs" />}
                          {i === index && <ArrowRight className="w-3.5 h-3.5 text-primary-400" />}
                        </button>
                      )
                    })}
                  </div>
                ))
              )}
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-2 border-t border-surface-4 text-[10px] text-muted">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><Kbd keys="up" size="xs" /><Kbd keys="down" size="xs" />Navigate</span>
                <span className="flex items-center gap-1"><Kbd keys="enter" size="xs" />Open</span>
              </div>
              <span>{filtered.length} result{filtered.length === 1 ? '' : 's'}</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
