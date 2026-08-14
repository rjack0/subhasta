const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { createStore } = require('../electron/store.cjs')

async function main() {
  const filePath = path.join(os.tmpdir(), `clo-performance-${Date.now()}.json`)
  try {
    const store = await createStore(filePath)
    await store.update({ evidence: Array.from({ length: 10000 }, (_, index) => ({ id: `ev-${index}`, name: `Evidence record ${index}`, status: 'VERIFIED', source: 'Benchmark fixture', hash: `sha256:${index}` })) })
    const start = performance.now()
    const results = await store.search('Evidence record 9999')
    const elapsed = performance.now() - start
    assert.equal(results[0].id, 'ev-9999')
    assert.ok(elapsed < 100, `search feedback took ${elapsed.toFixed(1)}ms`)
    console.log(`CLO search benchmark passed: ${elapsed.toFixed(1)}ms / 10,000 objects`)
  } finally {
    await fs.rm(filePath, { force: true })
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
