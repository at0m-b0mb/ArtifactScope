import React from 'react'
import { Dialog } from './ui/Dialog'
import { Kbd } from './ui/Kbd'
import { useUIStore } from '../stores/uiStore'

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
    title: 'Data tables',
    rows: [
      { keys: 'mod+e', label: 'Export visible rows to CSV' },
      { keys: '/',     label: 'Focus search / filter' },
    ],
  },
]

export function ShortcutsHelp(): React.JSX.Element {
  const { helpOpen, setHelpOpen } = useUIStore()
  return (
    <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} title="Keyboard Shortcuts" size="lg">
      <div className="space-y-5">
        {SECTIONS.map((s) => (
          <div key={s.title}>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">{s.title}</p>
            <div className="rounded-lg border border-surface-4 divide-y divide-surface-4 overflow-hidden">
              {s.rows.map((r) => (
                <div key={r.keys} className="flex items-center justify-between px-3 py-2 hover:bg-surface-3 transition-colors">
                  <span className="text-sm text-gray-200">{r.label}</span>
                  <Kbd keys={r.keys} size="sm" />
                </div>
              ))}
            </div>
          </div>
        ))}
        <p className="text-xs text-muted">
          Tip: most actions are also reachable through the command palette (<Kbd keys="mod+k" size="xs" />).
        </p>
      </div>
    </Dialog>
  )
}
