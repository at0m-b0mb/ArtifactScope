import React, { useState } from 'react'
import { Sparkles, Keyboard } from 'lucide-react'
import { Dialog } from './ui/Dialog'
import { Kbd } from './ui/Kbd'
import { useUIStore } from '../stores/uiStore'
import { cn } from '../lib/cn'

interface Row { keys: string; label: string }
interface Section { title: string; rows: Row[] }

const SECTIONS: Section[] = [
  {
    title: 'General',
    rows: [
      { keys: 'mod+k',  label: 'Open command palette' },
      { keys: '?',      label: 'Show this help' },
      { keys: 'esc',    label: 'Close dialog or palette' },
    ],
  },
  {
    title: 'Navigate',
    rows: [
      { keys: 'g d', label: 'Go to Dashboard' },
      { keys: 'g c', label: 'Go to Cases' },
      { keys: 'g a', label: 'Go to Activity Log' },
      { keys: 'g f', label: 'Go to File Analyzer' },
      { keys: 'g h', label: 'Go to Hash Database' },
      { keys: 'g t', label: 'Go to Timeline' },
      { keys: 'g s', label: 'Go to Settings' },
    ],
  },
  {
    title: 'Workflow',
    rows: [
      { keys: 'drop file', label: 'Drop a file anywhere → open in File Analyzer' },
      { keys: 'star icon', label: 'Pin a tool to the sidebar top' },
      { keys: '/',         label: 'Focus search / filter (where available)' },
    ],
  },
]

interface ChangelogEntry {
  version: string
  date: string
  highlights: string[]
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.2.0',
    date: 'Current',
    highlights: [
      'Pinned tools — star any tool to lock it to the top of the sidebar',
      'Drop a file anywhere in the app → opens in File Analyzer instantly',
      'Hash DB batch lookup now shows a real results table with CSV export',
      'Per-case Notes panel with auto-save (markdown-friendly)',
      'Sidebar collapse state now persists across sessions',
    ],
  },
  {
    version: '1.1.0',
    date: 'Previous',
    highlights: [
      'Command palette with fuzzy search (⌘K / Ctrl+K)',
      'Keyboard shortcut system with vim-style `g d` / `g c` nav',
      'Welcome / onboarding modal on first run',
      'Recent files widget on the dashboard',
      'CSV / JSON export utility across major data views',
      'Runtime accent color picker + density toggle',
      'Loading skeletons replace bare “Loading…” text',
    ],
  },
  {
    version: '1.0.0',
    date: 'Initial',
    highlights: [
      '19 forensic analyzers — file, image, log, PCAP, registry, email, archive, SQLite, disk image, …',
      'Tamper-evident chain-of-custody and activity log (hash-chained)',
      'Local Hash Database with NSRL-compatible CSV import',
      'PDF report generation per case',
    ],
  },
]

export function ShortcutsHelp(): React.JSX.Element {
  const { helpOpen, setHelpOpen } = useUIStore()
  const [tab, setTab] = useState<'shortcuts' | 'changelog'>('shortcuts')

  return (
    <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} title="Help" size="lg">
      <div className="flex items-center gap-1 mb-4 p-0.5 rounded-lg border border-surface-4 bg-surface-3 w-fit">
        {([
          { id: 'shortcuts' as const, label: 'Shortcuts',  icon: Keyboard },
          { id: 'changelog' as const, label: "What's New", icon: Sparkles },
        ]).map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors',
                tab === t.id ? 'bg-primary-600 text-white' : 'text-muted hover:text-white'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'shortcuts' ? (
        <div className="space-y-5">
          {SECTIONS.map((s) => (
            <div key={s.title}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">{s.title}</p>
              <div className="rounded-lg border border-surface-4 divide-y divide-surface-4 overflow-hidden">
                {s.rows.map((r) => (
                  <div key={r.label} className="flex items-center justify-between px-3 py-2 hover:bg-surface-3 transition-colors">
                    <span className="text-sm text-gray-200">{r.label}</span>
                    {r.keys === 'drop file' || r.keys === 'star icon'
                      ? <span className="text-[10px] text-muted italic">{r.keys}</span>
                      : <Kbd keys={r.keys} size="sm" />}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <p className="text-xs text-muted">
            Tip: most actions are also reachable through the command palette (<Kbd keys="mod+k" size="xs" />).
          </p>
        </div>
      ) : (
        <div className="space-y-5 max-h-[55vh] overflow-y-auto pr-1">
          {CHANGELOG.map((entry, i) => (
            <div key={entry.version}>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-sm font-semibold text-white">v{entry.version}</span>
                <span className="text-[10px] text-muted">· {entry.date}</span>
                {i === 0 && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary-600/20 border border-primary-600/30 text-[9px] font-medium text-primary-300">
                    <Sparkles className="w-2.5 h-2.5" />
                    Latest
                  </span>
                )}
              </div>
              <ul className="space-y-1.5">
                {entry.highlights.map((h, j) => (
                  <li key={j} className="flex items-start gap-2 text-xs text-gray-200">
                    <span className="w-1 h-1 rounded-full bg-primary-400 mt-1.5 flex-shrink-0" />
                    <span className="leading-relaxed">{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Dialog>
  )
}
