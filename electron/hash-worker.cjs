const { parentPort } = require('node:worker_threads')
const crypto = require('node:crypto')

parentPort.on('message', ({ bytes, extension }) => {
  const buffer = Buffer.from(bytes)
  const textExtensions = new Set(['.txt', '.md', '.csv', '.json', '.html', '.xml'])
  parentPort.postMessage({ hash: crypto.createHash('sha256').update(buffer).digest('hex'), extractedText: textExtensions.has(extension) ? buffer.toString('utf8') : null })
})
