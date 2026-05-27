import fs from 'fs'

const CHUNK = 1024 * 1024 // 1 MB sample

export function calculateEntropy(filePath: string): number {
  const stat = fs.statSync(filePath)
  const sampleSize = Math.min(stat.size, CHUNK)
  const buf = Buffer.allocUnsafe(sampleSize)
  const fd = fs.openSync(filePath, 'r')
  fs.readSync(fd, buf, 0, sampleSize, 0)
  fs.closeSync(fd)
  return bufferEntropy(buf)
}

export function bufferEntropy(buf: Buffer): number {
  if (buf.length === 0) return 0
  const freq = new Float64Array(256)
  for (const b of buf) freq[b]++
  let entropy = 0
  const len = buf.length
  for (const f of freq) {
    if (f === 0) continue
    const p = f / len
    entropy -= p * Math.log2(p)
  }
  return Math.round(entropy * 10000) / 10000
}
