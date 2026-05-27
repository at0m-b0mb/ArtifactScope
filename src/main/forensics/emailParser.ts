import fs from 'fs'

export interface EmailHeader { name: string; value: string }
export interface EmailAttachment {
  filename: string
  content_type: string
  size: number
  md5?: string
}
export interface ReceivedHop {
  from: string
  by: string
  timestamp: string
  raw: string
}

export interface ParsedEmail {
  subject: string
  from: string
  to: string[]
  cc: string[]
  date: string
  message_id: string
  headers: EmailHeader[]
  received_chain: ReceivedHop[]
  body_text: string
  body_html: string
  attachments: EmailAttachment[]
  authentication: { spf: string; dkim: string; dmarc: string }
  warnings: string[]
}

function decodeQP(s: string): string {
  return s.replace(/=\r?\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
}

function decodeBase64(s: string): string {
  try { return Buffer.from(s.replace(/\s/g,''), 'base64').toString('utf8') }
  catch { return s }
}

function decodeWord(s: string): string {
  // RFC 2047 encoded word: =?charset?encoding?text?=
  return s.replace(/=\?([^?]+)\?([BQbq])\?([^?]*)\?=/g, (_, _charset, enc, text) => {
    try {
      if (enc.toUpperCase() === 'B') return Buffer.from(text, 'base64').toString('utf8')
      return decodeQP(text).replace(/_/g, ' ')
    } catch { return s }
  })
}

function splitHeaders(raw: string): { name: string; value: string }[] {
  // Unfold headers (RFC 2822: continuation lines start with whitespace)
  const unfolded = raw.replace(/\r?\n([ \t])/g, ' ')
  return unfolded.split(/\r?\n/).filter(l => l.includes(':')).map(l => {
    const colon = l.indexOf(':')
    return { name: l.slice(0, colon).trim(), value: decodeWord(l.slice(colon + 1).trim()) }
  })
}

function getHeader(headers: EmailHeader[], name: string): string {
  return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
}

function getAllHeaders(headers: EmailHeader[], name: string): string[] {
  return headers.filter(h => h.name.toLowerCase() === name.toLowerCase()).map(h => h.value)
}

function parseAddressList(s: string): string[] {
  if (!s) return []
  return s.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(a => a.trim()).filter(Boolean)
}

export async function parseEmail(filePath: string): Promise<ParsedEmail> {
  const raw = fs.readFileSync(filePath, 'utf8')
  const warnings: string[] = []

  // Split headers from body
  const separatorIdx = raw.search(/\r?\n\r?\n/)
  const headerSection = separatorIdx >= 0 ? raw.slice(0, separatorIdx) : raw
  const bodyRaw = separatorIdx >= 0 ? raw.slice(separatorIdx + 2) : ''

  const headers = splitHeaders(headerSection)
  const contentType = getHeader(headers, 'content-type')
  const encoding = getHeader(headers, 'content-transfer-encoding').toLowerCase()

  // Parse received chain
  const receivedHeaders = getAllHeaders(headers, 'received').reverse()
  const received_chain: ReceivedHop[] = receivedHeaders.map(r => {
    const from = r.match(/from\s+(\S+)/i)?.[1] ?? ''
    const by   = r.match(/by\s+(\S+)/i)?.[1] ?? ''
    const ts   = r.match(/;\s*(.+)$/)?.[1] ?? ''
    return { from, by, timestamp: ts, raw: r }
  })

  // Authentication results
  const authResults = getHeader(headers, 'authentication-results')
  const authentication = {
    spf:  authResults.match(/spf=([\w]+)/i)?.[1] ?? (getHeader(headers, 'received-spf').match(/^(\w+)/)?.[1] ?? 'none'),
    dkim: authResults.match(/dkim=([\w]+)/i)?.[1] ?? 'none',
    dmarc:authResults.match(/dmarc=([\w]+)/i)?.[1] ?? 'none',
  }

  if (authentication.spf === 'fail' || authentication.spf === 'softfail') {
    warnings.push(`SPF check failed: ${authentication.spf}`)
  }
  if (authentication.dkim === 'fail') {
    warnings.push('DKIM signature verification failed.')
  }

  // Body parsing (simplified — handle multipart/alternative and basic MIME)
  let body_text = ''
  let body_html = ''
  const attachments: EmailAttachment[] = []

  if (contentType.includes('multipart/')) {
    const boundary = contentType.match(/boundary="?([^";\s]+)"?/i)?.[1]
    if (boundary) {
      const parts = bodyRaw.split(new RegExp(`--${boundary.replace(/[-[\]{}()*+?.,\\^$|#\s]/g,'\\$&')}(?:--)?`))
      for (const part of parts.slice(1)) {
        if (part.startsWith('--')) continue
        const partSep = part.search(/\r?\n\r?\n/)
        if (partSep < 0) continue
        const partHeaders = splitHeaders(part.slice(0, partSep))
        const partBody = part.slice(partSep + 2).replace(/\r?\n$/, '')
        const partCT = getHeader(partHeaders, 'content-type')
        const partEnc = getHeader(partHeaders, 'content-transfer-encoding').toLowerCase()
        const partDisp = getHeader(partHeaders, 'content-disposition')

        let decoded = partBody
        if (partEnc === 'base64')           decoded = decodeBase64(partBody)
        else if (partEnc === 'quoted-printable') decoded = decodeQP(partBody)

        const fname = partDisp.match(/filename="?([^";\r\n]+)"?/i)?.[1] ??
                      partCT.match(/name="?([^";\r\n]+)"?/i)?.[1]

        if (fname) {
          attachments.push({
            filename: fname,
            content_type: partCT.split(';')[0].trim(),
            size: partBody.length,
          })
        } else if (partCT.includes('text/html')) {
          body_html = decoded.slice(0, 50000)
        } else if (!body_text && partCT.includes('text/plain')) {
          body_text = decoded.slice(0, 50000)
        }
      }
    }
  } else {
    let decoded = bodyRaw
    if (encoding === 'base64') decoded = decodeBase64(bodyRaw)
    else if (encoding === 'quoted-printable') decoded = decodeQP(bodyRaw)
    if (contentType.includes('text/html')) body_html = decoded.slice(0, 50000)
    else body_text = decoded.slice(0, 50000)
  }

  // Strip HTML to text if no text part
  if (!body_text && body_html) {
    body_text = body_html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ')
      .replace(/\s+/g, ' ').trim()
  }

  // Suspicious patterns
  const fromDomain = getHeader(headers, 'from').match(/@([a-zA-Z0-9.-]+)/)?.[1] ?? ''
  const replyToDomain = getHeader(headers, 'reply-to').match(/@([a-zA-Z0-9.-]+)/)?.[1] ?? ''
  if (fromDomain && replyToDomain && fromDomain !== replyToDomain) {
    warnings.push(`Reply-To domain (${replyToDomain}) differs from From domain (${fromDomain}) — possible phishing.`)
  }
  if (body_html && body_html.includes('href') && !body_html.includes(fromDomain)) {
    warnings.push('Links in email do not match sender domain — verify carefully.')
  }

  return {
    subject:      decodeWord(getHeader(headers, 'subject')),
    from:         decodeWord(getHeader(headers, 'from')),
    to:           parseAddressList(getHeader(headers, 'to')),
    cc:           parseAddressList(getHeader(headers, 'cc')),
    date:         getHeader(headers, 'date'),
    message_id:   getHeader(headers, 'message-id'),
    headers,
    received_chain,
    body_text,
    body_html: body_html.slice(0, 100000),
    attachments,
    authentication,
    warnings,
  }
}
