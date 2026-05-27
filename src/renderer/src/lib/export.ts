// CSV / JSON export helpers. Trigger downloads via the main-process save dialog
// when available (Electron), otherwise fall back to a blob link.

import { api } from './api'

function escapeCsvCell(value: unknown): string {
  if (value == null) return ''
  const s = typeof value === 'string' ? value : JSON.stringify(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function rowsToCsv(rows: Record<string, unknown>[], columns?: string[]): string {
  if (rows.length === 0) return ''
  const cols = columns ?? Object.keys(rows[0])
  const header = cols.map(escapeCsvCell).join(',')
  const body = rows.map(r => cols.map(c => escapeCsvCell(r[c])).join(',')).join('\n')
  return `${header}\n${body}`
}

export function rowsToJson(rows: unknown): string {
  return JSON.stringify(rows, null, 2)
}

async function saveViaBridge(content: string, defaultName: string): Promise<string | null> {
  try {
    const r = await api.util.saveFile(content, defaultName)
    if (r && typeof r === 'object' && 'data' in r) return (r as { data: string | null }).data
    return (r as unknown as string | null) ?? null
  } catch {
    return null
  }
}

function saveViaBlob(content: string, defaultName: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = defaultName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function exportCSV(rows: Record<string, unknown>[], baseName: string, columns?: string[]): Promise<string | null> {
  const csv = rowsToCsv(rows, columns)
  const name = baseName.endsWith('.csv') ? baseName : `${baseName}.csv`
  const saved = await saveViaBridge(csv, name)
  if (saved) return saved
  saveViaBlob(csv, name, 'text/csv')
  return name
}

export async function exportJSON(rows: unknown, baseName: string): Promise<string | null> {
  const json = rowsToJson(rows)
  const name = baseName.endsWith('.json') ? baseName : `${baseName}.json`
  const saved = await saveViaBridge(json, name)
  if (saved) return saved
  saveViaBlob(json, name, 'application/json')
  return name
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text)
}
