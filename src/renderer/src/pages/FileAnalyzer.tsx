import React, { useState } from 'react'
import { FileSearch, Copy, CheckCircle, AlertTriangle, Download } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'
import { DropZone } from '../components/ui/DropZone'
import { KeyValueGrid } from '../components/ui/KeyValueGrid'
import { Progress, Spinner } from '../components/ui/Progress'
import { HexView } from '../components/ui/HexView'
import { api } from '../lib/api'
import { formatBytes, formatDate, entropyLabel } from '../lib/format'
import { useToast } from '../components/ui/Toast'
import { pushRecentFile } from '../lib/storage'
import { exportJSON } from '../lib/export'

interface FileResult {
  path: string; name: string; extension: string; size: number
  hashes: { md5: string; sha1: string; sha256: string; sha512: string }
  magic: { type: string; description: string; mime: string; expectedExtensions: string[]; mismatch: boolean }
  entropy: number
  timestamps: { created: string; modified: string; accessed: string }
  permissions: string
  strings: { offset: number; value: string; encoding: string; length: number }[]
  string_count: number
  exif: Record<string, string> | null
  is_text: boolean
  preview_text: string | null
}

function CopyBtn({ value }: { value: string }): React.JSX.Element {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="p-1 rounded text-muted hover:text-white transition-colors"
      title="Copy"
    >
      {copied ? <CheckCircle className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

export default function FileAnalyzer(): React.JSX.Element {
  const { error } = useToast()
  const [result, setResult] = useState<FileResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [stringSearch, setStringSearch] = useState('')
  const [hashLookup, setHashLookup] = useState<string | null>(null)

  async function handleFiles(paths: string[]) {
    const path = paths[0]
    if (!path) return
    setLoading(true)
    setResult(null)
    const r = await api.file.analyze(path)
    setLoading(false)
    if (r.error) { error('Analysis failed', r.error); return }
    const fr = r.data as FileResult
    setResult(fr)
    pushRecentFile({ path: fr.path, label: fr.name, kind: fr.magic.type || 'file', page: '/file-analyzer' })

    // Check hash DB
    if (r.data) {
      const sha256 = (r.data as FileResult).hashes.sha256
      const lookup = await api.hashdb.lookup(sha256)
      const entry = lookup.data as { classification?: string } | null
      setHashLookup(entry?.classification ?? null)
    }
  }

  const { label: entropyLbl, color: entropyColor } = result ? entropyLabel(result.entropy) : { label: '', color: '' }

  const filteredStrings = result?.strings.filter(s =>
    !stringSearch || s.value.toLowerCase().includes(stringSearch.toLowerCase())
  ) ?? []

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <FileSearch className="w-5 h-5 text-primary-400" />
        <h1 className="text-lg font-bold text-white">File Analyzer</h1>
      </div>

      {!result && !loading && (
        <DropZone
          onFiles={handleFiles}
          label="Drop a file to analyze"
          hint="Supports any file type — calculates hashes, detects type, extracts strings, EXIF, and more"
          className="min-h-56"
        />
      )}

      {loading && (
        <Card className="flex flex-col items-center justify-center py-16 gap-4">
          <Spinner className="w-8 h-8" />
          <p className="text-sm text-muted">Analyzing file…</p>
          <Progress value={0} className="w-48" />
        </Card>
      )}

      {result && (
        <>
          {/* Header */}
          <Card>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary-600/20 border border-primary-600/30 flex items-center justify-center text-lg font-mono font-bold text-primary-400">
                  {result.extension.toUpperCase().slice(0,3) || '?'}
                </div>
                <div>
                  <h2 className="font-bold text-white">{result.name}</h2>
                  <p className="text-xs text-muted font-mono truncate max-w-lg">{result.path}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Badge variant="primary">{result.magic.type}</Badge>
                    <Badge variant="muted">{result.magic.mime}</Badge>
                    <Badge variant="muted">{formatBytes(result.size)}</Badge>
                    {result.magic.mismatch && <Badge variant="danger" dot>Extension Mismatch!</Badge>}
                    {hashLookup && hashLookup !== 'unknown' && (
                      <Badge variant={hashLookup === 'known_bad' ? 'danger' : hashLookup === 'known_good' ? 'success' : 'warning'} dot>
                        {hashLookup.replace('_', ' ')} in DB
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  icon={<Download className="w-3.5 h-3.5" />}
                  onClick={() => exportJSON(result, `${result.name}-analysis`)}
                >
                  Export JSON
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setResult(null); setHashLookup(null) }}>
                  Analyze Another
                </Button>
              </div>
            </div>
          </Card>

          {result.magic.mismatch && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>File extension <strong>.{result.extension}</strong> does not match detected type <strong>{result.magic.type}</strong> (expected: .{result.magic.expectedExtensions.join(', .')})</span>
            </div>
          )}

          <Tabs defaultValue="hashes">
            <TabsList>
              <TabsTrigger value="hashes">Hashes</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
              <TabsTrigger value="strings">Strings ({result.string_count.toLocaleString()})</TabsTrigger>
              <TabsTrigger value="hex">Hex View</TabsTrigger>
              {result.exif && <TabsTrigger value="exif">EXIF</TabsTrigger>}
              {result.preview_text && <TabsTrigger value="preview">Preview</TabsTrigger>}
            </TabsList>

            <TabsContent value="hashes" className="mt-3">
              <Card>
                <div className="space-y-2">
                  {([['MD5', result.hashes.md5], ['SHA-1', result.hashes.sha1], ['SHA-256', result.hashes.sha256], ['SHA-512', result.hashes.sha512]] as [string, string][]).map(([algo, hash]) => (
                    <div key={algo} className="flex items-center gap-2 py-2 border-b border-surface-4 last:border-0">
                      <span className="w-16 text-xs font-semibold text-muted uppercase">{algo}</span>
                      <span className="flex-1 font-mono text-xs text-white break-all select-all">{hash}</span>
                      <CopyBtn value={hash} />
                    </div>
                  ))}
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted">Entropy: {result.entropy.toFixed(4)} bits/byte</span>
                      <span className={`text-xs font-medium ${entropyColor}`}>{entropyLbl}</span>
                    </div>
                    <Progress value={(result.entropy / 8) * 100} color={result.entropy > 7 ? 'danger' : result.entropy > 5 ? 'warning' : 'success'} />
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="metadata" className="mt-3">
              <Card>
                <KeyValueGrid items={[
                  { key: 'File Name', value: result.name },
                  { key: 'Extension', value: result.extension || '(none)' },
                  { key: 'MIME Type', value: result.magic.mime },
                  { key: 'Detected Type', value: result.magic.description },
                  { key: 'File Size', value: `${formatBytes(result.size)} (${result.size.toLocaleString()} bytes)` },
                  { key: 'Permissions', value: `0${result.permissions}` },
                  { key: 'Created', value: formatDate(result.timestamps.created) },
                  { key: 'Modified', value: formatDate(result.timestamps.modified) },
                  { key: 'Accessed', value: formatDate(result.timestamps.accessed) },
                  { key: 'String Count', value: result.string_count.toLocaleString() },
                ]} columns={2} />
              </Card>
            </TabsContent>

            <TabsContent value="strings" className="mt-3">
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    placeholder="Filter strings…"
                    value={stringSearch}
                    onChange={e => setStringSearch(e.target.value)}
                    className="h-7 flex-1 bg-surface-3 border border-surface-4 rounded-lg px-2.5 text-xs text-white placeholder:text-muted focus:outline-none focus:border-primary-600"
                  />
                  <span className="text-xs text-muted">{filteredStrings.length.toLocaleString()} shown</span>
                </div>
                <div className="max-h-80 overflow-auto rounded-lg border border-surface-4">
                  <table className="w-full text-xs font-mono">
                    <thead className="sticky top-0 bg-surface-2">
                      <tr>
                        <th className="px-3 py-1.5 text-left text-muted font-medium w-24">Offset</th>
                        <th className="px-3 py-1.5 text-left text-muted font-medium w-16">Enc</th>
                        <th className="px-3 py-1.5 text-left text-muted font-medium">String</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStrings.slice(0, 2000).map((s, i) => (
                        <tr key={i} className="hover:bg-surface-3 transition-colors">
                          <td className="px-3 py-0.5 text-accent-400">{s.offset.toString(16).toUpperCase().padStart(8,'0')}</td>
                          <td className="px-3 py-0.5 text-muted">{s.encoding === 'utf16le' ? 'UTF16' : 'ASCII'}</td>
                          <td className="px-3 py-0.5 text-green-300 break-all">{s.value.slice(0,200)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="hex" className="mt-3">
              <Card>
                <HexView filePath={result.path} />
              </Card>
            </TabsContent>

            {result.exif && (
              <TabsContent value="exif" className="mt-3">
                <Card>
                  <KeyValueGrid
                    items={Object.entries(result.exif).filter(([,v]) => v).map(([k,v]) => ({ key: k, value: v }))}
                    columns={2}
                  />
                </Card>
              </TabsContent>
            )}

            {result.preview_text && (
              <TabsContent value="preview" className="mt-3">
                <Card>
                  <pre className="text-xs text-green-300 font-mono whitespace-pre-wrap break-all max-h-96 overflow-auto">
                    {result.preview_text}
                  </pre>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </>
      )}
    </div>
  )
}
