import fs from 'fs'
import crypto from 'crypto'

export interface HashResult {
  md5:    string
  sha1:   string
  sha256: string
  sha512: string
  size:   number
}

const CHUNK = 4 * 1024 * 1024 // 4 MB

export async function calculateHashes(filePath: string): Promise<HashResult> {
  return new Promise((resolve, reject) => {
    const stat = fs.statSync(filePath)
    const md5    = crypto.createHash('md5')
    const sha1   = crypto.createHash('sha1')
    const sha256 = crypto.createHash('sha256')
    const sha512 = crypto.createHash('sha512')

    const stream = fs.createReadStream(filePath, { highWaterMark: CHUNK })
    stream.on('data', (chunk: string | Buffer) => {
      md5.update(chunk)
      sha1.update(chunk)
      sha256.update(chunk)
      sha512.update(chunk)
    })
    stream.on('end', () => {
      resolve({
        md5:    md5.digest('hex'),
        sha1:   sha1.digest('hex'),
        sha256: sha256.digest('hex'),
        sha512: sha512.digest('hex'),
        size:   stat.size,
      })
    })
    stream.on('error', reject)
  })
}
