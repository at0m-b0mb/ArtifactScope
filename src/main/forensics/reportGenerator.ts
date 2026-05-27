import { getCase } from '../db/cases'
import { listEvidence } from '../db/evidence'
import { listCustody } from '../db/custody'
import { getSettings } from '../db/activity'

export interface ReportOptions {
  case_id: string
  title?: string
  author?: string
  agency?: string
  classification?: string
  include_evidence?: boolean
  include_custody?: boolean
  include_activity?: boolean
  executive_summary?: string
  findings?: string
  recommendations?: string
}

export async function generateReport(opts: ReportOptions): Promise<string> {
  const caseData = getCase(opts.case_id)
  if (!caseData) throw new Error(`Case ${opts.case_id} not found.`)

  const settings       = getSettings()
  const evidenceList   = opts.include_evidence !== false ? listEvidence(opts.case_id) : []
  const custodyLog     = opts.include_custody  !== false ? listCustody(opts.case_id)  : []

  const now = new Date().toLocaleString()
  const investigator = opts.author     || settings.default_investigator || caseData.investigator
  const agency       = opts.agency     || settings.default_agency       || caseData.agency
  const title        = opts.title      || `Forensic Investigation Report — ${caseData.name}`
  const classification = opts.classification || settings.classification || 'CONFIDENTIAL'

  function esc(s: string): string {
    return (s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
  }
  function nl2br(s: string): string { return esc(s).replace(/\n/g,'<br>') }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${esc(title)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: #fff; font-size: 10pt; line-height: 1.6; }
  .page { max-width: 820px; margin: 0 auto; padding: 40px 48px; }
  .classification-banner { background: #dc2626; color: white; text-align: center; font-weight: 800; font-size: 9pt; letter-spacing: 2px; padding: 4px 0; margin: -40px -48px 32px; }
  .cover { text-align: center; padding: 60px 0 40px; border-bottom: 3px solid #7c3aed; margin-bottom: 40px; page-break-after: always; }
  .cover .logo { width: 64px; height: 64px; background: linear-gradient(135deg,#7c3aed,#0ea5e9); border-radius: 16px; margin: 0 auto 20px; display:flex; align-items:center; justify-content:center; }
  .cover h1 { font-size: 26pt; color: #7c3aed; margin: 10px 0 4px; }
  .cover h2 { font-size: 14pt; color: #555; font-weight: 400; margin-bottom: 30px; }
  .cover table { margin: 0 auto; text-align: left; border-collapse: collapse; }
  .cover table td { padding: 5px 14px; font-size: 10pt; }
  .cover table td:first-child { font-weight: 600; color: #7c3aed; }
  h2.section { font-size: 13pt; color: #7c3aed; border-bottom: 2px solid #e8e0ff; padding-bottom: 6px; margin: 34px 0 14px; }
  h3.sub { font-size: 11pt; color: #333; margin: 18px 0 8px; }
  p { margin-bottom: 8px; }
  .narrative { background: #faf9ff; border-left: 3px solid #7c3aed; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 10px 0; }
  table.report { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 9pt; }
  table.report th { background: #7c3aed; color: #fff; padding: 7px 10px; text-align: left; font-weight: 600; }
  table.report td { padding: 6px 10px; border-bottom: 1px solid #f0ecff; vertical-align: top; }
  table.report tr:nth-child(even) td { background: #faf9ff; }
  .badge { display:inline-block; padding:2px 8px; border-radius:20px; font-size:8pt; font-weight:600; }
  .badge-open { background:#d1fae5; color:#065f46; }
  .badge-closed,.badge-archived { background:#f3f4f6; color:#374151; }
  .badge-critical,.badge-high { background:#fee2e2; color:#991b1b; }
  .badge-medium { background:#fef3c7; color:#92400e; }
  .badge-low { background:#dbeafe; color:#1e40af; }
  .custody-entry { padding:10px 14px; border-left:3px solid #7c3aed; margin:8px 0; background:#faf9ff; border-radius:0 8px 8px 0; }
  .custody-entry .ts { font-size:8pt; color:#888; }
  .custody-entry .action { font-weight:600; color:#7c3aed; }
  .hash-chain { font-family:Consolas,monospace; font-size:7pt; color:#aaa; word-break:break-all; }
  .footer { margin-top:40px; padding-top:16px; border-top:1px solid #ddd; font-size:8pt; color:#888; display:flex; justify-content:space-between; }
  @media print { .page { padding:0; } }
</style>
</head>
<body>
<div class="page">
<div class="classification-banner">${esc(classification)}</div>

<!-- Cover -->
<div class="cover">
  <div class="logo">
    <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" width="36" height="36">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  </div>
  <h1>ArtifactScope</h1>
  <h2>${esc(title)}</h2>
  <table>
    <tr><td>Case Name:</td><td><strong>${esc(caseData.name)}</strong></td></tr>
    <tr><td>Case Number:</td><td>${esc(caseData.case_number)}</td></tr>
    <tr><td>Investigator:</td><td>${esc(investigator)}</td></tr>
    <tr><td>Agency:</td><td>${esc(agency)}</td></tr>
    <tr><td>Status:</td><td><span class="badge badge-${caseData.status}">${caseData.status.toUpperCase()}</span></td></tr>
    <tr><td>Priority:</td><td><span class="badge badge-${caseData.priority}">${caseData.priority.toUpperCase()}</span></td></tr>
    <tr><td>Generated:</td><td>${now}</td></tr>
    <tr><td>Case Opened:</td><td>${new Date(caseData.created_at).toLocaleString()}</td></tr>
    <tr><td>Classification:</td><td><strong style="color:#dc2626">${esc(classification)}</strong></td></tr>
  </table>
</div>

<!-- Executive Summary -->
<h2 class="section">1. Executive Summary</h2>
${opts.executive_summary
  ? `<div class="narrative">${nl2br(opts.executive_summary)}</div>`
  : `<p>${esc(caseData.description || 'No description provided.')}</p>
     <p>This forensic investigation was conducted using ArtifactScope v1.0.0, a cross-platform digital forensics toolkit. The findings documented in this report represent a factual account of the digital artifacts collected and analyzed during the investigation.</p>`
}

${opts.findings ? `
<!-- Findings -->
<h2 class="section">2. Findings</h2>
<div class="narrative">${nl2br(opts.findings)}</div>` : ''}

${opts.recommendations ? `
<!-- Recommendations -->
<h2 class="section">${opts.findings ? '3' : '2'}. Recommendations</h2>
<div class="narrative">${nl2br(opts.recommendations)}</div>` : ''}

<!-- Evidence Inventory -->
<h2 class="section">${opts.include_evidence !== false ? `${opts.findings ? (opts.recommendations ? '4' : '3') : (opts.recommendations ? '3' : '2')}` : '2'}. Evidence Inventory</h2>
${evidenceList.length === 0
  ? '<p style="color:#888">No evidence items recorded for this case.</p>'
  : `<table class="report">
  <thead><tr><th>#</th><th>Name</th><th>Type</th><th>Source Path</th><th>SHA-256</th><th>Size</th><th>Added</th></tr></thead>
  <tbody>
    ${evidenceList.map((e, i) => `
    <tr>
      <td>${i+1}</td>
      <td>${esc(e.name)}</td>
      <td>${esc(e.type)}</td>
      <td style="font-family:monospace;font-size:8pt">${esc(e.source_path)}</td>
      <td style="font-family:monospace;font-size:8pt">${esc(e.sha256 ? e.sha256.slice(0,16)+'…' : '—')}</td>
      <td>${e.size_bytes > 0 ? (e.size_bytes / 1024).toFixed(1) + ' KB' : '—'}</td>
      <td>${new Date(e.added_at).toLocaleDateString()}</td>
    </tr>`).join('')}
  </tbody>
</table>
${evidenceList.some(e => e.notes) ? evidenceList.filter(e => e.notes).map(e => `<p style="margin-top:6px"><strong>${esc(e.name)}:</strong> ${esc(e.notes)}</p>`).join('') : ''}`
}

<!-- Chain of Custody -->
<h2 class="section" style="margin-top:40px">Chain of Custody</h2>
<p style="margin-bottom:12px">Each entry is SHA-256 hash-chained to the previous entry to ensure tamper-evidence.</p>
${custodyLog.length === 0
  ? '<p style="color:#888">No custody entries recorded.</p>'
  : custodyLog.map(c => `
<div class="custody-entry">
  <div class="ts">${new Date(c.timestamp).toLocaleString()}</div>
  <div class="action">${esc(c.action)}</div>
  <div>${esc(c.description)}</div>
  <div class="hash-chain">Hash: ${esc(c.row_hash)} | Prev: ${esc(c.prev_hash || '(genesis)')}</div>
</div>`).join('')}

<!-- Methodology -->
<h2 class="section">Methodology &amp; Disclaimer</h2>
<p>All analysis was performed with ArtifactScope v1.0.0, a read-only forensics toolkit. Evidence files were not modified during analysis. Hashes were calculated at the time of acquisition. The integrity of the chain of custody is mathematically verifiable through the SHA-256 hash chain above.</p>
<p style="margin-top:8px;color:#666;font-style:italic">This report was generated automatically. The investigator is responsible for reviewing findings and drawing conclusions in conjunction with a qualified forensic examiner's analysis.</p>

<!-- Footer -->
<div class="footer">
  <span>ArtifactScope v1.0.0 — ${esc(classification)}</span>
  <span>Case #${esc(caseData.case_number)} — ${now}</span>
</div>

</div>
</body>
</html>`

  return html
}
