const { parentPort } = require('node:worker_threads')
const crypto = require('node:crypto')
const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

parentPort.on('message', ({ bytes, extension }) => {
  const buffer = Buffer.from(bytes)
  const textExtensions = new Set(['.txt', '.md', '.csv', '.json', '.html', '.xml'])
  let extractedText = textExtensions.has(extension) ? buffer.toString('utf8') : null
  let extractionMethod = extractedText ? 'DIRECT' : 'NONE'
  let extractionConfidence = extractedText ? 1 : 0
  if (extension === '.pdf') {
    const extracted = spawnSync('pdftotext', ['-', '-'], { input: buffer, encoding: 'utf8' })
    extractedText = extracted.status === 0 && extracted.stdout.trim() ? extracted.stdout : null
    if (extractedText) { extractionMethod = 'PDF_TEXT'; extractionConfidence = 0.98 }
    if (!extractedText) {
      const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'clo-ocr-'))
      const sourcePath = path.join(directory, 'source.pdf')
      const prefix = path.join(directory, 'page')
      fs.writeFileSync(sourcePath, buffer)
      const rendered = spawnSync('pdftoppm', ['-png', '-r', '180', '-f', '1', '-l', '5', sourcePath, prefix], { encoding: 'utf8' })
      if (rendered.status === 0) {
        const pages = fs.readdirSync(directory).filter((file) => file.startsWith('page-') && file.endsWith('.png')).sort()
        const text = pages.map((page) => spawnSync('tesseract', [path.join(directory, page), 'stdout'], { encoding: 'utf8' })).filter((result) => result.status === 0).map((result) => result.stdout.trim()).filter(Boolean).join('\n\n')
        if (text) { extractedText = text; extractionMethod = 'OCR_TESSERACT'; extractionConfidence = 0.55 }
      }
      fs.rmSync(directory, { recursive: true, force: true })
    }
  }
  if (['.png', '.jpg', '.jpeg', '.tif', '.tiff', '.webp'].includes(extension)) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'clo-ocr-'))
    const imagePath = path.join(directory, `source${extension}`)
    fs.writeFileSync(imagePath, buffer)
    const result = spawnSync('tesseract', [imagePath, 'stdout'], { encoding: 'utf8' })
    if (result.status === 0 && result.stdout.trim()) { extractedText = result.stdout; extractionMethod = 'OCR_TESSERACT'; extractionConfidence = 0.55 }
    fs.rmSync(directory, { recursive: true, force: true })
  }
  parentPort.postMessage({ hash: crypto.createHash('sha256').update(buffer).digest('hex'), extractedText, extractionMethod, extractionConfidence })
})
