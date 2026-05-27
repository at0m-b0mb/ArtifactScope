import React, { useState } from 'react'
import { Mail, AlertTriangle, ShieldAlert } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'
import { DropZone } from '../components/ui/DropZone'
import { Spinner } from '../components/ui/Progress'
import { Table, Column } from '../components/ui/Table'
import { api } from '../lib/api'
import { formatDate, formatBytes } from '../lib/format'

interface EmailResult {
  from: string; to: string[]; cc: string[]; bcc: string[]
  subject: string; date: string; message_id: string
  received_chain: { by: string; from: string; with: string; timestamp: string }[]
  headers: Record<string, string>
  body_text: string | null; body_html: string | null
  attachments: { filename: string; content_type: string; size: number; md5: string; sha256: string; suspicious: boolean }[]
  auth: { spf: string | null; dkim: string | null; dmarc: string | null }
  phishing_indicators: string[]
  x_mailer: string | null
  return_path: string | null
  reply_to: string | null
}

export default function EmailAnalyzer(): React.JSX.Element {
  const [result, setResult] = useState<EmailResult | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleFiles(paths: string[]) {
    const path = paths[0]
    if (!path) return
    setLoading(true)
    setResult(null)
    const r = await api.email.parse(path)
    setLoading(false)
    if (r.data) setResult(r.data as EmailResult)
  }

  const attachCols: Column<{ filename: string; content_type: string; size: number; md5: string; sha256: string; suspicious: boolean }>[] = [
    { key: 'filename', header: 'Filename', render: r => (
      <div className="flex items-center gap-2">
        {r.suspicious && <AlertTriangle className="w-3.5 h-3.5 text-danger flex-shrink-0" />}
        <span className="text-white text-xs">{r.filename}</span>
      </div>
    )},
    { key: 'content_type', header: 'Type', render: r => <Badge variant="muted">{r.content_type}</Badge> },
    { key: 'size', header: 'Size', width: '80px', render: r => <span className="text-xs">{formatBytes(r.size)}</span> },
    { key: 'md5', header: 'MD5', render: r => <span className="font-mono text-[10px] text-muted select-all">{r.md5}</span> },
    { key: 'sha256', header: 'SHA-256', render: r => <span className="font-mono text-[10px] text-muted select-all">{r.sha256.slice(0,16)}…</span> },
  ]

  const chainCols: Column<{ by: string; from: string; with: string; timestamp: string }>[] = [
    { key: 'timestamp', header: 'Timestamp', width: '160px', render: r => <span className="text-xs font-mono">{r.timestamp}</span> },
    { key: 'from', header: 'From', render: r => <span className="text-xs font-mono text-white">{r.from}</span> },
    { key: 'by', header: 'By', render: r => <span className="text-xs font-mono text-accent-400">{r.by}</span> },
    { key: 'with', header: 'Protocol', width: '80px', render: r => <Badge variant="muted">{r.with}</Badge> },
  ]

  const hasPhishing = (result?.phishing_indicators?.length ?? 0) > 0
  const suspiciousAttachments = result?.attachments.filter(a => a.suspicious) ?? []

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary-400" />
          <h1 className="text-lg font-bold text-white">Email Analyzer</h1>
        </div>
        {result && (
          <Button size="sm" variant="ghost" onClick={() => setResult(null)}>Analyze Another</Button>
        )}
      </div>

      {!result && !loading && (
        <DropZone
          onFiles={handleFiles}
          label="Drop an email to analyze"
          hint="Supports .eml and .msg files — parses headers, body, attachments, SPF/DKIM/DMARC, routing chain"
          className="min-h-48"
        />
      )}

      {loading && (
        <Card className="flex flex-col items-center justify-center py-16 gap-4">
          <Spinner className="w-8 h-8" />
          <p className="text-sm text-muted">Parsing email…</p>
        </Card>
      )}

      {result && (
        <>
          {/* Alerts */}
          {hasPhishing && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Phishing Indicators Detected</p>
                <ul className="mt-1 space-y-0.5 text-xs">
                  {result.phishing_indicators.map((ind, i) => <li key={i}>• {ind}</li>)}
                </ul>
              </div>
            </div>
          )}
          {suspiciousAttachments.length > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-warning text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span><strong>{suspiciousAttachments.length}</strong> suspicious attachment{suspiciousAttachments.length !== 1 ? 's' : ''} detected (executable file types).</span>
            </div>
          )}

          {/* Summary card */}
          <Card>
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-bold text-white text-lg">{result.subject || '(no subject)'}</h2>
                  <p className="text-xs text-muted mt-0.5">{result.date ? formatDate(result.date) : '—'}</p>
                </div>
                <div className="flex gap-2">
                  {result.auth.spf && (
                    <Badge variant={result.auth.spf.toLowerCase().includes('pass') ? 'success' : 'danger'}>SPF: {result.auth.spf}</Badge>
                  )}
                  {result.auth.dkim && (
                    <Badge variant={result.auth.dkim.toLowerCase().includes('pass') ? 'success' : 'danger'}>DKIM: {result.auth.dkim}</Badge>
                  )}
                  {result.auth.dmarc && (
                    <Badge variant={result.auth.dmarc.toLowerCase().includes('pass') ? 'success' : 'danger'}>DMARC: {result.auth.dmarc}</Badge>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-2 text-xs">
                <div><span className="text-muted">From: </span><span className="text-white">{result.from}</span></div>
                <div><span className="text-muted">Reply-To: </span><span className="text-white">{result.reply_to || result.from}</span></div>
                <div><span className="text-muted">To: </span><span className="text-white">{(result.to ?? []).join(', ')}</span></div>
                <div><span className="text-muted">Return-Path: </span><span className="text-white">{result.return_path || '—'}</span></div>
                {(result.cc ?? []).length > 0 && <div className="col-span-2"><span className="text-muted">CC: </span><span className="text-white">{(result.cc ?? []).join(', ')}</span></div>}
                <div><span className="text-muted">Message-ID: </span><span className="font-mono text-[10px] text-muted">{result.message_id}</span></div>
                {result.x_mailer && <div><span className="text-muted">Mailer: </span><span className="text-white">{result.x_mailer}</span></div>}
              </div>
            </div>
          </Card>

          <Tabs defaultValue="body">
            <TabsList>
              <TabsTrigger value="body">Body</TabsTrigger>
              <TabsTrigger value="routing">Routing ({result.received_chain.length})</TabsTrigger>
              <TabsTrigger value="attachments">Attachments ({result.attachments.length})</TabsTrigger>
              <TabsTrigger value="headers">All Headers</TabsTrigger>
            </TabsList>

            <TabsContent value="body" className="mt-3 space-y-3">
              {result.body_text && (
                <Card>
                  <CardHeader><CardTitle>Plain Text</CardTitle></CardHeader>
                  <pre className="text-xs text-white font-mono whitespace-pre-wrap break-all max-h-96 overflow-auto">{result.body_text}</pre>
                </Card>
              )}
              {result.body_html && (
                <Card className="p-0">
                  <div className="px-4 py-2 border-b border-surface-4">
                    <CardTitle>HTML Preview (sandboxed)</CardTitle>
                  </div>
                  <iframe
                    srcDoc={result.body_html}
                    className="w-full rounded-b-xl"
                    style={{ height: 400, border: 'none' }}
                    sandbox=""
                    title="Email HTML"
                  />
                </Card>
              )}
              {!result.body_text && !result.body_html && (
                <p className="text-sm text-muted text-center py-8">No body content found.</p>
              )}
            </TabsContent>

            <TabsContent value="routing" className="mt-3">
              <Card>
                <CardHeader><CardTitle>Received Chain (newest → oldest)</CardTitle></CardHeader>
                {result.received_chain.length === 0 ? (
                  <p className="text-sm text-muted py-4">No routing headers found.</p>
                ) : (
                  <Table
                    columns={chainCols}
                    data={result.received_chain as unknown as Record<string, unknown>[]}
                    rowKey="timestamp"
                    compact
                  />
                )}
              </Card>
            </TabsContent>

            <TabsContent value="attachments" className="mt-3">
              {result.attachments.length === 0 ? (
                <Card>
                  <p className="text-sm text-muted text-center py-8">No attachments found.</p>
                </Card>
              ) : (
                <Table
                  columns={attachCols}
                  data={result.attachments as unknown as Record<string, unknown>[]}
                  rowKey="filename"
                  compact
                />
              )}
            </TabsContent>

            <TabsContent value="headers" className="mt-3">
              <Card>
                <div className="max-h-96 overflow-auto">
                  {Object.entries(result.headers).map(([k, v]) => (
                    <div key={k} className="flex gap-3 py-1 border-b border-surface-4 last:border-0 text-xs">
                      <span className="font-mono text-primary-400 flex-shrink-0 w-48 truncate">{k}</span>
                      <span className="font-mono text-white break-all">{v}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
