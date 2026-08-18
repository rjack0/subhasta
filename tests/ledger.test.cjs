const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { createStore } = require('../electron/store.cjs')

async function main() {
  const filePath = path.join(os.tmpdir(), `clo-ledger-${Date.now()}.json`)
  try {
    const store = await createStore(filePath)
    const state = store.snapshot()
    assert.equal(state.ledger.requirements.length, 1300)
    assert.ok(state.sourceRegistry.families.includes('CLO'))
    assert.ok(state.sourceRegistry.attachmentCount >= 1)
    assert.ok(state.sourceRegistry.sources.every((source) => source.sha256 && !source.filename && !source.textPath))
    assert.equal(store.ledgerSummary().total, 1300)
    await store.updateRequirement('0001', 'VERIFIED', { testEvidence: ['ledger.test.cjs'] })
    assert.equal(store.snapshot().ledger.requirements[0].status, 'VERIFIED')
    await assert.rejects(() => store.updateRequirement('0001', 'INVALID'), /Invalid requirement status/)
    await assert.rejects(() => store.commitEvidence([{ status: 'STAGED', hash: 'sha256:forged' }]), /valid SHA-256/)
    const contextState = await store.addContext({ type: 'EXTERNAL_RECORD', source: 'test', name: 'Context-only record' })
    assert.equal(contextState.context.at(-1).status, 'CONTEXT_ONLY')
    console.log('CLO master ledger test passed')
  } finally {
    try { fs.rmSync(filePath, { force: true }) } catch {}
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
