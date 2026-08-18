const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

const root = path.join(__dirname, '..')
const registryPath = path.join(root, 'docs', 'source-registry.json')
const ledgerPath = path.join(root, 'docs', 'MASTER-LEDGER.json')

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return fallback }
}

function sourceRegistry() {
  return readJson(registryPath, { version: 1, attachmentCount: 0, sources: [], families: [] })
}

function requirementLedger() {
  const stored = readJson(ledgerPath, null)
  if (stored?.requirements?.length) return stored
  return { version: 2, total: 1300, requirements: Array.from({ length: 1300 }, (_, index) => ({
    id: String(index + 1).padStart(4, '0'), description: index < 1050 ? `Legacy plan point ${String(index + 1).padStart(4, '0')}` : `1540 N. Vine machine extension point ${String(index + 1).padStart(4, '0')}`, sourceRefs: [], repeat: 'R1', status: 'UNREAD', sourceRefs: [], featureRefs: [], implementationEvidence: [], testEvidence: [], screenshotEvidence: [], updatedAt: null
  })) }
}

function makeLedgerState() {
  const registry = sourceRegistry()
  const ledger = requirementLedger()
  return { ...ledger, sourceRegistryVersion: registry.version, sourceCount: registry.attachmentCount || registry.sources.length, checksum: crypto.createHash('sha256').update(JSON.stringify(ledger)).digest('hex') }
}

module.exports = { sourceRegistry, requirementLedger, makeLedgerState }
