import fs from 'fs'

export interface ExtractedString {
  offset: number
  value: string
  encoding: 'ascii' | 'utf16le'
  length: number
}

export async function extractStrings(filePath: string, minLen = 4): Promise<ExtractedString[]> {
  const results: ExtractedString[] = []
  const stat = fs.statSync(filePath)
  let buf: Buffer

  // Read in chunks to handle large files
  const fd = fs.openSync(filePath, 'r')
  const chunkSize = Math.min(stat.size, 16 * 1024 * 1024) // max 16 MB
  buf = Buffer.allocUnsafe(chunkSize)
  const bytesRead = fs.readSync(fd, buf, 0, chunkSize, 0)
  fs.closeSync(fd)
  buf = buf.slice(0, bytesRead)

  // ASCII strings
  let start = -1
  for (let i = 0; i <= buf.length; i++) {
    const b = buf[i]
    if (b !== undefined && ((b >= 0x20 && b < 0x7F) || b === 0x09 || b === 0x0A || b === 0x0D)) {
      if (start === -1) start = i
    } else {
      if (start !== -1 && i - start >= minLen) {
        results.push({
          offset: start,
          value: buf.slice(start, i).toString('ascii'),
          encoding: 'ascii',
          length: i - start,
        })
      }
      start = -1
    }
  }

  // UTF-16LE strings
  start = -1
  for (let i = 0; i <= buf.length - 1; i += 2) {
    const lo = buf[i], hi = buf[i + 1]
    if (lo === undefined || hi === undefined) break
    if (hi === 0x00 && ((lo >= 0x20 && lo < 0x7F) || lo === 0x09 || lo === 0x0A || lo === 0x0D)) {
      if (start === -1) start = i
    } else {
      if (start !== -1) {
        const charCount = (i - start) / 2
        if (charCount >= minLen) {
          const val = buf.slice(start, i).toString('utf16le')
          if (!/[\x00-\x08\x0E-\x1F]/.test(val)) {
            results.push({ offset: start, value: val, encoding: 'utf16le', length: charCount })
          }
        }
        start = -1
      }
    }
  }

  // Sort by offset, deduplicate overlapping
  results.sort((a, b) => a.offset - b.offset)
  return results.slice(0, 50000) // cap at 50k strings
}
