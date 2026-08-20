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
    assert.equal(state.ledger.requirements.length, 2820)
    assert.ok(state.sourceRegistry.families.includes('CLO'))
    assert.ok(state.sourceRegistry.attachmentCount >= 1)
    assert.ok(state.sourceRegistry.sources.every((source) => source.sha256 && !source.filename && !source.textPath))
    assert.equal(store.ledgerSummary().total, 2820)
    await store.updateRequirement('0001', 'VERIFIED', { testEvidence: ['ledger.test.cjs'] })
    assert.equal(store.snapshot().ledger.requirements[0].status, 'VERIFIED')
    await assert.rejects(() => store.updateRequirement('0001', 'INVALID'), /Invalid requirement status/)
    await assert.rejects(() => store.commitEvidence([{ status: 'STAGED', hash: 'sha256:forged' }]), /valid SHA-256/)
    const contextState = await store.addContext({ type: 'EXTERNAL_RECORD', source: 'test', name: 'Context-only record' })
    assert.equal(contextState.context.at(-1).status, 'CONTEXT_ONLY')
    const ciceroState = await store.addContext({ type: 'CICERO_ORGANIZATION_PROFILE', name: 'Test organization', employees: 100, source: 'Test source note', assumptions: 'Test estimate assumptions', confidence: 0.7, roles: [{ name: 'Operations', percent: 100, note: 'Estimate' }] })
    assert.equal(ciceroState.organizationProfiles.at(-1).status, 'ESTIMATE')
    assert.equal(ciceroState.organizationProfiles.at(-1).assumptions, 'Test estimate assumptions')
    assert.equal((await store.search('Test organization'))[0].type, 'ORGANIZATIONS')
    console.log('CLO master ledger test passed')
  } finally {
    try { fs.rmSync(filePath, { force: true }) } catch {}
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
