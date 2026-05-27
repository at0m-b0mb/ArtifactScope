import React, { useState } from 'react'
import { GitCompare, FileSearch, Equal, AlertTriangle, Check, X } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { DropZone } from '../components/ui/DropZone'
import { Spinner } from '../components/ui/Progress'
import { api } from '../lib/api'
import { formatBytes, formatDate, entropyLabel } from '../lib/format'
import { useToast } from '../components/ui/Toast'
import { cn } from '../lib/cn'

interface FileResult {
  path: string; name: string; extension: string; size: number
  hashes: { md5: string; sha1: string; sha256: string; sha512: string }
  magic: { type: string; description: string; mime: string }
  entropy: number
  timestamps: { created: string; modified: string; accessed: string }
  exif: Record<string, string> | null
}

type Side = 'A' | 'B'

interface CompareRow {
  label: string
  a: string
  b: string
  same: boolean
  mono?: boolean
}

export default function FileCompare(): React.JSX.Element {
  const { error } = useToast()
  const [fileA, setFileA] = useState<FileResult | null>(null)
  const [fileB, setFileB] = useState<FileResult | null>(null)
  const [loadingA, setLoadingA] = useState(false)
  const [loadingB, setLoadingB] = useState(false)

  async function load(paths: string[], side: Side) {
    const p = paths[0]
    if (!p) return
    const setLoading = side === 'A' ? setLoadingA : setLoadingB
    const setFile = side === 'A' ? setFileA : setFileB
    setLoading(true)
    const r = await api.file.analyze(p)
    setLoading(false)
    if (r.error) { error('Analysis failed', r.error); return }
    setFile(r.data as FileResult)
  }

  function reset() { setFileA(null); setFileB(null) }

  const rows: CompareRow[] = []
  if (fileA && fileB) {
    const cmp = (label: string, a: string, b: string, mono = false) => rows.push({ label, a, b, same: a === b, mono })
    cmp('Name',        fileA.name,                                    fileB.name)
    cmp('Extension',   fileA.extension || '(none)',                    fileB.extension || '(none)')
    cmp('Size',        `${formatBytes(fileA.size)} (${fileA.size})`,   `${formatBytes(fileB.size)} (${fileB.size})`)
    cmp('Magic type',  fileA.magic.type,                                fileB.magic.type)
    cmp('MIME',        fileA.magic.mime,                                fileB.magic.mime)
    cmp('Entropy',     fileA.entropy.toFixed(4),                        fileB.entropy.toFixed(4))
    cmp('MD5',         fileA.hashes.md5,                                fileB.hashes.md5,    true)
    cmp('SHA-1',       fileA.hashes.sha1,                               fileB.hashes.sha1,   true)
    cmp('SHA-256',     fileA.hashes.sha256,                             fileB.hashes.sha256, true)
    cmp('SHA-512',     fileA.hashes.sha512,                             fileB.hashes.sha512, true)
    cmp('Modified',    formatDate(fileA.timestamps.modified),           formatDate(fileB.timestamps.modified))
    cmp('Created',     formatDate(fileA.timestamps.created),            formatDate(fileB.timestamps.created))
  }

  const samenessScore = rows.length === 0 ? 0 : rows.filter(r => r.same).length / rows.length
  const identical = fileA && fileB && fileA.hashes.sha256 === fileB.hashes.sha256

  function SidePanel({ side, file, loading }: { side: Side; file: FileResult | null; loading: boolean }) {
    if (loading) {
      return (
        <Card className="flex flex-col items-center justify-center py-10 gap-3">
          <Spinner className="w-7 h-7" />
          <p className="text-xs text-muted">Analyzing side {side}…</p>
        </Card>
      )
    }
    if (!file) {
      return (
        <DropZone
          onFiles={(p) => load(p, side)}
          label={`Drop file ${side}`}
          hint="Or click to browse"
          className="h-48"
        />
      )
    }
    return (
      <Card className="space-y-2">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-600/20 border border-primary-600/30 flex items-center justify-center text-sm font-mono font-bold text-primary-400 flex-shrink-0">
            {file.extension.toUpperCase().slice(0, 3) || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate" title={file.name}>{file.name}</p>
            <p className="text-[10px] font-mono text-muted truncate" title={file.path}>{file.path}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="primary">{file.magic.type}</Badge>
          <Badge variant="muted">{formatBytes(file.size)}</Badge>
          <Badge variant="muted">{entropyLabel(file.entropy).label}</Badge>
        </div>
        <Button size="xs" variant="ghost" onClick={() => (side === 'A' ? setFileA(null) : setFileB(null))}>Change file</Button>
      </Card>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-primary-400" />
          <h1 className="text-lg font-bold text-white">Compare Files</h1>
          <Badge variant="muted">Side-by-side</Badge>
        </div>
        {(fileA || fileB) && (
          <Button size="sm" variant="ghost" onClick={reset}>Reset</Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <SidePanel side="A" file={fileA} loading={loadingA} />
        <SidePanel side="B" file={fileB} loading={loadingB} />
      </div>

      {fileA && fileB && (
        <>
          <Card className={cn(
            'flex items-center gap-3 border-l-4',
            identical
              ? 'bg-success/10 border-l-success border-success/30'
              : samenessScore > 0.7
              ? 'bg-warning/10 border-l-warning border-warning/30'
              : 'bg-danger/10 border-l-danger border-danger/30',
          )}>
            {identical
              ? <Equal className="w-6 h-6 text-success" />
              : <AlertTriangle className={cn('w-6 h-6', samenessScore > 0.7 ? 'text-warning' : 'text-danger')} />
            }
            <div className="flex-1">
              <p className={cn('text-sm font-semibold',
                identical ? 'text-success' : samenessScore > 0.7 ? 'text-warning' : 'text-danger',
              )}>
                {identical
                  ? 'Files are identical (matching SHA-256)'
                  : `Files differ — ${Math.round(samenessScore * 100)}% of compared fields match`}
              </p>
              <p className="text-xs text-muted mt-0.5">
                {rows.filter(r => r.same).length} matching · {rows.filter(r => !r.same).length} differing of {rows.length} fields.
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comparison</CardTitle>
              <div className="flex items-center gap-2 text-[10px] text-muted">
                <span className="flex items-center gap-1"><Check className="w-3 h-3 text-success" />Match</span>
                <span className="flex items-center gap-1"><X className="w-3 h-3 text-danger" />Differs</span>
              </div>
            </CardHeader>
            <div className="rounded-lg border border-surface-4 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-surface-3 text-muted">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium w-32">Field</th>
                    <th className="px-3 py-2 text-left font-medium">A</th>
                    <th className="px-3 py-2 text-left font-medium">B</th>
                    <th className="px-3 py-2 text-center font-medium w-12">=</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.label} className={cn('border-t border-surface-4', r.same ? '' : 'bg-danger/5')}>
                      <td className="px-3 py-1.5 text-muted font-medium">{r.label}</td>
                      <td className={cn('px-3 py-1.5 break-all', r.mono && 'font-mono text-[10px]', r.same ? 'text-gray-300' : 'text-white')}>
                        {r.a}
                      </td>
                      <td className={cn('px-3 py-1.5 break-all', r.mono && 'font-mono text-[10px]', r.same ? 'text-gray-300' : 'text-white')}>
                        {r.b}
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        {r.same ? <Check className="w-3.5 h-3.5 text-success inline" /> : <X className="w-3.5 h-3.5 text-danger inline" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {!fileA && !fileB && (
        <Card className="text-center py-6">
          <FileSearch className="w-7 h-7 text-muted mx-auto mb-2" />
          <p className="text-sm text-white">Drop two files to compare</p>
          <p className="text-xs text-muted mt-1">Compares hashes, magic type, entropy, size, and timestamps.</p>
        </Card>
      )}
    </div>
  )
}
