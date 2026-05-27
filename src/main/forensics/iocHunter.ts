import { extractStrings } from './stringExtractor'

export interface IOCMatch {
  type: string
  value: string
  offset: number
  context: string
  severity: 'high' | 'medium' | 'low'
}

export interface IOCHuntResult {
  total: number
  matches: IOCMatch[]
  summary: { type: string; count: number }[]
}

const PATTERNS: { type: string; regex: RegExp; severity: IOCMatch['severity'] }[] = [
  { type: 'IPv4 Address',      regex: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g, severity: 'medium' },
  { type: 'URL (HTTP/HTTPS)',  regex: /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)/g, severity: 'high' },
  { type: 'Email Address',     regex: /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g, severity: 'medium' },
  { type: 'MD5 Hash',          regex: /\b[0-9a-fA-F]{32}\b/g, severity: 'low' },
  { type: 'SHA-1 Hash',        regex: /\b[0-9a-fA-F]{40}\b/g, severity: 'low' },
  { type: 'SHA-256 Hash',      regex: /\b[0-9a-fA-F]{64}\b/g, severity: 'low' },
  { type: 'Bitcoin Address',   regex: /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g, severity: 'high' },
  { type: 'Ethereum Address',  regex: /\b0x[a-fA-F0-9]{40}\b/g, severity: 'high' },
  { type: 'CVE ID',            regex: /\bCVE-\d{4}-\d{4,7}\b/gi, severity: 'high' },
  { type: 'Windows Path',      regex: /[A-Z]:\\(?:[\w\s.()\-]+\\)*[\w\s.()\-]*/g, severity: 'low' },
  { type: 'Unix Path',         regex: /\/(?:etc|home|var|usr|tmp|proc|sys|root)\/[\w./-]+/g, severity: 'low' },
  { type: 'Domain Name',       regex: /\b(?:[a-z0-9](?:[a-z0-9\-]{0,61}[a-z0-9])?\.)+(?:com|net|org|io|gov|edu|co|info|biz|onion|xyz|ru|cn|tk|ml|top)\b/gi, severity: 'medium' },
  { type: 'Base64 (>=32 chars)', regex: /[A-Za-z0-9+/]{32,}={0,2}/g, severity: 'low' },
  { type: 'Private Key Header', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, severity: 'high' },
  { type: 'Registry Key',      regex: /HKEY_(?:LOCAL_MACHINE|CURRENT_USER|CLASSES_ROOT|USERS|CURRENT_CONFIG)\\[^\s"]+/g, severity: 'medium' },
  { type: 'PowerShell Encoded', regex: /powershell.*?-[Ee](?:ncodedcommand|nc)?\s+[A-Za-z0-9+/=]{20,}/gi, severity: 'high' },
  { type: 'S3 Bucket URL',     regex: /[a-z0-9\-]+\.s3(?:\.[a-z0-9\-]+)?\.amazonaws\.com/gi, severity: 'medium' },
]

// Luhn algorithm for credit card detection
function luhn(s: string): boolean {
  const digits = s.replace(/\D/g, '')
  if (digits.length < 13 || digits.length > 19) return false
  let sum = 0
  let odd = true
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i])
    if (odd) { odd = false }
    else { d *= 2; if (d > 9) d -= 9 }
    sum += d
    odd = !odd
  }
  return sum % 10 === 0
}

export async function huntIOCs(filePath: string): Promise<IOCHuntResult> {
  const strings = await extractStrings(filePath, 4)
  const text = strings.map(s => s.value).join('\n')

  const matches: IOCMatch[] = []
  const typeCounts: Record<string, number> = {}

  for (const { type, regex, severity } of PATTERNS) {
    regex.lastIndex = 0
    const found = new Set<string>()
    let m: RegExpExecArray | null
    while ((m = regex.exec(text)) !== null && matches.length < 10000) {
      const value = m[0]
      if (found.has(value)) continue
      found.add(value)
      const start = Math.max(0, m.index - 40)
      const context = text.slice(start, m.index + value.length + 40)
      matches.push({ type, value, offset: m.index, context, severity })
      typeCounts[type] = (typeCounts[type] ?? 0) + 1
    }
  }

  // Credit cards
  const ccRegex = /\b(?:\d{4}[- ]?){3}\d{4}\b/g
  let m: RegExpExecArray | null
  while ((m = ccRegex.exec(text)) !== null && matches.length < 10000) {
    const digits = m[0].replace(/\D/g, '')
    if (luhn(digits)) {
      matches.push({ type: 'Credit Card (Luhn)', value: m[0], offset: m.index, context: text.slice(Math.max(0, m.index - 20), m.index + m[0].length + 20), severity: 'high' })
      typeCounts['Credit Card (Luhn)'] = (typeCounts['Credit Card (Luhn)'] ?? 0) + 1
    }
  }

  const summary = Object.entries(typeCounts).map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)

  return { total: matches.length, matches: matches.slice(0, 5000), summary }
}
