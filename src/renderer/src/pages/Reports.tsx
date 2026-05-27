import React, { useEffect, useState } from 'react'
import { FileText, Download, Eye, Printer } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input, Select, Textarea } from '../components/ui/Input'
import { Spinner } from '../components/ui/Progress'
import { EmptyState } from '../components/ui/EmptyState'
import { api } from '../lib/api'
import { useCaseStore, Case } from '../stores/caseStore'

interface ReportOptions {
  case_id: string
  title: string
  author: string
  agency: string
  classification: string
  include_evidence: boolean
  include_custody: boolean
  include_activity: boolean
  executive_summary: string
  findings: string
  recommendations: string
}

export default function Reports(): React.JSX.Element {
  const { activeCase } = useCaseStore()
  const [cases, setCases] = useState<Case[]>([])
  const [generating, setGenerating] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [opts, setOpts] = useState<ReportOptions>({
    case_id: activeCase?.id ?? '',
    title: activeCase ? `Forensic Report — ${activeCase.name}` : '',
    author: activeCase?.investigator ?? '',
    agency: activeCase?.agency ?? '',
    classification: 'CONFIDENTIAL',
    include_evidence: true,
    include_custody: true,
    include_activity: true,
    executive_summary: '',
    findings: '',
    recommendations: '',
  })

  useEffect(() => {
    api.cases.list().then(r => setCases((r.data ?? []) as Case[]))
  }, [])

  useEffect(() => {
    if (activeCase) {
      setOpts(p => ({
        ...p,
        case_id: activeCase.id,
        title: `Forensic Report — ${activeCase.name}`,
        author: activeCase.investigator,
        agency: activeCase.agency,
      }))
    }
  }, [activeCase])

  function handleCaseChange(id: string) {
    const c = cases.find(c => c.id === id)
    if (c) {
      setOpts(p => ({
        ...p,
        case_id: id,
        title: `Forensic Report — ${c.name}`,
        author: c.investigator,
        agency: c.agency,
      }))
    }
  }

  async function generate() {
    if (!opts.case_id) return
    setGenerating(true)
    const r = await api.report.generate(opts)
    setGenerating(false)
    if (r.data) setPreviewHtml(r.data as string)
  }

  async function exportPDF() {
    if (!previewHtml) return
    setGenerating(true)
    const r = await api.report.printPDF(previewHtml)
    setGenerating(false)
    if (r.data) await api.util.saveFile(r.data as string, `${opts.title.replace(/\s+/g,'_')}.pdf`, 'application/pdf')
  }

  async function exportHTML() {
    if (!previewHtml) return
    await api.util.saveFile(previewHtml, `${opts.title.replace(/\s+/g,'_')}.html`, 'text/html')
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary-400" />
          <h1 className="text-lg font-bold text-white">Report Generator</h1>
        </div>
        {previewHtml && (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" icon={<Download className="w-3.5 h-3.5" />} onClick={exportHTML}>Export HTML</Button>
            <Button size="sm" variant="primary" icon={<Printer className="w-3.5 h-3.5" />} onClick={exportPDF} loading={generating}>Export PDF</Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Options form */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Report Settings</CardTitle></CardHeader>
            <div className="space-y-3">
              <Select
                label="Case"
                value={opts.case_id}
                onChange={e => handleCaseChange(e.target.value)}
              >
                <option value="">Select a case…</option>
                {cases.map(c => <option key={c.id} value={c.id}>{c.name} (#{c.case_number})</option>)}
              </Select>
              <Input
                label="Report Title"
                value={opts.title}
                onChange={e => setOpts(p => ({...p, title: e.target.value}))}
                placeholder="Forensic Investigation Report"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Author / Investigator"
                  value={opts.author}
                  onChange={e => setOpts(p => ({...p, author: e.target.value}))}
                />
                <Input
                  label="Agency"
                  value={opts.agency}
                  onChange={e => setOpts(p => ({...p, agency: e.target.value}))}
                />
              </div>
              <Select
                label="Classification"
                value={opts.classification}
                onChange={e => setOpts(p => ({...p, classification: e.target.value}))}
              >
                <option value="UNCLASSIFIED">UNCLASSIFIED</option>
                <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                <option value="RESTRICTED">RESTRICTED</option>
                <option value="SECRET">SECRET</option>
                <option value="FOR OFFICIAL USE ONLY">FOR OFFICIAL USE ONLY</option>
              </Select>
            </div>
          </Card>

          <Card>
            <CardHeader><CardTitle>Sections to Include</CardTitle></CardHeader>
            <div className="space-y-2">
              {[
                { key: 'include_evidence', label: 'Evidence Inventory' },
                { key: 'include_custody', label: 'Chain of Custody Log' },
                { key: 'include_activity', label: 'Activity / Audit Log' },
              ].map(s => (
                <label key={s.key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={opts[s.key as keyof ReportOptions] as boolean}
                    onChange={e => setOpts(p => ({...p, [s.key]: e.target.checked}))}
                    className="w-4 h-4 rounded border border-surface-4 bg-surface-3 text-primary-600 focus:ring-primary-600"
                  />
                  <span className="text-sm text-white">{s.label}</span>
                </label>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader><CardTitle>Narrative Sections</CardTitle></CardHeader>
            <div className="space-y-3">
              <Textarea
                label="Executive Summary"
                value={opts.executive_summary}
                onChange={e => setOpts(p => ({...p, executive_summary: e.target.value}))}
                rows={3}
                placeholder="Brief overview of the investigation and key findings…"
              />
              <Textarea
                label="Findings"
                value={opts.findings}
                onChange={e => setOpts(p => ({...p, findings: e.target.value}))}
                rows={4}
                placeholder="Detailed forensic findings, artifacts discovered, timeline of events…"
              />
              <Textarea
                label="Recommendations"
                value={opts.recommendations}
                onChange={e => setOpts(p => ({...p, recommendations: e.target.value}))}
                rows={3}
                placeholder="Remediation steps, legal action, further investigation required…"
              />
            </div>
          </Card>

          <Button
            variant="primary"
            icon={<Eye className="w-4 h-4" />}
            onClick={generate}
            loading={generating}
            disabled={!opts.case_id}
            className="w-full"
          >
            Generate Preview
          </Button>
        </div>

        {/* Preview pane */}
        <div>
          {generating && !previewHtml && (
            <Card className="flex flex-col items-center justify-center h-64 gap-3">
              <Spinner className="w-8 h-8" />
              <p className="text-sm text-muted">Generating report…</p>
            </Card>
          )}

          {!previewHtml && !generating && (
            <EmptyState
              icon={<FileText className="w-7 h-7" />}
              title="No preview yet"
              description="Fill in the report settings and click Generate Preview to see the report."
            />
          )}

          {previewHtml && (
            <Card className="p-0 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-surface-4">
                <span className="text-xs font-medium text-white">Report Preview</span>
                <div className="flex gap-2">
                  <Badge variant="primary">HTML</Badge>
                  <Button size="xs" variant="ghost" icon={<Download className="w-3 h-3" />} onClick={exportHTML}>Save HTML</Button>
                  <Button size="xs" variant="primary" icon={<Printer className="w-3 h-3" />} onClick={exportPDF} loading={generating}>PDF</Button>
                </div>
              </div>
              <iframe
                srcDoc={previewHtml}
                className="w-full rounded-b-xl"
                style={{ height: '600px', border: 'none', background: 'white' }}
                title="Report Preview"
                sandbox="allow-same-origin"
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
