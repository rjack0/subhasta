const { parentPort } = require('node:worker_threads')
const crypto = require('node:crypto')
const { spawnSync } = require('node:child_process')

parentPort.on('message', ({ bytes, extension }) => {
  const buffer = Buffer.from(bytes)
  const textExtensions = new Set(['.txt', '.md', '.csv', '.json', '.html', '.xml'])
  let extractedText = textExtensions.has(extension) ? buffer.toString('utf8') : null
  if (extension === '.pdf') {
    const extracted = spawnSync('pdftotext', ['-', '-'], { input: buffer, encoding: 'utf8' })
    extractedText = extracted.status === 0 ? extracted.stdout : null
  }
  parentPort.postMessage({ hash: crypto.createHash('sha256').update(buffer).digest('hex'), extractedText })
})
